# Remote access

Connect a phone, browser, or another desktop app to T3 Code running on a different
machine. That machine must stay running and reachable while you work.

## T3 Connect

T3 Connect makes an environment available to your other devices without setting
up router forwarding. In the desktop app on the host, open **Settings →
Connections**, sign in, and enable **T3 Connect** for that environment.

For a command-line host, run:

```bash
t3 connect
```

Follow the sign-in instructions. Setup offers a
[background service](./background-service.md); if you decline it, start the
server with `t3 serve`. Saving your sign-in alone does not make the machine
reachable.

On your other device, sign in to the same T3 Connect account and choose the
environment. Over SSH, the CLI prints a browser link and a short code. Open the
link on any device, confirm the code matches, and approve. The CLI continues on
its own, so you do not need to forward an OAuth callback port.

T3 Connect renews access credentials when needed without disconnecting a healthy
connection. Pull request diffs and provider settings keep working after the
previous credential expires. A failed renewal affects that request; it does not
disconnect an otherwise healthy conversation.

## Pair over a LAN or private network

Use direct pairing when the other device can reach the host's network address.

On a desktop host, open **Settings → Connections**, enable **Network access**,
then create a pairing link using an address the other device can reach. Changing
network access restarts the desktop app. You can turn it off in the same place.

For a command-line host, replace `<private-ip>` with the host's LAN or tailnet
address:

```bash
t3 serve --host <private-ip>
```

If a server is already running, generate a fresh link without restarting it:

```bash
t3 pair
```

Scan the QR code on your phone or paste the pairing URL into **Add environment**
in the receiving app. Connection settings are under **Settings → Connections**
on web and desktop and **Settings → Environments** on mobile. A loopback address
such as `127.0.0.1` reaches only the device opening the link.

Pairing authorizes that device for future connections. Use a fresh one-time link
for each new device; you do not need the original token to reconnect. Links
created in Settings can only be copied from the client that created them while
its Connections page stays open. If you leave or reload that page, create
another link to share.

### Reach one machine several ways

A machine can have more than one route: LAN, Tailscale, another VPN, a public
URL, SSH, or T3 Connect. Tailscale shares its `100.64.0.0/10` address range with
other VPNs such as Cloudflare WARP, so an address in that range shows as VPN
unless the machine confirms it is on Tailscale. To add a route, choose **Add
route** in the machine's route list, or next to it in the T3 Connect list.
Pairing the same machine again over another address also adds a route instead
of a second machine. A new route is placed by speed, in that order, and you can
reorder routes at any time.

While connected through T3 Connect or a paired address, T3 Code also learns the
machine's current LAN and Tailscale addresses and adds them as routes, so
pairing once through T3 Connect is enough to use the LAN at home. When the
machine's LAN address changes, for example after it joins another Wi-Fi network,
the learned route follows it. The machine must allow network access for its LAN
address to be learned. You can reorder a learned route, but not remove it; it
goes away with the route it was learned through, or when the machine stops
reporting that address.

T3 Code connects over the first route that answers. Away from home, a LAN
address that does not answer is checked briefly and skipped. It is only tried
again, after the other routes, if none of them connect. While connected over a
later route, T3 Code checks the earlier ones when your network changes, when you
return to the app, and every minute, and moves back as soon as one works.

On web and desktop, select the route count under the machine's name in
**Settings → Connections** to see its routes. Drag a route to change the order,
or remove it. On mobile, open the machine under **Settings → Environments** and
choose **Edit**. Signing out of T3 Connect removes only that route; a machine
you can still reach another way stays saved.

Open **Permissions** next to **Routes** in web or desktop, or **Your permissions**
in the mobile route details, to see what your current connection can do on that
environment. For a remote environment, this is in its route details. Permissions
shown there apply only to the route marked **In use**; other routes are not
checked. Direct pairing and T3 Connect have separate sessions and may grant
different permissions.

### Balance new threads across machines

Auto balance is off by default. On web and desktop, enable it in
**Settings → Connections → Load balancing** to automatically choose a machine for
new threads in projects grouped across connected environments. The section
appears once two or more machines are switched on.
Each machine starts at **Normal**. Choose **Prefer** to favor it when it has CPU and
memory available, **Less often** to reduce its share, or **Manual only** to exclude
it from automatic selection. These are preferences, not fixed traffic percentages.
Preferences are saved separately in each client.

The composer checks eligible machines when choosing a draft's environment, then keeps
that choice stable. Choose **Auto balance** again to check current resources, or choose
a specific machine to override it. Choosing a branch or worktree also keeps the draft
on that machine. Existing threads stay where they started. If resource checks are
unavailable or all eligible machines are full, choose a machine manually to continue.
Mobile keeps its manual environment selection.

### Tailscale HTTPS

Join both devices to the same tailnet. In the desktop app, enable **Tailscale
HTTPS** in **Settings → Connections**. Turn it off there to remove that route.

To start a command-line server with Tailscale HTTPS:

```bash
t3 serve --tailscale-serve
```

For an already-running server:

```bash
t3 pair --tailscale
```

The pairing link uses an address such as `https://machine.tailnet.ts.net/`.
The mapping created by `pair --tailscale` persists across restarts. Remove its
default-port mapping with:

```bash
tailscale serve --https=443 off
```

If that port is already in use, choose another with
`--tailscale-serve-port`. See `t3 pair --help` for other pairing options.

### Hosted web app

