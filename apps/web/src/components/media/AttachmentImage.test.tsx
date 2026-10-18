// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import { AttachmentImage } from "./AttachmentImage";
import { prepareImageForAttachment } from "../../lib/imageCompression";

vi.mock("../../lib/imageCompression", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/imageCompression")>()),
  prepareImageForAttachment: vi.fn(),
}));

let renderer: Root;
let container: HTMLDivElement;
const image = () => container.querySelector("img")!;
const fetchImage = vi.fn();
const revokeUrl = vi.fn();
const decodeError = new Event("error");
const jpeg = new File(["jpeg"], "photo.jpg", { type: "image/jpeg" });

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.body.appendChild(document.createElement("div"));
  renderer = createRoot(container);
  vi.stubGlobal("fetch", fetchImage);
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:jpeg");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(revokeUrl);
  fetchImage.mockResolvedValue(new Response(new Blob(["heic"])));
  vi.mocked(prepareImageForAttachment).mockResolvedValue({
    ok: true,
    file: jpeg,
    recompressed: true,
  });
});

afterEach(async () => {
  await act(() => renderer?.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it.each([
  { name: "photo.HEIC", mimeType: undefined },
  { name: "photo", mimeType: "image/heif" },
])(
  "converts $name after native decoding fails and releases its preview",
  async ({ name, mimeType }) => {
    await act(() => {
      renderer.render(
        <AttachmentImage src="https://environment.test/photo" name={name} mimeType={mimeType} />,
      );
    });
    expect(fetchImage).not.toHaveBeenCalled();
    await act(() => image().dispatchEvent(decodeError));
    expect(image().getAttribute("src")).toBe("blob:jpeg");
    expect(prepareImageForAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ name, type: "image/heic" }),
      50 * 1024 * 1024,
    );
    await act(() => renderer.unmount());
    expect(revokeUrl).toHaveBeenCalledWith("blob:jpeg");
  },
);

it("leaves PNG errors to the caller without fetching or converting", async () => {
  const onError = vi.fn();
  await act(() => {
    renderer.render(<AttachmentImage src="blob:png" name="photo.png" onError={onError} />);
  });
  await act(() => image().dispatchEvent(decodeError));
  expect(onError).toHaveBeenCalledWith(expect.objectContaining({ nativeEvent: decodeError }));
  expect(fetchImage).not.toHaveBeenCalled();
});

it("reports failed HEIC conversion through the existing error handler", async () => {
  const onError = vi.fn();
  vi.mocked(prepareImageForAttachment).mockResolvedValue({ ok: false, reason: "unreadable" });
  await act(() => {
    renderer.render(<AttachmentImage src="blob:heic" name="photo.heif" onError={onError} />);
  });
  await act(() => image().dispatchEvent(decodeError));
  expect(onError).toHaveBeenCalledWith(expect.objectContaining({ nativeEvent: decodeError }));
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});

it("discards an old decode when navigating to a different source", async () => {
  let finishDecode!: (result: Awaited<ReturnType<typeof prepareImageForAttachment>>) => void;
  vi.mocked(prepareImageForAttachment).mockReturnValue(
    new Promise((resolve) => {
      finishDecode = resolve;
    }),
  );
  await act(() => {
    renderer.render(<AttachmentImage src="blob:first" name="photo.heic" />);
  });
  await act(() => image().dispatchEvent(decodeError));
  await act(() => renderer.render(<AttachmentImage src="blob:second" name="photo.heic" />));
  await act(() => finishDecode({ ok: true, file: jpeg, recompressed: true }));
  expect(image().getAttribute("src")).toBe("blob:second");
  expect(URL.createObjectURL).not.toHaveBeenCalled();
  expect(fetchImage.mock.calls[0]?.[1].signal.aborted).toBe(true);
});
