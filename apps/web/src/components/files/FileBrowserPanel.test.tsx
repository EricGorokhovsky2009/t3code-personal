// @vitest-environment jsdom


import type { FileTree as FileTreeModel } from "@pierre/trees";
import { EnvironmentId, type ProjectEntry } from "@t3tools/contracts";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

let treeModel: FileTreeModel | undefined;
vi.mock("@pierre/trees/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@pierre/trees/react")>()),
  FileTree: ({ model }: { model: FileTreeModel }) => { treeModel = model; return <div data-testid="file-tree" />; },
}));
import FileBrowserPanel from "./FileBrowserPanel";

const files = vi.hoisted(() => ({
  directoryEntries: [] as ProjectEntry[],
  searchEntries: [] as ProjectEntry[],
  searchPending: false,
  searchError: null as string | null,
  load: vi.fn(async () => {}),
  refresh: vi.fn(),
}));

vi.mock("./useDirectoryEntries", () => ({
  useDirectoryEntries: () => ({
    entries: files.directoryEntries,
    load: files.load,
    refresh: files.refresh,
    ready: true,
    error: null,
    isPending: false,
  }),
}));
vi.mock("~/state/queries", () => ({
  useProjectPathSearch: () => ({
    entries: files.searchEntries,
    isPending: files.searchPending,
    error: files.searchError,
    truncated: false,
    refresh: files.refresh,
  }),
}));
vi.mock("~/hooks/useTheme", () => ({ useTheme: () => ({ resolvedTheme: "dark" }) }));
vi.mock("~/hooks/useWorkspaceMutationRefresh", () => ({ useWorkspaceMutationRefresh: vi.fn() }));
vi.mock("~/composerHandleContext", () => ({ useComposerHandleContext: () => null }));
vi.mock("~/fileContextMenu", () => ({ useFileContextMenu: () => ({}) }));
vi.mock("~/localApi", () => ({ readLocalApi: () => undefined }));
vi.mock("~/components/ui/toast", () => ({ toastManager: { add: vi.fn() } }));
vi.mock("~/components/MorphIcon", () => ({ MorphIcon: () => null }));
vi.mock("~/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: ReactNode }) => children,
  TooltipTrigger: ({ render }: { render: ReactNode }) => render,
  TooltipPopup: () => null,
}));

describe("Files panel search", () => {
  let renderer: Root | undefined;
  let container: HTMLDivElement;
  const props = {
    environmentId: EnvironmentId.make("test-environment"),
    cwd: "/workspace",
    projectName: "Test project",
    selectedPath: null,
    selectedPathRevealId: 0,
    onOpenFile: vi.fn(),
    workspaceMutationId: null,
  };

  async function render() {
    await act(async () => {
      renderer ??= createRoot(container);
      treeModel = undefined;
      renderer.render(<FileBrowserPanel {...props} />);
    });
  }

  async function search(value: string) {
    await act(async () => {
      const input = container.querySelector("input")!;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  function visiblePaths() {
    if (!container.querySelector('[data-testid="file-tree"]')) return [];
    return treeModel?.getVisibleRows(0, treeModel.getVisibleCount()).map((row) => row.path) ?? [];
  }

  function hasMessage(message: string) {
    return container.textContent?.includes(message) ?? false;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.body.appendChild(document.createElement("div"));
    files.directoryEntries = [
      { path: "src", kind: "directory" },
      { path: "src/app.ts", kind: "file" },
      { path: "package.json", kind: "file" },
    ];
    files.searchEntries = [];
    files.searchPending = false;
    files.searchError = null;
  });

  afterEach(async () => {
    await act(async () => renderer?.unmount());
    renderer = undefined;
    container.remove();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows no matching files instead of the full tree when a filename is absent", async () => {
    await render();
    expect(visiblePaths()).toEqual(["src/", "package.json"]);

    await search(".env.local");
    expect(visiblePaths()).toEqual([]);
    expect(hasMessage("No matching files.")).toBe(true);

    await search("package");
    expect(visiblePaths()).toEqual(["package.json"]);
    expect(hasMessage("No matching files.")).toBe(false);

    await search("");
    expect(visiblePaths()).toEqual(["src/", "package.json"]);
  });

  it("still finds ignored files already loaded from a directory", async () => {
    files.directoryEntries.push({ path: ".env.local", kind: "file", ignored: true });
    await render();
    await search(".env.local");
    expect(visiblePaths()).toEqual([".env.local"]);
    expect(hasMessage("No matching files.")).toBe(false);
  });

  it("waits for remote matches without showing unrelated files or a premature empty result", async () => {
    await render();
    files.searchPending = true;
    await search("settings.ts");
    expect(visiblePaths()).toEqual([]);
    expect(hasMessage("Loading files…")).toBe(true);
    expect(hasMessage("No matching files.")).toBe(false);

    files.searchEntries = [{ path: "config/settings.ts", kind: "file" }];
    files.searchPending = false;
    await render();
    expect(visiblePaths()).toEqual(["config/", "config/settings.ts"]);
    expect(hasMessage("No matching files.")).toBe(false);
  });

  it("restores the tree on Escape after an unsuccessful search", async () => {
    await render();
    await search("missing-file");
    expect(visiblePaths()).toEqual([]);

    await act(async () => {
      container.querySelector("input")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(visiblePaths()).toEqual(["src/", "package.json"]);
    expect(hasMessage("No matching files.")).toBe(false);
  });

  it("does not report an empty result when the search failed", async () => {
    await render();
    files.searchError = "Workspace search failed.";
    await search("missing-file");
    expect(visiblePaths()).toEqual([]);
    expect(hasMessage("No matching files.")).toBe(false);
    expect(container.textContent).toContain("Workspace search failed.");
  });
});