[app.t3.codes](https://app.t3.codes) needs an HTTPS endpoint. It connects directly
to your server; a hosted pairing link does not make an unreachable backend
reachable or convert HTTP to HTTPS.

For a plain HTTP LAN endpoint, use the direct pairing URL in a browser that can
open it, or pair from the desktop app. On mobile, an IP address entered without a
scheme uses HTTP, so include `https://` when your server uses HTTPS.

## Desktop-managed SSH

In the desktop app, open **Settings → Connections → Add environment**, choose
**SSH**, and enter a host or SSH alias such as `user@example.com`. T3 Code starts
or reuses a server there and opens the port forward for you. Projects, provider
credentials, and agent work stay on the remote machine.

The remote host must be Linux or an Apple Silicon Mac with `curl` or `wget`,
`tar`, `sha256sum` or `shasum`, and [provider setup](./install.md#providers).
The first launch downloads T3 Code's server to `~/.t3/runtime` on the host, so
it takes longer than later ones.
Provider CLIs must be on the `PATH` of a non-interactive login shell there;
check with:

```bash
ssh user@example.com 'sh -lc "command -v claude codex"'
```

If SSH reconnecting fails after an app update, retry the launch once. Removing
the connection stops a server that T3 Code launched; a server that was already
running is left alone.

For Antigravity's Google callback on a remote host, see
[remote sign-in](./providers-antigravity.md#sign-in-from-a-remote-device).

## Browser on a remote environment

Browser tabs belong to the environment, so you and your agents see the same
tabs from any device. The desktop app shows its own environment's tabs
directly. Every other device, and the desktop app for other environments,
streams them from the host. Agents keep using them while no device is
connected, and `localhost` addresses reach servers on the host.

The first tab downloads a headless Chrome, about 120 MB, into the T3 home. It
is the same browser [HTML renders](html-renders.md) use, so a host downloads it
only once. Some Linux hosts need [setup](#browser-host-setup) before it can
start.

Agent tabs have separate storage and share a Chromium process. Take control before
typing into an agent's tab, then release control when you want the agent to
continue. Read-only connections can watch without changing the page.

While you have control, the tab works with your device: text the page copies or
cuts goes to your clipboard, a file picker on the page opens your device's
picker, and a finished download is offered for you to save. Popups such as
sign-in windows open as their own tabs. Downloads stay on the host until the
tab closes. Audio does not play on your device.

On a phone, tap the floating preview's corner dot to show its controls, then
**Pop into separate window** to keep watching in picture-in-picture over other
apps.

### Browser host setup

macOS, Windows, and Linux desktops run the browser as is. Some Linux hosts need
one-time setup: Ubuntu 23.10 and later block the sandbox the browser runs in,
and minimal images and containers lack libraries it loads. When that happens,
the server says so at startup, and browser tabs and HTML previews show the
command to run on the host:

```sh
sudo t3 browser setup
```

The server shows the exact line for how you started it, such as
`sudo npx t3 browser setup`, and keeps your `PATH` when Node is installed only
for your user. Where `t3` is not on your `PATH`, such as with only the
desktop app installed, it names the full path of the app's own `t3` instead. It allows Chrome's sandbox with an AppArmor profile and installs
any missing libraries with apt. It is safe to run again. Without `sudo`, it
only reports what it would change.

The browser always runs in Chrome's sandbox. Where you cannot change the host,
set `T3CODE_SERVER_BROWSER_SANDBOX=0` for the environment to run without it.

## Connect an outside agent

Claude Code, Codex, ChatGPT and other agents T3 Code did not start can drive
threads on an environment through its MCP server. See
[outside agents](./outside-agents.md) for setup.

## Manage or revoke access

On the host, **Settings → Connections** lets authorized administrators create
pairing links and revoke client sessions. Revoking an unused link prevents new
pairings; revoke a device's session to remove its existing access. Command-line
management is available through `t3 auth --help`.

A session with an open connection stays listed after its access credential
expires.

To choose a token's permissions, pass `--scope` once for each scope you want:

```sh
npx t3 pair --scope orchestration:read --scope relay:read
```

The selected scopes replace the default permissions. The same option works with
`npx t3 auth pairing create` and `npx t3 auth session issue`; each command's
`--help` lists the available scopes. Without `--scope`, pairing tokens retain
standard client permissions and issued bearer sessions retain administrative
permissions.

To change an existing client's permissions, create a fresh pairing link with the
scopes it needs. In a browser opened directly on the environment, open that link
to replace the browser's current grant. For mobile or a saved remote environment
in web or desktop, use **Add Environment** with the fresh link or code; pairing
the same environment replaces its saved grant. Reconnecting alone does not change
permissions.

Grouping checkouts does not combine their permissions. Shared project settings
require `orchestration:operate` on every member environment; actions on one
checkout use that checkout's permissions.

`source-control:write` covers direct Git and pull request changes made from the
client: pushing, switching or creating branches, cloning, and removing
worktrees. It does not restrict what a task does. Starting a task in a new
worktree still creates that branch and worktree with `orchestration:operate`,
and the agent it runs can use Git however the environment allows.

Settings changes, provider management, and environment maintenance can be granted
separately from access administration. New standard pairings include these
permissions. Existing clients can stay connected after an update, but newly separated
features may require pairing again with the permissions they need. Older clients
may show controls that the server denies. Create a fresh pairing link to change
a client's permissions.

`filesystem:read` allows browsing host files, opening workspace files, and viewing
local changes. Add `filesystem:write` to allow editing files or saving plans to
the workspace. These scopes control direct file access from the client.

To remove an environment from T3 Connect, open your account menu's **T3 Connect**
page, or **Settings → T3 Connect** on mobile, and choose **Deregister**. This
revokes its cloud access and frees its host space even when the environment is
offline or has been wiped. Removing an environment from a device's connection
settings only forgets it on that device; it stays registered to your account.

When idle tunnel cleanup is enabled, T3 Connect removes a linked environment's
tunnel after it stays offline for several minutes. The environment stays linked
and keeps the same address. When the host starts again or wakes, T3 Connect
creates a replacement tunnel on its own. You do not need to pair again. Cleanup
usually runs five to ten minutes after the tunnel goes down.

T3 Connect also removes the tunnel of an environment running an older version of
T3 Code once it has been offline for seven days. That environment shows a message
asking you to update. Start T3 Code on that computer and update it to the latest
version; it reconnects at the same address without pairing again.

On a command-line host, `t3 connect unlink` disables exposure while retaining
your logi…54477 tokens truncated… /**
   * The mirror of {@link ServerProviderSkill.userInvocationOnly}: Claude Code's
   * `user-invocable: false` keeps the skill out of its own slash commands, so
   * only the agent can start it. Composers must not offer it under `/`.
   */
  userInvocable: Schema.optional(Schema.Boolean),
});
export type ServerProviderSkill = typeof ServerProviderSkill.Type;

export const ServerProviderWorkspaceSnapshot = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  checkedAt: IsoDateTime,
  slashCommands: Schema.Array(ServerProviderSlashCommand),
  /** Skills are available, but command discovery still needs a retry. */
  slashCommandsPending: Schema.optional(Schema.Boolean),
  skills: Schema.Array(ServerProviderSkill),
});
export type ServerProviderWorkspaceSnapshot = typeof ServerProviderWorkspaceSnapshot.Type;

/**
 * How long a workspace's skill and command scan stays current. Nothing watches
 * skill directories, so a composer opened after this rescans on use, and the
 * server answers repeat requests inside the window from its cache.
 */
export const PROVIDER_WORKSPACE_SNAPSHOT_TTL_MS = 5 * 60_000;

export function isProviderWorkspaceSnapshotCurrent(
  snapshot: Pick<ServerProviderWorkspaceSnapshot, "checkedAt">,
  nowMs: number,
): boolean {
  return nowMs - Date.parse(snapshot.checkedAt) < PROVIDER_WORKSPACE_SNAPSHOT_TTL_MS;
}

