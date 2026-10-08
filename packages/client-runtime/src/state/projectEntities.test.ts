import {
  EnvironmentId,
  type ServerConfig,
  type OrchestrationV2ShellSnapshot,
} from "@t3tools/contracts";
import { expect, it } from "vite-plus/test";
import { Atom, AtomRegistry } from "effect/reactivity";

import type { EnvironmentCatalogState } from "./connections.ts";
import { createEnvironmentProjectAtoms } from "./projectEntities.ts";
import { v2Project } from "./orchestrationV2TestFixtures.ts";

it("reclassifies an unchanged project when its environment advertises the scratch root", () => {
  const environmentId = EnvironmentId.make("mac");
  const source = { ...v2Project, title: "No project", workspaceRoot: "/Users/eric/.t3/scratch" };
  const snapshot = Atom.make<OrchestrationV2ShellSnapshot | null>({
    schemaVersion: 1,
    snapshotSequence: 1,
    projects: [source],
    threads: [],
    archivedThreads: [],
  });
  const config = Atom.make<Pick<ServerConfig, "scratchWorkspaceRoot"> | null>(null);
  const atoms = createEnvironmentProjectAtoms({
    catalogValueAtom: Atom.make<EnvironmentCatalogState>({ isReady: true, entries: new Map() }),
    snapshotAtom: () => snapshot,
    serverConfigValueAtom: () => config,
  });
  const registry = AtomRegistry.make();
  const projectAtom = atoms.projectAtom({ environmentId, projectId: source.id });
  const unmount = registry.mount(projectAtom);
  try {
    const initial = registry.get(projectAtom);
    expect(initial?.isScratchProject).toBe(false);
    registry.set(config, { scratchWorkspaceRoot: "/Users/eric/.t3/scratch/" });
    const scratch = registry.get(projectAtom);
    expect(scratch?.isScratchProject).toBe(true);
    expect(scratch?.id).toBe(source.id);
    expect(scratch?.environmentId).toBe(environmentId);
    expect(scratch).not.toBe(initial);
    registry.set(config, { scratchWorkspaceRoot: "/another/scratch" });
    expect(registry.get(projectAtom)?.isScratchProject).toBe(false);
    registry.set(config, { scratchWorkspaceRoot: "/another/scratch/" });
    const unchanged = registry.get(projectAtom);
    registry.set(config, {});
    expect(registry.get(projectAtom)).toBe(unchanged);
  } finally {
    unmount();
    registry.dispose();
  }
});