/**
 * Availability of a configured provider instance from the runtime's POV.
 *
 *  - `available` — the build ships this driver and an instance is wired
 *    up. Default for legacy snapshots produced from the closed
 *    `ServerSettings.providers` map.
 *  - `unavailable` — the user's `ServerSettings.providerInstances` (or a
 *    persisted thread / session binding) references a driver this build
 *    doesn't ship. Common after rolling back from a fork or PR branch
 *    that introduced a new driver. The snapshot is preserved so the UI
 *    can render "missing driver" affordances and so the data round-trips
 *    when the user moves back to the fork.
 *
 * Snapshots with `availability: "unavailable"` MUST set
 * `installed: false` and `enabled: false`; the runtime refuses turn
 * starts against them with a structured error.
 */
export const ServerProviderAvailability = Schema.Literals(["available", "unavailable"]);
export type ServerProviderAvailability = typeof ServerProviderAvailability.Type;

export const ServerProviderContinuation = Schema.Struct({
  groupKey: TrimmedNonEmptyString,
});
export type ServerProviderContinuation = typeof ServerProviderContinuation.Type;

export const ServerProviderCompatibilityStatus = Schema.Literals([
  "unknown",
  "supported",
  "graceful",
  "unsupported",
  "broken",
]);
export const ServerProviderCompatibilityAdvisory = Schema.Struct({
  status: ServerProviderCompatibilityStatus,
  latestVersionStatus: Schema.optionalKey(ServerProviderCompatibilityStatus),
  message: Schema.NullOr(TrimmedNonEmptyString),
  recommendedVersion: Schema.NullOr(TrimmedNonEmptyString),
  recommendedRange: Schema.NullOr(TrimmedNonEmptyString),
});
export type ServerProviderCompatibilityAdvisory = typeof ServerProviderCompatibilityAdvisory.Type;

export const ServerProviderVersionAdvisoryStatus = Schema.Literals([
  "unknown",
  "current",
  "behind_latest",
]);
export type ServerProviderVersionAdvisoryStatus = typeof ServerProviderVersionAdvisoryStatus.Type;

export const ServerProviderVersionAdvisory = Schema.Struct({
  status: ServerProviderVersionAdvisoryStatus,
  currentVersion: Schema.NullOr(TrimmedNonEmptyString),
  latestVersion: Schema.NullOr(TrimmedNonEmptyString),
  updateCommand: Schema.NullOr(TrimmedNonEmptyString),
  canUpdate: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
  canInstallVersion: Schema.optionalKey(Schema.Boolean),
  checkedAt: Schema.NullOr(IsoDateTime),
  message: Schema.NullOr(TrimmedNonEmptyString),
});
export type ServerProviderVersionAdvisory = typeof ServerProviderVersionAdvisory.Type;

export const ServerProviderUpdateStatus = Schema.Literals([
  "idle",
  "queued",
  "running",
  "succeeded",
  "failed",
  "unchanged",
]);
export type ServerProviderUpdateStatus = typeof ServerProviderUpdateStatus.Type;

export const ServerProviderUpdateState = Schema.Struct({
  status: ServerProviderUpdateStatus,
  startedAt: Schema.NullOr(IsoDateTime),
  finishedAt: Schema.NullOr(IsoDateTime),
  message: Schema.NullOr(TrimmedNonEmptyString),
  output: Schema.NullOr(Schema.String.check(Schema.isMaxLength(10_000))),
});
export type ServerProviderUpdateState = typeof ServerProviderUpdateState.Type;

export const ServerProvider = Schema.Struct({
  // Routing key for the configured instance this snapshot represents. This
  // is the only stable identity consumers may use for provider routing.
  instanceId: ProviderInstanceId,
  // Open driver kind slug that selects the implementation handling this
  // instance. It is metadata/capability context, not a routing key.
  driver: ProviderDriverKind,
  displayName: Schema.optional(TrimmedNonEmptyString),
  accentColor: Schema.optional(TrimmedNonEmptyString),
  // Optional visual identity supplied by the owning provider driver. Clients
  // must still validate remote URLs against that driver's trusted origin.
  iconUrl: Schema.optional(TrimmedNonEmptyString.check(Schema.isMaxLength(2_048))),
  badgeLabel: Schema.optional(TrimmedNonEmptyString),
  continuation: Schema.optional(ServerProviderContinuation),
  showInteractionModeToggle: Schema.optional(Schema.Boolean),
  // The driver streams context window usage, so a started thread will have a
  // meter once its activities load. Clients reserve the meter's space on it.
  reportsContextWindow: Schema.optional(Schema.Boolean),
  supportedRuntimeModes: Schema.optional(ForwardCompatibleArray(RuntimeMode)),
  requiresNewThreadForModelChange: Schema.optional(Schema.Boolean),
  supportsConversationRollback: Schema.optional(Schema.Boolean),
  supportsTextGeneration: Schema.optional(Schema.Boolean),
  setup: Schema.optional(
    Schema.Struct({
      canAuthenticate: Schema.Boolean,
      canInstall: Schema.Boolean,
      documentationUrl: Schema.optionalKey(TrimmedNonEmptyString.check(Schema.isMaxLength(2_048))),
    }),
  ),
  nativeSessions: Schema.optional(
    Schema.Struct({
      canList: Schema.Boolean,
      canLoad: Schema.Boolean,
      canResume: Schema.Boolean,
      canDelete: Schema.optional(Schema.Boolean),
    }),
  ),
  configurableProviders: Schema.optional(Schema.Boolean),
  runtimePaths: Schema.optionalKey(
    Schema.Struct({
      homePath: TrimmedNonEmptyString,
      shadowHomePath: Schema.NullOr(TrimmedNonEmptyString),
    }),
  ),
  enabled: Schema.Boolean,
  installed: Schema.Boolean,
  version: Schema.NullOr(TrimmedNonEmptyString),
  status: ServerProviderState,
  auth: ServerProviderAuth,
  checkedAt: IsoDateTime,
  message: Schema.optional(TrimmedNonEmptyString),
  // Optional for back-compat: every legacy producer omits this field and
  // an absent value is interpreted as `"available"` by consumers (see
  // `isProviderAvailable`). New `ProviderInstanceRegistry` outputs set it
  // explicitly so the UI can render unavailable shadows from
  // `ServerSettings.providerInstances`.
  availability: Schema.optional(ServerProviderAvailability),
  // Human-readable reason populated when `availability === "unavailable"`.
  // Surfaces in the UI alongside the missing-driver affordance.
  unavailableReason: Schema.optional(TrimmedNonEmptyString),
  models: Schema.Array(ServerProviderModel),
  // Kept apart from `models` so clients that predate it never offer them.
  updateRequiredModels: Schema.optionalKey(Schema.Array(ServerProviderUpdateRequiredModel)),
  slashCommands: Schema.Array(ServerProviderSlashCommand).pipe(
    Schema.withDecodingDefault(Effect.succeed([])),
  ),
  skills: Schema.Array(ServerProviderSkill).pipe(Schema.withDecodingDefault(Effect.succeed([]))),
  workspaceSnapshots: Schema.optionalKey(Schema.Array(ServerProviderWorkspaceSnapshot)),
  // Absent when the driver has no notion of subscription usage.
  usageLimits: Schema.optional(ServerProviderUsageLimits),
  versionAdvisory: Schema.optionalKey(ServerProviderVersionAdvisory),
  compatibilityAdvisory: Schema.optionalKey(ServerProviderCompatibilityAdvisory),
  updateState: Schema.optionalKey(ServerProviderUpdateState),
});
export type ServerProvider = typeof ServerProvider.Type;

// Provider status kinds grow over time (ServerProviderState,
// ServerProviderAuthStatus, ServerProviderVersionAdvisoryStatus,
// ServerProviderUpdateStatus); an older client must not fail the whole config
// decode over one provider it cannot render.
export const ServerProviders = ForwardCompatibleArray(ServerProvider);
export type ServerProviders = typeof ServerProviders.Type;

/**
 * Treat the optional `availability` as "available" when absent. This is
 * the rule legacy producers (which omit the field) and new producers
 * (which set it explicitly) agree on so consumers never have to thread
 * `?? "available"` defaults through their code paths.
 */
export const isProviderAvailable = (snapshot: ServerProvider): boolean =>
  snapshot.availability !== "unavailable";

/**
 * Treat an absent `supportsTextGeneration` as supported so legacy
 * producers, which all support application text generation, keep working
 * without resending the field.
 */
export const isProviderTextGenerationCapable = (snapshot: ServerProvider): boolean =>
  snapshot.supportsTextGeneration !== false;

export const ServerObservability = Schema.Struct({
  logsDirectoryPath: TrimmedNonEmptyString,
  localTracingEnabled: Schema.Boolean,
  otlpTracesUrl: Schema.optional(TrimmedNonEmptyString),
  otlpTracesEnabled: Schema.Boolean,
  otlpMetricsUrl: Schema.optional(TrimmedNonEmptyString),
  otlpMetricsEnabled: Schema.Boolean,
  otlpLogsUrl: Schema.optional(TrimmedNonEmptyString),
  // Absent on servers from before the log signal shipped, so a newer client
  // reads those as having no log export rather than rejecting the whole config.
  otlpLogsEnabled: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
});
export type ServerObservability = typeof ServerObservability.Type;

export const ServerTraceDiagnosticsErrorKind = Schema.Literals([
  "trace-file-not-found",
  "trace-file-read-failed",
]);
export type ServerTraceDiagnosticsErrorKind = typeof ServerTraceDiagnosticsErrorKind.Type;

export const ServerTraceDiagnosticsSpanSummary = Schema.Struct({
  name: TrimmedNonEmptyString,
  count: NonNegativeInt,
  failureCount: NonNegativeInt,
  totalDurationMs: Schema.Number,
  averageDurationMs: Schema.Number,
  maxDurationMs: Schema.Number,
});
export type ServerTraceDiagnosticsSpanSummary = typeof ServerTraceDiagnosticsSpanSummary.Type;

export const ServerTraceDiagnosticsFailureSummary = Schema.Struct({
  name: TrimmedNonEmptyString,
  cause: TrimmedNonEmptyString,
  count: NonNegativeInt,
  lastSeenAt: Schema.DateTimeUtc,
  traceId: TrimmedNonEmptyString,
  spanId: TrimmedNonEmptyString,
});
export type ServerTraceDiagnosticsFailureSummary = typeof ServerTraceDiagnosticsFailureSummary.Type;

export const ServerTraceDiagnosticsRecentFailure = Schema.Struct({
  name: TrimmedNonEmptyString,
  cause: TrimmedNonEmptyString,
  durationMs: Schema.Number,
  endedAt: Schema.DateTimeUtc,
  traceId: TrimmedNonEmptyString,
  spanId: TrimmedNonEmptyString,
});
export type ServerTraceDiagnosticsRecentFailure = typeof ServerTraceDiagnosticsRecentFailure.Type;

export const ServerTraceDiagnosticsSpanOccurrence = Schema.Struct({
  name: TrimmedNonEmptyString,
  durationMs: Schema.Number,
  endedAt: Schema.DateTimeUtc,
  traceId: TrimmedNonEmptyString,
  spanId: TrimmedNonEmptyString,
});
export type ServerTraceDiagnosticsSpanOccurrence = typeof ServerTraceDiagnosticsSpanOccurrence.Type;

export const ServerTraceDiagnosticsLogEvent = Schema.Struct({
  spanName: TrimmedNonEmptyString,
  level: TrimmedNonEmptyString,
  message: TrimmedNonEmptyString,
  seenAt: Schema.DateTimeUtc,
  traceId: TrimmedNonEmptyString,
  spanId: TrimmedNonEmptyString,
});
export type ServerTraceDiagnosticsLogEvent = typeof ServerTraceDiagnosticsLogEvent.Type;

export const ServerTraceDiagnosticsResult = Schema.Struct({
  traceFilePath: TrimmedNonEmptyString,
  scannedFilePaths: Schema.Array(TrimmedNonEmptyString),
  readAt: Schema.DateTimeUtc,
  recordCount: NonNegativeInt,
  parseErrorCount: NonNegativeInt,
  firstSpanAt: Schema.Option(Schema.DateTimeUtc),
  lastSpanAt: Schema.Option(Schema.DateTimeUtc),
  failureCount: NonNegativeInt,
  interruptionCount: NonNegativeInt,
  slowSpanThresholdMs: NonNegativeInt,
  slowSpanCount: NonNegativeInt,
  logLevelCounts: Schema.Record(TrimmedNonEmptyString, NonNegativeInt),
  topSpansByCount: Schema.Array(ServerTraceDiagnosticsSpanSummary),
  slowestSpans: Schema.Array(ServerTraceDiagnosticsSpanOccurrence),
  commonFailures: Schema.Array(ServerTraceDiagnosticsFailureSummary),
  latestFailures: Schema.Array(ServerTraceDiagnosticsRecentFailure),
  latestWarningAndErrorLogs: Schema.Array(ServerTraceDiagnosticsLogEvent),
  partialFailure: Schema.Option(Schema.Boolean),
  error: Schema.Option(
    Schema.Struct({
      kind: ServerTraceDiagnosticsErrorKind,
      message: TrimmedNonEmptyString,
    }),
  ),
});
export type ServerTraceDiagnosticsResult = typeof ServerTraceDiagnosticsResult.Type;

export const ServerProcessSignal = Schema.Literals(["SIGINT", "SIGKILL"]);
export type ServerProcessSignal = typeof ServerProcessSignal.Type;

export const ServerProcessDiagnosticsEntry = Schema.Struct({
  pid: PositiveInt,
  startTimeMs: NonNegativeInt,
  ppid: NonNegativeInt,
  pgid: Schema.Option(Schema.Int),
  status: TrimmedNonEmptyString,
  cpuPercent: Schema.Number,
  rssBytes: NonNegativeInt,
  elapsed: TrimmedNonEmptyString,
  command: TrimmedNonEmptyString,
  depth: NonNegativeInt,
  childPids: Schema.Array(PositiveInt),
});
export type ServerProcessDiagnosticsEntry = typeof ServerProcessDiagnosticsEntry.Type;

export const ServerProcessDiagnosticsResult = Schema.Struct({
  serverPid: PositiveInt,
  readAt: Schema.DateTimeUtc,
  processCount: NonNegativeInt,
  totalRssBytes: NonNegativeInt,
  totalCpuPercent: Schema.Number,
  processes: Schema.Array(ServerProcessDiagnosticsEntry),
  error: Schema.Option(
    Schema.Struct({
      message: TrimmedNonEmptyString,
    }),
  ),
});
export type ServerProcessDiagnosticsResult = typeof ServerProcessDiagnosticsResult.Type;

export const ServerProcessResourceHistoryInput = Schema.Struct({
  windowMs: NonNegativeInt,
  bucketMs: NonNegativeInt,
});
export type ServerProcessResourceHistoryInput = typeof ServerProcessResourceHistoryInput.Type;

export const ServerProcessResourceHistoryBucket = Schema.Struct({
  startedAt: Schema.DateTimeUtc,
  endedAt: Schema.DateTimeUtc,
  avgCpuPercent: Schema.Number,
  maxCpuPercent: Schema.Number,
  maxRssBytes: NonNegativeInt,
  maxProcessCount: NonNegativeInt,
});
export type ServerProcessResourceHistoryBucket = typeof ServerProcessResourceHistoryBucket.Type;

export const ServerProcessResourceHistorySummary = Schema.Struct({
  processKey: TrimmedNonEmptyString,
  pid: PositiveInt,
  ppid: NonNegativeInt,
  command: TrimmedNonEmptyString,
  depth: NonNegativeInt,
  isServerRoot: Schema.Boolean,
  firstSeenAt: Schema.DateTimeUtc,
  lastSeenAt: Schema.DateTimeUtc,
  currentCpuPercent: Schema.Number,
  avgCpuPercent: Schema.Number,
  maxCpuPercent: Schema.Number,
  cpuSecondsApprox: Schema.Number,
  currentRssBytes: NonNegativeInt,
  maxRssBytes: NonNegativeInt,
  sampleCount: NonNegativeInt,
});
export type ServerProcessResourceHistorySummary = typeof ServerProcessResourceHistorySummary.Type;

export const ServerProcessResourceHistoryFailureTag = Schema.Literals([
  "ProcessDiagnosticsQueryTimeoutError",
  "ProcessDiagnosticsQueryFailedError",
  "ProcessDiagnosticsServerProcessSignalError",
  "ProcessDiagnosticsNotDescendantError",
  "ProcessDiagnosticsSignalFailedError",
]);
export type ServerProcessResourceHistoryFailureTag =
  typeof ServerProcessResourceHistoryFailureTag.Type;

export const ServerProcessResourceHistoryResult = Schema.Struct({
  readAt: Schema.DateTimeUtc,
  windowMs: NonNegativeInt,
  bucketMs: NonNegativeInt,
  sampleIntervalMs: NonNegativeInt,
  retainedSampleCount: NonNegativeInt,
  totalCpuSecondsApprox: Schema.Number,
  buckets: Schema.Array(ServerProcessResourceHistoryBucket),
  topProcesses: Schema.Array(ServerProcessResourceHistorySummary),
  error: Schema.Option(
    Schema.Struct({
      failureTag: ServerProcessResourceHistoryFailureTag,
      message: TrimmedNonEmptyString,
    }),
  ),
});
export type ServerProcessResourceHistoryResult = typeof ServerProcessResourceHistoryResult.Type;

export const ServerSignalProcessInput = Schema.Struct({
  pid: PositiveInt,
  startTimeMs: NonNegativeInt,
  signal: ServerProcessSignal,
});
export type ServerSignalProcessInput = typeof ServerSignalProcessInput.Type;

export const ServerSignalProcessResult = Schema.Struct({
  pid: PositiveInt,
  signal: ServerProcessSignal,
  signaled: Schema.Boolean,
  message: Schema.Option(TrimmedNonEmptyString),
});
export type ServerSignalProcessResult = typeof ServerSignalProcessResult.Type;

/**
 * A palette the environment's machine publishes for T3 Code to follow, read
 * from a theme file next to the rest of the environment's state. Two seed
 * colors rather than a full palette: clients derive the remaining roles with
 * the same generator the guided theme editor uses, so a desktop theme carries
 * over as a coherent T3 Code palette instead of a foreign one.
 */
export const EnvironmentThemeColor = Schema.String.check(
  Schema.isPattern(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
);
export type EnvironmentThemeColor = typeof EnvironmentThemeColor.Type;

/**
 * Matches the client-side theme id rule, so a published id is selectable.
 * The appearance keywords are excluded outright: a published `dark.json`
 * would otherwise capture every client whose stored preference is the stock
 * `"dark"`, retinting people who never chose it.
 */
export const EnvironmentThemeId = Schema.String.check(
  Schema.isPattern(/^(?!(?:system|light|dark)$)[a-z0-9](?:[a-z0-9-]{0,47})$/),
);
export type EnvironmentThemeId = typeof EnvironmentThemeId.Type;

/**
 * Role colors as published. Values are any CSS color the client's theme
 * parser accepts (exported theme files use oklch), canonicalized client-side;
 * roles a build does not know are dropped there, so a machine may publish
 * roles a newer client added without breaking an older one. Keys must still
 * be role-shaped and values color-sized, so the record stays open to future
 * vocabulary without being an arbitrary-payload channel.
 */
const EnvironmentThemeColors = Schema.Record(
  Schema.String.check(Schema.isPattern(/^[a-zA-Z][a-zA-Z0-9]{0,63}$/)),
  TrimmedNonEmptyString.check(Schema.isMaxLength(64)),
);

const environmentThemeFields = {
  /**
   * Standard exported theme files (the Download button's output) carry
   * `version: 1`; the seeded short form a desktop generates has no version.
   */
  version: Schema.optional(Schema.Literal(1)),
  /** Shown on the theme card, e.g. the desktop theme's own name. */
  name: TrimmedNonEmptyString.check(Schema.isMaxLength(48)),
  appearance: Schema.Literals(["light", "dark"]),
  /**
   * Seed colors. When present, clients derive the full palette from them with
   * the guided theme editor's generator and layer `colors` on top; when
   * absent, `colors` is the palette, as in an exported theme file.
   */
  canvas: Schema.optional(EnvironmentThemeColor),
  accent: Schema.optional(EnvironmentThemeColor),
  colors: Schema.optional(EnvironmentThemeColors),
  /** The other appearance's palette, as exported theme files carry it. */
  variants: Schema.optional(
    Schema.Struct({
      light: Schema.optional(EnvironmentThemeColors),
      dark: Schema.optional(EnvironmentThemeColors),
    }),
  ),
};

/** One published theme file. The id is the filename, not part of the content,
 * so a file cannot claim another file's identity; an embedded `id` is ignored. */
export const EnvironmentThemeFile = Schema.Struct(environmentThemeFields);
export type EnvironmentThemeFile = typeof EnvironmentThemeFile.Type;

export const EnvironmentTheme = Schema.Struct({
  /** The publishing filename without its extension, stable across recolors. */
  id: EnvironmentThemeId,
  ...environmentThemeFields,
});
export type EnvironmentTheme = typeof EnvironmentTheme.Type;

/**
 * Whether a theme file carries anything to render. A file with neither seeds
 * nor colors would show as the stock palette wearing a name, which reads as a
 * bug rather than a theme — the CLI and the server watcher both reject it,
 * through this one predicate so they cannot drift.
 */
export function environmentThemeFileHasColors(file: EnvironmentThemeFile): boolean {
  return (
    (file.canvas !== undefined && file.accent !== undefined) ||
    (file.colors !== undefined && Object.keys(file.colors).length > 0)
  );
}

/**
 * "tailnet" when the address is on this machine's Tailscale interface, "lan"
 * for any other private address, including other VPNs in 100.64.0.0/10.
 */
export const ServerDirectEndpointKind = Schema.Literals(["lan", "tailnet"]);
export type ServerDirectEndpointKind = typeof ServerDirectEndpointKind.Type;

export const ServerDirectEndpoint = Schema.Struct({
  kind: ServerDirectEndpointKind,
  httpBaseUrl: TrimmedNonEmptyString,
});
export type ServerDirectEndpoint = typeof ServerDirectEndpoint.Type;

export const ServerConfig = Schema.Struct({
  environment: ExecutionEnvironmentDescriptor,
  auth: ServerAuthDescriptor,
  cwd: TrimmedNonEmptyString,
  keybindingsConfigPath: TrimmedNonEmptyString,
  keybindings: ResolvedKeybindingsConfig,
  issues: ServerConfigIssues,
  providers: ServerProviders,
  // Editor ids grow over time; drop ones this build does not know rather than
  // failing the whole config decode.
  availableEditors: ForwardCompatibleArray(EditorId),
  /**
   * SSH hosts this environment advertises for remote open-in-editor links.
   * Absent on servers that predate the feature; empty when the machine has no
   * sshd or no advertisable name.
   */
  remoteOpenTargets: Schema.optionalKey(ForwardCompatibleArray(RemoteOpenTarget)),
  /**
   * Direct addresses this server listens on right now (LAN and tailnet), so a
   * client connected one way can learn the others. Hints only: the client
   * checks each address answers as this environment before using it. Absent on
   * servers that predate the feature; empty when bound to loopback only.
   */
  directEndpoints: Schema.optionalKey(ForwardCompatibleArray(ServerDirectEndpoint)),
  observability: ServerObservability,
  settings: ServerSettings,
  /** Whether shell subscriptions can emit an opt-in catch-up completion marker. */
  shellResumeCompletionMarker: Schema.optionalKey(Schema.Boolean),
  /** Whether shell.openInEditor honors `LaunchEditorInput.reveal` for the
      file-manager editor. */
  shellRevealInFileManager: Schema.optionalKey(Schema.Boolean),
  /** File-manager wording clients should use for reveal actions. */
  shellRevealInFileManagerKind: Schema.optionalKey(FileManagerRevealKind),
  /** Whether thread subscriptions can emit an opt-in catch-up completion marker. */
  threadResumeCompletionMarker: Schema.optionalKey(Schema.Boolean),
  /**
   * Whether thread detail reads accept a turn window (`turnLimit`/
   * `beforeCursor`) and return `page` metadata. Clients must not send window
   * fields to servers that don't advertise this.
   */
  threadSnapshotPagination: Schema.optionalKey(Schema.Boolean),
  /** Whether thread reads accept the reasoningMessages opt-in. */
  reasoningMessages: Schema.optionalKey(Schema.Boolean),
  threadFind: Schema.optionalKey(Schema.Boolean),
  threadFindProgressive: Schema.optionalKey(Schema.Boolean),
  /**
   * Folder behind this environment's Scratch project, for threads that need
   * no repository. Present only on servers that answer projects.ensureScratch
   * and whose data dir is outside a Git checkout.
   */
  scratchWorkspaceRoot: Schema.optionalKey(TrimmedNonEmptyString),
  /**
   * Folder that holds projects started from just a name. Present only on
   * servers that answer projects.createNew.
   */
  newProjectsRoot: Schema.optionalKey(TrimmedNonEmptyString),
  /**
   * Palettes published by this environment's machine. Never sent in a config
   * snapshot: the theme stream emits the current set before any change, so a
   * snapshot carrying it too would hand every subscriber the same array twice
   * per connect. Clients populate this by projecting `environmentThemesUpdated`,
   * and it stays absent for subscribers that did not opt in.
   */
  environmentThemes: Schema.optional(Schema.Array(EnvironmentTheme)),
  /**
   * Quota reported by configured `usageLimitSources`. Like themes, never in
   * a snapshot: the source stream emits the current set on subscribe, and it
   * stays absent for subscribers that did not opt in.
   */
  usageLimitSources: Schema.optional(UsageLimitSourceSnapshots),
});
export type ServerConfig = typeof ServerConfig.Type;

/**
 * The machine an environment should be drawn as: the user's pick, else what
 * the server detected, else a generic server. Settings only exist once
 * connected; a descriptor alone (relay discovery, before any connection)
 * still yields the detected kind. A null config (nothing known yet, or an
 * older server) resolves to the same generic so rows never flicker between
 * glyphs.
 */
export function resolveEnvironmentMachineKind(
  config: {
    readonly environment: Pick<ExecutionEnvironmentDescriptor, "platform">;
    readonly settings?: Pick<ServerSettings, "environmentIcon">;
  } | null,
): EnvironmentMachineKind {
  return config?.settings?.environmentIcon ?? config?.environment.platform.machine ?? "server";
}

const ServerUpsertKeybindingReplaceTarget = Schema.Struct({
  key: KeybindingValue,
  command: KeybindingCommand,
  when: Schema.optional(KeybindingWhen),
});

export const ServerUpsertKeybindingInput = Schema.Struct({
  key: KeybindingValue,
  command: KeybindingCommand,
  when: Schema.optional(KeybindingWhen),
  replace: Schema.optional(ServerUpsertKeybindingReplaceTarget),
});
export type ServerUpsertKeybindingInput = typeof ServerUpsertKeybindingInput.Type;

export const ServerRemoveKeybindingInput = ServerUpsertKeybindingReplaceTarget;
export type ServerRemoveKeybindingInput = typeof ServerRemoveKeybindingInput.Type;

export const ServerUpsertKeybindingResult = Schema.Struct({
  keybindings: ResolvedKeybindingsConfig,
  issues: ServerConfigIssues,
});
export type ServerUpsertKeybindingResult = typeof ServerUpsertKeybindingResult.Type;

export const ServerRemoveKeybindingResult = ServerUpsertKeybindingResult;
export type ServerRemoveKeybindingResult = typeof ServerRemoveKeybindingResult.Type;

export const ServerConfigUpdatedPayload = Schema.Struct({
  issues: ServerConfigIssues,
  providers: ServerProviders,
  settings: Schema.optional(ServerSettings),
});
export type ServerConfigUpdatedPayload = typeof ServerConfigUpdatedPayload.Type;

export const ServerConfigKeybindingsUpdatedPayload = Schema.Struct({
  keybindings: ResolvedKeybindingsConfig,
  issues: ServerConfigIssues,
});
export type ServerConfigKeybindingsUpdatedPayload =
  typeof ServerConfigKeybindingsUpdatedPayload.Type;

export const ServerConfigProviderStatusesPayload = Schema.Struct({
  providers: ServerProviders,
});
export type ServerConfigProviderStatusesPayload = typeof ServerConfigProviderStatusesPayload.Type;

export const ServerConfigSettingsUpdatedPayload = Schema.Struct({
  settings: ServerSettings,
});
export type ServerConfigSettingsUpdatedPayload = typeof ServerConfigSettingsUpdatedPayload.Type;

export const ServerConfigStreamSnapshotEvent = Schema.Struct({
  version: Schema.Literal(1),
  type: Schema.Literal("snapshot"),
  config: ServerConfig,
});
export type ServerConfigStreamSnapshotEvent = typeof ServerConfigStreamSnapshotEvent.Type;

export const ServerConfigStreamKeybindingsUpdatedEvent = Schema.Struct({
  version: Schema.Literal(1),
  type: Schema.Literal("keybindingsUpdated"),
  payload: ServerConfigKeybindingsUpdatedPayload,
});
export type ServerConfigStreamKeybindingsUpdatedEvent =
  typeof ServerConfigStreamKeybindingsUpdatedEvent.Type;

export const ServerConfigStreamProviderStatusesEvent = Schema.Struct({
  version: Schema.Literal(1),
  type: Schema.Literal("providerStatuses"),
  payload: ServerConfigProviderStatusesPayload,
});
export type ServerConfigStreamProviderStatusesEvent =
  typeof ServerConfigStreamProviderStatusesEvent.Type;

export const ServerConfigStreamSettingsUpdatedEvent = Schema.Struct({
  version: Schema.Literal(1),
  type: Schema.Literal("settingsUpdated"),
  payload: ServerConfigSettingsUpdatedPayload,
});
export type ServerConfigStreamSettingsUpdatedEvent =
  typeof ServerConfigStreamSettingsUpdatedEvent.Type;

export const ServerConfigEnvironmentThemesUpdatedPayload = Schema.Struct({
  /** The full published set; empty once the machine publishes none. */
  themes: Schema.Array(EnvironmentTheme),
});
export type ServerConfigEnvironmentThemesUpdatedPayload =
  typeof ServerConfigEnvironmentThemesUpdatedPayload.Type;

export const ServerConfigStreamEnvironmentThemesUpdatedEvent = Schema.Struct({
  version: Schema.Literal(1),
  type: Schema.Literal("environmentThemesUpdated"),
  payload: ServerConfigEnvironmentThemesUpdatedPayload,
});
export type ServerConfigStreamEnvironmentThemesUpdatedEvent =
  typeof ServerConfigStreamEnvironmentThemesUpdatedEvent.Type;

export const ServerConfigUsageLimitSourcesUpdatedPayload = Schema.Struct({
  /** The full set; empty once no source is configured. */
  sources: UsageLimitSourceSnapshots,
});
export type ServerConfigUsageLimitSourcesUpdatedPayload =
  typeof ServerConfigUsageLimitSourcesUpdatedPayload.Type;

export const ServerConfigStreamUsageLimitSourcesUpdatedEvent = Schema.Struct({
  version: Schema.Literal(1),
  type: Schema.Literal("usageLimitSourcesUpdated"),
  payload: ServerConfigUsageLimitSourcesUpdatedPayload,
});
export type ServerConfigStreamUsageLimitSourcesUpdatedEvent =
  typeof ServerConfigStreamUsageLimitSourcesUpdatedEvent.Type;

export const ServerConfigStreamEvent = Schema.Union([
  ServerConfigStreamSnapshotEvent,
  ServerConfigStreamKeybindingsUpdatedEvent,
  ServerConfigStreamProviderStatusesEvent,
  ServerConfigStreamSettingsUpdatedEvent,
  ServerConfigStreamEnvironmentThemesUpdatedEvent,
  ServerConfigStreamUsageLimitSourcesUpdatedEvent,
]);
export type ServerConfigStreamEvent = typeof ServerConfigStreamEvent.Type;

/** Terminal selection recorded by the service launcher for one update. */
export const ServerSelfUpdateOutcome = Schema.Struct({
  id: TrimmedNonEmptyString,
  fromVersion: TrimmedNonEmptyString,
  targetVersion: TrimmedNonEmptyString,
  status: Schema.Literals(["committed", "rolled-back", "failed"]),
  reason: Schema.optionalKey(TrimmedNonEmptyString),
});
export type ServerSelfUpdateOutcome = typeof ServerSelfUpdateOutcome.Type;

export const ServerLifecycleReadyPayload = Schema.Struct({
  at: IsoDateTime,
  environment: ExecutionEnvironmentDescriptor,
  /** Present when this process resumed a launcher-managed update. */
  updateOutcome: Schema.optionalKey(ServerSelfUpdateOutcome),
});
export type ServerLifecycleReadyPayload = typeof ServerLifecycleReadyPayload.Type;

export const ServerLifecycleWelcomePayload = Schema.Struct({
  environment: ExecutionEnvironmentDescriptor,
  cwd: TrimmedNonEmptyString,
  projectName: TrimmedNonEmptyString,
  bootstrapStatus: Schema.optional(Schema.Literals(["pending", "complete"])),
  bootstrapProjectId: Schema.optional(ProjectId),
  bootstrapThreadId: Schema.optional(ThreadId),
  bootstrapProjectCreated: Schema.optional(Schema.Boolean),
  bootstrapThreadCreated: Schema.optional(Schema.Boolean),
});
export type ServerLifecycleWelcomePayload = typeof ServerLifecycleWelcomePayload.Type;

export const ServerLifecycleLegacyThreadMigrationPayload = Schema.Struct({
  status: Schema.Union([Schema.Literal("running"), Schema.Literal("complete")]),
  totalThreadCount: NonNegativeInt,
});
export type ServerLifecycleLegacyThreadMigrationPayload =
  typeof ServerLifecycleLegacyThreadMigrationPayload.Type;

export const ServerLifecycleStreamWelcomeEvent = Schema.Struct({
  version: Schema.Literal(1),
  sequence: NonNegativeInt,
  type: Schema.Literal("welcome"),
  payload: ServerLifecycleWelcomePayload,
});
export type ServerLifecycleStreamWelcomeEvent = typeof ServerLifecycleStreamWelcomeEvent.Type;

export const ServerLifecycleStreamReadyEvent = Schema.Struct({
  version: Schema.Literal(1),
  sequence: NonNegativeInt,
  type: Schema.Literal("ready"),
  payload: ServerLifecycleReadyPayload,
});
export type ServerLifecycleStreamReadyEvent = typeof ServerLifecycleStreamReadyEvent.Type;

export const ServerLifecycleStreamLegacyThreadMigrationEvent = Schema.Struct({
  version: Schema.Literal(1),
  sequence: NonNegativeInt,
  type: Schema.Literal("legacyThreadMigration"),
  payload: ServerLifecycleLegacyThreadMigrationPayload,
});
export type ServerLifecycleStreamLegacyThreadMigrationEvent =
  typeof ServerLifecycleStreamLegacyThreadMigrationEvent.Type;

export const ServerLifecycleStreamEvent = Schema.Union([
  ServerLifecycleStreamWelcomeEvent,
  ServerLifecycleStreamReadyEvent,
  ServerLifecycleStreamLegacyThreadMigrationEvent,
]);
export type ServerLifecycleStreamEvent = typeof ServerLifecycleStreamEvent.Type;

export const ServerProviderUpdatedPayload = Schema.Struct({
  providers: ServerProviders,
});
export type ServerProviderUpdatedPayload = typeof ServerProviderUpdatedPayload.Type;

export const ServerProviderUpdateInput = Schema.Struct({
  provider: ProviderDriverKind,
  targetVersion: Schema.optionalKey(TrimmedNonEmptyString),
  instanceId: Schema.optionalKey(ProviderInstanceId),
});
export type ServerProviderUpdateInput = typeof ServerProviderUpdateInput.Type;

export class ServerProviderUpdateError extends Schema.TaggedError<ServerProviderUpdateError>()(
  "ServerProviderUpdateError",
  {
    provider: ProviderDriverKind,
    reason: TrimmedNonEmptyString,
    cause: Schema.optional(Schema.Defect()),
  },
) {
  override get message(): string {
    return `Provider update failed for ${this.provider}: ${this.reason}`;
  }
}

export const ServerSelfUpdateInput = Schema.Struct({
  /** Exact npm version of the `t3` package to install (never a dist-tag, so
      the server and the acknowledging client agree on what was requested). */
  targetVersion: TrimmedNonEmptyString,
  /** Opt-in recovery for provider turns that are running when the server
      hands off to its replacement. Missing and false keep restart behavior
      conservative under version skew. */
  continueRunningThreads: Schema.optionalKey(Schema.Boolean),
});
export type ServerSelfUpdateInput = typeof ServerSelfUpdateInput.Type;

/** Acknowledgement that the update artifact is installed and the server is
    about to restart into it — the connection will drop moments later. */
export const ServerSelfUpdateResult = Schema.Struct({
  targetVersion: TrimmedNonEmptyString,
  method: ServerSelfUpdateMethod,
  /** Launcher-generated correlation ID. Absent when talking to older servers. */
  updateId: Schema.optionalKey(TrimmedNonEmptyString),
  /** Desktop preparation token. Present only for the desktop-app method. */
  desktopUpdateToken: Schema.optionalKey(TrimmedNonEmptyString),
});
export type ServerSelfUpdateResult = typeof ServerSelfUpdateResult.Type;

export const DesktopUpdateCommitInput = Schema.Struct({
  requestId: TrimmedNonEmptyString,
});
export type DesktopUpdateCommitInput = typeof DesktopUpdateCommitInput.Type;

export const ServerSelfUpdateProgressStage = Schema.Literals(["downloading", "installing"]);
export type ServerSelfUpdateProgressStage = typeof ServerSelfUpdateProgressStage.Type;

export const ServerSelfUpdateProgressEvent = Schema.Union([
  Schema.Struct({
    type: Schema.Literal("progress"),
    stage: ServerSelfUpdateProgressStage,
  }),
  Schema.Struct({
    type: Schema.Literal("complete"),
    result: ServerSelfUpdateResult,
  }),
]);
export type ServerSelfUpdateProgressEvent = typeof ServerSelfUpdateProgressEvent.Type;

export class ServerSelfUpdateError extends Schema.TaggedError<ServerSelfUpdateError>()(
  "ServerSelfUpdateError",
  {
    reason: TrimmedNonEmptyString,
    cause: Schema.optional(Schema.Defect()),
  },
) {
  override get message(): string {
    return `Server update failed: ${this.reason}`;
  }
}
