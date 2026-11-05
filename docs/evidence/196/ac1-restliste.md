# #196 AC-1: verbleibende Altnamen

Befehl: `git grep -n -i "devorbit\|devhub\|dev orbit" -- . ':!briefings' ':!graphify-out' ':!CHANGELOG.md' ':!docs/landing-evidence' ':!docs/evidence/196'`

Treffer: 285, davon unklassifiziert: 0. `docs/landing-evidence` ist ein historisches Lighthouse-Artefakt und bleibt unverändert.

| Anzahl | Guardrail-Kategorie                                                                                                      |
| -----: | :----------------------------------------------------------------------------------------------------------------------- |
|     13 | Rename-Skript und Review-Skript (#196, nennen alten Pfad/Repo absichtlich)                                               |
|      3 | Electron userData-Pin (alter Ordnername, damit Daten bleiben)                                                            |
|      4 | Fremd-Repo hpmartini/DevHub-pro (eigenes Repo, nicht Teil von #196)                                                      |
|      2 | Terminal-Aufnahme (byte-genaue Fixture, aufgezeichneter alter Checkout-Pfad)                                             |
|     76 | Env-Variablen (DEVORBIT*\*, DEVHUB*\*)                                                                                   |
|     51 | localStorage-/Server-UI-Schlüssel (devOrbit*, devorbit-*, devorbit.\*)                                                   |
|     12 | Datenordner/-dateien (devorbit-data, devorbit-rate-limits.json)                                                          |
|      9 | Bundle-/App-IDs (com.devorbit.dashboard, de.martinilabs.devorbit)                                                        |
|     24 | URL-Schema devorbit:// (gekoppelte iPhones, QR-Links)                                                                    |
|      7 | Header X-DevOrbit-Token (gekoppelte Clients)                                                                             |
|     40 | postMessage-Typen, MIME, Vite-Plugin in Nutzerprojekten (devorbit-console/-network, x-devorbit-\*, devorbit-vite-plugin) |
|     33 | Docker/DB/Infra (Netz, Volumes, Container, DB devorbit, ghcr devhub-\*, Tunnel)                                          |
|      8 | Interne Port-/CLI-Namen (PORTS.devhub, --devorbit-server-port)                                                           |
|      3 | Bekannte schwache Passwörter (alter Default devOrbit123 bleibt gesperrt)                                                 |

## Rename-Skript und Review-Skript (#196, nennen alten Pfad/Repo absichtlich)

```
scripts/rename-local-dir.sh:2:# Moves the local checkout from ~/PROJECTS/DevOrbitDashboard to ~/PROJECTS/Orkumo (issue #196) and
scripts/rename-local-dir.sh:8:#   ~/PROJECTS/DevOrbitDashboard/scripts/rename-local-dir.sh [--dry-run]
scripts/rename-local-dir.sh:14:SRC="${SRC:-$HOME/PROJECTS/DevOrbitDashboard}"
scripts/rename-local-dir.sh:18:ORKUMO_DATA_DIRS="${ORKUMO_DATA_DIRS:-$HOME/Library/Application Support/devorbit-dashboard/data:$DST/data}"
scripts/rename-local-dir.sh:44:  if [[ -z "${SKIP_APP_CHECK:-}" ]] && pgrep -f '(DevOrbitDashboard|Orkumo)\.app/Contents/MacOS/' >/dev/null; then
scripts/rename-local-dir.sh:45:    echo "quit the Orkumo/DevOrbitDashboard desktop app first" >&2
scripts/rename-local-dir.sh:69:new_url=${url//hpmartini\/DevHub/hpmartini\/Orkumo}
scripts/rename-local-dir.sh:75:  # "--": worktree folders (/.claude/... -> --claude-...), not siblings like DevOrbitDashboard-foo
scripts/rename-local-dir.test.sh:9:SRC="$HOME/PROJECTS/DevOrbitDashboard"
scripts/rename-local-dir.test.sh:12:git -C "$SRC" remote add origin git@github.com:hpmartini/DevHub.git
scripts/rename-local-dir.test.sh:16:echo '{ "devorbitdashboard": "'"$SRC"'" }' >"$HOME/PROJECTS/Magos/config/projekt-repos.json"
scripts/review/196.sh:22:git grep -n -i "devorbit\|devhub\|dev orbit" -- . ':!briefings' ':!graphify-out' ':!CHANGELOG.md' ':!docs/landing-evidence' ':!docs/evidence/196' | wc -l
scripts/review/196.sh:29:HOME="$DATA/home" DEVORBIT_DATA_PATH="$DATA" SERVER_PORT=$SERVER_PORT node server/index.js >"$DATA/server.log" 2>&1 &
```

## Electron userData-Pin (alter Ordnername, damit Daten bleiben)

```
electron/constants.js:12: * runs both used "devorbit-dashboard". Without pinning, existing installs would start with empty data.
electron/constants.js:14:export const LEGACY_USER_DATA_DIR = 'devorbit-dashboard';
test/electronUserData.test.js:8:    expect(LEGACY_USER_DATA_DIR).toBe('devorbit-dashboard');
```

## Fremd-Repo hpmartini/DevHub-pro (eigenes Repo, nicht Teil von #196)

```
scripts/review/165.sh:2:# Review #165: Orkumo without and with the Workflows premium module (hpmartini/DevHub-pro).
scripts/review/165.sh:4:# Builds DevHub-pro in a temp dir, runs both test suites, then starts server + Vite on spare
scripts/review/165.sh:33:echo "== DevHub-pro ($PRO_BRANCH): clone, tests, build"
scripts/review/165.sh:36:  clone -q --branch "$PRO_BRANCH" https://github.com/hpmartini/DevHub-pro.git "$TMP/pro"
```

## Terminal-Aufnahme (byte-genaue Fixture, aufgezeichneter alter Checkout-Pfad)

```
test/fixtures/claude-logs-question.txt:1:78[2J[H[H
[1B[38;2;215;119;87m ▐[48;2;0;0;0m▛███▛█[12G[39m[49m[1mClaude Code[24G[22m[38;2;153;153;153mv2.1.318
[1B[38;2;215;119;87m▝▜[48;2;0; …
test/fixtures/claude-logs-table.txt:1:78[2J[H[H
[1B[38;2;215;119;87m ▐[48;2;0;0;0m▛███▛█[12G[39m[49m[1mClaude Code[24G[22m[38;2;153;153;153mv2.1.318
[1B[38;2;215;119;87m▝▜[48;2;0;0;0 …
```

## Env-Variablen (DEVORBIT*\*, DEVHUB*\*)

```
.env.example:2:# DEVORBIT_CODEX_HOMES=Codex A=~/.codex,Codex B=~/.codex-b
.env.example:70:DEVORBIT_AGENTS_ALLOW_UNSAFE_FLAGS=false
.env.example:79:# DEVHUB_PREMIUM_DIR=
.github/workflows/release.yml:117:          sed "s/\${DEVHUB_VERSION:-latest}/\${DEVHUB_VERSION:-${TAG#v}}/" docker/docker-compose.release.yml > release-assets/docker-compose.release.yml
.github/workflows/release.yml:118:          grep -q "devhub-api:\${DEVHUB_VERSION:-${TAG#v}}" release-assets/docker-compose.release.yml
CLAUDE.md:56:Optional `DEVORBIT_CODEX_HOMES=Label=path,Label=path` lists the Codex accounts for `/usage`. For live Claude limits, wrap the statusline: `statusLine.command` = `bash <repo>/scripts/claud …
README.md:10:- **Usage** (`/usage`): tokens per day, model and provider (Claude Code, Codex accounts via `DEVORBIT_CODEX_HOMES`, MiniMax) and plan limits from local logs.
README.md:42:# DEVORBIT_CODEX_HOMES=Codex A=~/.codex,Codex B=~/.codex-b
README.md:92:Security: sessions can only be dispatched into (and `--add-dir` only point at) the project directories configured in the admin panel; the server resolves symlinks before checking. Flags t …
README.md:103:DEVORBIT_REMOTE=true bun run server          # oder DEVORBIT_REMOTE=true in .env.local
README.md:107:- Mit `DEVORBIT_REMOTE=true` braucht jede Anfrage, die nicht direkt von localhost kommt (auch über `tailscale serve`), den Pairing-Token. Er liegt in `<data>/remote-token` (Modus 600) un …
README.md:109:- Läuft `tailscale serve` auf einem anderen Port als 443 oder unter anderem Namen: `DEVORBIT_REMOTE_URL=https://<mac>.<tailnet>.ts.net:8443` setzen, sonst nimmt die Pairing-Anzeige `http …
README.md:146:Optional `.env` next to the compose file: `POSTGRES_PASSWORD`, `GEMINI_API_KEY`, `DEVORBIT_PORT` (default 3000), `DEVORBIT_PROJECTS_DIR` (default `~/Projects`), `PTY_HOST_HTTP_TOKEN`.
TASK.md:488:  - Approach: Routing in `App.tsx` und `AgentsView` gelesen. Mit Playwright gegen eine isolierte Server-Instanz geprüft (`DEVORBIT_DATA_PATH`, Ports 3198/3199).
components/AgentsView/AgentSettingsPanel.tsx:266:                  server. Start it with DEVORBIT_AGENTS_ALLOW_UNSAFE_FLAGS=true to enable them.
components/RemotePairingSection.tsx:62:            {row('Adresse', info.url ?? 'Tailscale nicht gefunden: DEVORBIT_REMOTE_URL setzen')}
components/RemotePairingSection.tsx:79:            Remote-Zugang ist aus. Server mit <code>DEVORBIT_REMOTE=true</code> starten und{' '}
constants.ts:17:export const DEVHUB_RESERVED_PORT = PORTS.devhub;
docker-compose.yml:10:      - "${DEVORBIT_PORT:-3000}:80"
docker/docker-compose.release.yml:5:# The release workflow pins DEVHUB_VERSION's default to the release version.
docker/docker-compose.release.yml:8:    image: ghcr.io/hpmartini/devhub-frontend:${DEVHUB_VERSION:-latest}
docker/docker-compose.release.yml:11:      - "127.0.0.1:${DEVORBIT_PORT:-3000}:80"
docker/docker-compose.release.yml:20:    image: ghcr.io/hpmartini/devhub-api:${DEVHUB_VERSION:-latest}
docker/docker-compose.release.yml:28:      - ${DEVORBIT_PROJECTS_DIR:-${HOME}/Projects}:/home/coder/Projects
docs/MODULES.md:7:`DEVHUB_PREMIUM_DIR` if set, otherwise `<dataPath>/modules`:
docs/MODULES.md:17:DEVHUB_PREMIUM_DIR=/path/to/modules   # contains one subdirectory per module
docs/MODULES.md:121:`test/fixtures/premium/placeholder` is an empty module that only registers itself; `test/fixtures/premium/with-mode` brings a mode. Load it with `DEVHUB_PREMIUM_DIR=$PWD/test/fixtu …
electron/main.js:489:    DEVORBIT_DATA_PATH: dataPath, // Pass userData path to server for persistent storage
public/devorbit-vite-plugin.js:24:  if (window.__DEVORBIT_LOGGER__) return;
public/devorbit-vite-plugin.js:25:  window.__DEVORBIT_LOGGER__ = true;
public/iframe-logger.js:19:  if (window.__DEVORBIT_LOGGER__) return;
public/iframe-logger.js:29:  window.__DEVORBIT_LOGGER__ = true;
scripts/docker-release-smoke.sh:15:export DEVHUB_VERSION=$V DEVORBIT_PORT=3999 DEVORBIT_PROJECTS_DIR="$D/projects" COMPOSE_PROJECT_NAME=devhub-ac3
scripts/ios-e2e.sh:3:# Needs a running server with DEVORBIT_REMOTE=true and `tailscale serve` in front of it.
scripts/review/165.sh:43:echo "== Server :$SERVER_PORT and Vite :$VITE_PORT with DEVHUB_PREMIUM_DIR=$TMP/pro/dist"
scripts/review/165.sh:44:DEVHUB_PREMIUM_DIR="$TMP/pro/dist" DEVORBIT_DATA_PATH="$TMP/data" SERVER_PORT="$SERVER_PORT" \
scripts/review/165.sh:61:  ohne Modul:  Skript mit DEVHUB_PREMIUM_DIR=/nonexistent im Server-Aufruf, /workflows -> /dashboard
scripts/review/181.sh:18:SERVER_PORT=$SERVER_PORT DEVORBIT_DATA_PATH="$TMP/data" node server/index.js >"$TMP/server.log" 2>&1 & PIDS+=($!)
scripts/review/188.sh:31:DEVORBIT_REMOTE=true SERVER_PORT=$SERVER_PORT node server/index.js >/tmp/review-188-server.log 2>&1 &
scripts/review/190.sh:24:DEVORBIT_DATA_PATH="$DATA_DIR" SERVER_PORT=$SERVER_PORT node server/index.js >"$DATA_DIR/server.log" 2>&1 &
server/index.js:1284:  const url = process.env.DEVORBIT_REMOTE_URL || (dnsName ? `https://${dnsName}` : null);
server/services/agentService.js:165: * DEVORBIT_AGENTS_ALLOW_UNSAFE_FLAGS=true - never on the say-so of a client request.
server/services/agentService.js:176:  return process.env.DEVORBIT_AGENTS_ALLOW_UNSAFE_FLAGS === 'true';
server/services/agentService.js:584: *   server-side opt-in DEVORBIT_AGENTS_ALLOW_UNSAFE_FLAGS=true
server/services/agentService.js:603:      `Option(s) ${requested.join(', ')} are disabled on this server. Start it with DEVORBIT_AGENTS_ALLOW_UNSAFE_FLAGS=true to enable them.`
server/services/dataPath.js:22: * 1. DEVORBIT_DATA_PATH env var (set by Electron main process)
server/services/dataPath.js:29:  if (process.env.DEVORBIT_DATA_PATH) {
server/services/dataPath.js:30:    return process.env.DEVORBIT_DATA_PATH;
server/services/moduleLoader.js:32: * Directory modules are loaded from: DEVHUB_PREMIUM_DIR, else <dataPath>/modules.
server/services/moduleLoader.js:36:  return process.env.DEVHUB_PREMIUM_DIR || path.join(getDataPath(), 'modules');
server/services/remoteAccess.js:4: * Opt-in via DEVORBIT_REMOTE=true. The server is then meant to be reached through
server/services/remoteAccess.js:19:export const isRemoteEnabled = () => process.env.DEVORBIT_REMOTE === 'true';
server/services/usageService.js:80:    ...parseCodexHomes(env.DEVORBIT_CODEX_HOMES || 'Codex A=~/.codex,Codex B=~/.codex-b'),
test/agentService.test.js:210:    ).toThrow(/DEVORBIT_AGENTS_ALLOW_UNSAFE_FLAGS/);
test/boardPollRoute.test.js:39:        DEVORBIT_DATA_PATH: dataDir,
test/boardPollRoute.test.js:40:        DEVHUB_PREMIUM_DIR: modulesDir,
test/claudeConfigDir.test.js:25:      DEVORBIT_DATA_PATH: dataDir,
test/claudeConfigDir.test.js:179:    vi.stubEnv('DEVORBIT_DATA_PATH', dataDir);
test/fileOpenRoutes.test.js:136:    process.env.DEVORBIT_DATA_PATH = dataDir;
test/fileOpenRoutes.test.js:137:    process.env.DEVORBIT_REMOTE = 'true';
test/fileOpenRoutes.test.js:147:      delete process.env.DEVORBIT_REMOTE;
test/fileOpenRoutes.test.js:148:      delete process.env.DEVORBIT_DATA_PATH;
test/linkTargetSetting.test.js:11:  vi.stubEnv('DEVORBIT_DATA_PATH', dataDir);
test/moduleLoader.test.js:114:  const saved = process.env.DEVHUB_PREMIUM_DIR;
test/moduleLoader.test.js:115:  beforeEach(() => delete process.env.DEVHUB_PREMIUM_DIR);
test/moduleLoader.test.js:117:    if (saved === undefined) delete process.env.DEVHUB_PREMIUM_DIR;
test/moduleLoader.test.js:118:    else process.env.DEVHUB_PREMIUM_DIR = saved;
test/moduleLoader.test.js:121:  it('uses DEVHUB_PREMIUM_DIR, else <dataPath>/modules', () => {
test/moduleLoader.test.js:123:    process.env.DEVHUB_PREMIUM_DIR = '/x/y';
test/remoteAccess.test.js:39:  process.env.DEVORBIT_DATA_PATH = dataDir;
test/remoteAccess.test.js:40:  process.env.DEVORBIT_REMOTE = 'true';
test/remoteAccess.test.js:45:  delete process.env.DEVORBIT_REMOTE;
test/remoteAccess.test.js:46:  delete process.env.DEVORBIT_DATA_PATH;
test/remoteAccess.test.js:102:    delete process.env.DEVORBIT_REMOTE;
types.ts:326:  /** Unsafe dispatch flags need DEVORBIT_AGENTS_ALLOW_UNSAFE_FLAGS=true on the server */
vite.config.ts:24:      host: env.DEVORBIT_REMOTE === 'true' ? '127.0.0.1' : '0.0.0.0',
```

## localStorage-/Server-UI-Schlüssel (devOrbit*, devorbit-*, devorbit.\*)

```
TASK.md:136:  - Persist `selectedAppId` to localStorage key `devorbit-last-selected-app`
TASK.md:489:  - Solution: Close-Button in der Agents-Leiste außerhalb von `/agents`. `attach` öffnet `/agents`, wenn die Ansicht nicht aktiv ist. Die Route (`devOrbitContextRoute`) gehört jetzt zu den …
components/AgentsView/AgentSummaryBar.tsx:156:export const CHIPS_OPEN_KEY = 'devOrbitAgentFilterChipsOpen';
components/AgentsView/AgentsView.tsx:144:const DISPATCH_CWD_STORAGE_KEY = 'devOrbitAgentDispatchCwd';
components/AgentsView/AgentsView.tsx:145:const SORT_STORAGE_KEY = 'devOrbitAgentSort';
components/AgentsView/AgentsView.tsx:146:const REMOTE_STORAGE_KEY = 'devOrbitAgentRemote';
components/AgentsView/ProjectsRail.tsx:36:const PROJECTS_COLLAPSED_KEY = 'devOrbitAgentProjectsCollapsed';
components/BoardView/BoardGrid.tsx:21:const FOLD_KEY = 'devOrbitBoardColumns';
components/BoardView/BoardView.tsx:42:const VIEW_KEY = 'devOrbitBoardView';
components/BoardView/IssueCreateModal.tsx:20:const LAST_REPO_KEY = 'devOrbitLastIssueRepo';
components/CodingView/WebIDEPanel.tsx:284:      return localStorage.getItem('devorbit-copilot-info-dismissed') === 'true';
components/CodingView/WebIDEPanel.tsx:293:      localStorage.setItem('devorbit-copilot-info-dismissed', 'true');
components/ContextDialog.tsx:23:export const CONTEXT_DIALOG_SIZE_KEY = 'devOrbitContextDialogSize';
components/ContextDialog.tsx:24:export const CONTEXT_DIALOG_COLLAPSED_KEY = 'devOrbitContextDialogCollapsed';
components/ContextTabs.tsx:7:const GROUP_KEY = 'devOrbitContextTabsGrouped';
hooks/useAgentWorkspace.ts:19:export const STORAGE_KEY = 'devOrbitAgentWorkspace.v2';
hooks/useAgentWorkspace.ts:21:export const LEGACY_STORAGE_KEY = 'devOrbitAgentWorkspace';
hooks/useApps.ts:5:const LOCALSTORAGE_MIGRATED_KEY = 'devOrbitMigratedToBackend';
hooks/useApps.ts:17:  const favorites = JSON.parse(localStorage.getItem('devOrbitFavorites') || '[]');
hooks/useApps.ts:18:  const archived = JSON.parse(localStorage.getItem('devOrbitArchived') || '[]');
hooks/useApps.ts:19:  const customPorts = JSON.parse(localStorage.getItem('devOrbitPorts') || '{}');
hooks/useApps.ts:20:  const customNames = JSON.parse(localStorage.getItem('devOrbitNames') || '{}');
hooks/useApps.ts:41:  localStorage.removeItem('devOrbitFavorites');
hooks/useApps.ts:42:  localStorage.removeItem('devOrbitArchived');
hooks/useApps.ts:43:  localStorage.removeItem('devOrbitPorts');
hooks/useApps.ts:44:  localStorage.removeItem('devOrbitNames');
hooks/useProjectContexts.ts:14:export const ROUTE_KEY = 'devOrbitContextRoute';
hooks/useProjectContexts.ts:18:const MARKER_KEY = 'devOrbitContextId';
hooks/useRailPreferences.ts:8:export const STORAGE_KEY = 'devOrbitAgentRail.v1';
server/index.js:1847:    'devOrbitAgentWorkspace.v2': contextUiValue,
server/index.js:1848:    devOrbitAgentWorkspace: contextUiValue,
server/index.js:1849:    'devOrbitAgentRail.v1': contextUiValue,
server/index.js:1850:    devOrbitContextRoute: contextUiValue,
server/index.js:1851:    devOrbitShellBrowser: contextUiValue,
test/BoardGrid.test.tsx:56:  beforeEach(() => localStorage.removeItem('devOrbitBoardColumns'));
test/projectContexts.test.js:35:    const ui = { 'devOrbitAgentWorkspace.v2': '{"tabs":[1]}' };
test/projectContexts.test.js:56:    const ui = { 'devOrbitAgentRail.v1': 'rail' };
test/railPreferences.test.tsx:118:    localStorage.removeItem('devOrbitAgentRail.v1');
test/railPreferences.test.tsx:128:    localStorage.removeItem('devOrbitAgentRail.v1');
test/railPreferences.test.tsx:141:    localStorage.removeItem('devOrbitAgentRail.v1');
test/railPreferences.test.tsx:148:    expect(JSON.parse(localStorage.getItem('devOrbitAgentRail.v1')!).expandedSessions).toEqual([
test/railPreferences.test.tsx:154:    localStorage.removeItem('devOrbitAgentRail.v1');
test/railPreferences.test.tsx:170:      localStorage.removeItem('devOrbitAgentRail.v1');
test/railPreferences.test.tsx:197:    localStorage.removeItem('devOrbitAgentRail.v1');
test/useProjectContexts.test.tsx:16:const WORKSPACE = 'devOrbitAgentWorkspace.v2';
test/useProjectContexts.test.tsx:17:const RAIL = 'devOrbitAgentRail.v1';
test/useProjectContexts.test.tsx:39:    expect(localStorage.getItem('devOrbitContextId')).toBe('all');
test/useProjectContexts.test.tsx:43:    localStorage.setItem('devOrbitContextId', 'epic');
test/useProjectContexts.test.tsx:58:    expect(localStorage.getItem('devOrbitContextId')).toBe('all');
utils/links.ts:33:export const SHELL_BROWSER_KEY = 'devOrbitShellBrowser';
utils/remoteClient.ts:15:const STORAGE_KEY = 'devorbit.pairing';
```

## Datenordner/-dateien (devorbit-data, devorbit-rate-limits.json)

```
IMPLEMENTATION_PLAN.md:203:  - devorbit-data:/app/data
docker-compose.yml:47:      - devorbit-data:/app/data
docker-compose.yml:163:  devorbit-data:
docker-compose.yml:164:    name: devorbit-data
docker/docker-compose.release.yml:29:      - devorbit-data:/app/data
docker/docker-compose.release.yml:85:  devorbit-data:
scripts/claude-rate-limits-tap.sh:10:  target="$dir/devorbit-rate-limits.json"
scripts/review/184.sh:31:if [ ! -f "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/devorbit-rate-limits.json" ]; then
server/services/usageService.js:67:      limitsFile: path.join(claudeDir, 'devorbit-rate-limits.json'),
test/usageService.test.js:28:    limitsFile: path.join(FIX, 'claude', 'devorbit-rate-limits.json'),
test/usageService.test.js:372:    const snap = JSON.parse(fs.readFileSync(path.join(dir, 'devorbit-rate-limits.json'), 'utf8'));
test/usageService.test.js:375:    expect(fs.readdirSync(dir)).toEqual(['devorbit-rate-limits.json']); // no tmp leftovers
```

## Bundle-/App-IDs (com.devorbit.dashboard, de.martinilabs.devorbit)

```
capacitor.config.json:2:  "appId": "de.martinilabs.devorbit",
electron-builder.json:2:  "appId": "com.devorbit.dashboard",
ios/App/App.xcodeproj/project.pbxproj:406:				PRODUCT_BUNDLE_IDENTIFIER = de.martinilabs.devorbit;
ios/App/App.xcodeproj/project.pbxproj:427:				PRODUCT_BUNDLE_IDENTIFIER = de.martinilabs.devorbit;
ios/App/App.xcodeproj/project.pbxproj:442:				PRODUCT_BUNDLE_IDENTIFIER = de.martinilabs.devorbit.uitests;
ios/App/App.xcodeproj/project.pbxproj:458:				PRODUCT_BUNDLE_IDENTIFIER = de.martinilabs.devorbit.uitests;
ios/App/App/Info.plist:29:			<string>de.martinilabs.devorbit</string>
scripts/ios-e2e.sh:22:xcrun simctl terminate "$UDID" de.martinilabs.devorbit 2>/dev/null || true
scripts/ios-e2e.sh:23:xcrun simctl uninstall "$UDID" de.martinilabs.devorbit
```

## URL-Schema devorbit:// (gekoppelte iPhones, QR-Links)

```
DESKTOP.md:300:- [ ] Deep linking (`devorbit://` protocol)
README.md:111:**2. Koppeln:** Admin Panel → „iOS-App“ zeigt Adresse, Token, den Link `devorbit://pair?…` und denselben Link als QR-Code. QR-Code mit der Kamera-App scannen, den Link auf iPhone/iPad öf …
components/RemotePairingSection.tsx:26:  // The iPhone camera opens devorbit:// links from a QR code straight in the app.
electron/README.md:166:4. **Deep Linking**: Handle `devorbit://` protocol URLs
index.tsx:25:// iOS app: deep links pair the device (devorbit://pair?…) or open a view (devorbit://open?path=…).
index.tsx:34:  // Any app can open a devorbit:// link, so a pairing is only applied after the user confirms the host.
ios/App/App/Info.plist:32:				<string>devorbit</string>
ios/App/AppUITests/PairingFlowTests.swift:5:/// PAIR_LINK (devorbit://pair?…), TERMINAL_PATH (app route with a shell terminal),
ios/App/AppUITests/PairingFlowTests.swift:38:        open("devorbit://open?path=/board")
ios/App/AppUITests/PairingFlowTests.swift:43:            open("devorbit://open?path=\(path)")
ios/App/AppUITests/PairingFlowTests.swift:64:            open("devorbit://open?path=%2Fagents%3Fattach%3D\(agent)")
scripts/ios-e2e.sh:26:TEST_RUNNER_PAIR_LINK="devorbit://pair?url=$(enc "$REMOTE")&token=$TOKEN" \
server/services/remoteAccess.js:110:  return `devorbit://pair?${params.toString()}`;
test/RemotePairingSection.test.tsx:5:const LINK = 'devorbit://pair?url=https%3A%2F%2Fmac.tail1.ts.net&token=abc';
test/remoteAccess.test.js:123:    expect(link.protocol).toBe('devorbit:');
utils/remoteClient.test.ts:33:    const link = `devorbit://pair?url=${encodeURIComponent(PAIRING.url)}&token=secret`;
utils/remoteClient.test.ts:37:    expect(parsePairingLink('devorbit://pair?url=https://mac')).toBeNull();
utils/remoteClient.test.ts:41:    expect(parseOpenLink('devorbit://open?path=/agents')).toBe('/agents');
utils/remoteClient.test.ts:42:    expect(parseOpenLink('devorbit://open?path=//evil.example')).toBeNull();
utils/remoteClient.test.ts:43:    expect(parseOpenLink('devorbit://open?path=https://evil.example')).toBeNull();
utils/remoteClient.ts:32:/** `devorbit://pair?url=…&token=…` → pairing; anything else → null. */
utils/remoteClient.ts:36:    if (url.protocol !== 'devorbit:' || url.host !== 'pair') return null;
utils/remoteClient.ts:45:/** `devorbit://open?path=/agents` → `/agents`; only app-internal paths. */
utils/remoteClient.ts:49:    if (url.protocol !== 'devorbit:' || url.host !== 'open') return null;
```

## Header X-DevOrbit-Token (gekoppelte Clients)

```
components/PairingScreen.tsx:21:        headers: { 'X-DevOrbit-Token': token.trim() },
server/services/remoteAccess.js:7: * `X-DevOrbit-Token` header or `token` query param (EventSource/WebSocket cannot set headers).
server/services/remoteAccess.js:89:  const header = req.headers['x-devorbit-token'];
test/remoteAccess.test.js:71:    const res = await get('/api/ping', { ...REMOTE, 'X-DevOrbit-Token': 'wrong' });
test/remoteAccess.test.js:77:    expect((await get('/api/ping', { ...REMOTE, 'X-DevOrbit-Token': token })).status).toBe(200);
utils/remoteClient.test.ts:98:    expect(new Headers(calls[0][1]?.headers).get('X-DevOrbit-Token')).toBe('secret');
utils/remoteClient.ts:126:    headers.set('X-DevOrbit-Token', pairing.token);
```

## postMessage-Typen, MIME, Vite-Plugin in Nutzerprojekten (devorbit-console/-network, x-devorbit-\*, devorbit-vite-plugin)

```
README.md:232:- All communication goes through the internal Docker network `devorbit-network`
components/AgentsView/AgentList.tsx:57:export const RAIL_GROUP_MIME = 'application/x-devorbit-rail-group';
components/CodingView/BrowserPreviewPanel.tsx:162:      if (event.data?.type === 'devorbit-console') {
components/CodingView/BrowserPreviewPanel.tsx:178:      else if (event.data?.type === 'devorbit-network') {
docker-compose.yml:15:      - devorbit-network
docker-compose.yml:77:      - devorbit-network
docker-compose.yml:99:      - devorbit-network
docker-compose.yml:116:      - devorbit-network
docker-compose.yml:143:      - devorbit-network
docker-compose.yml:175:  devorbit-network:
docker-compose.yml:176:    name: devorbit-network
docker/docker-compose.release.yml:16:      - devorbit-network
docker/docker-compose.release.yml:47:      - devorbit-network
docker/docker-compose.release.yml:60:      - devorbit-network
docker/docker-compose.release.yml:74:      - devorbit-network
docker/docker-compose.release.yml:91:  devorbit-network:
docs/CODE_SERVER_IMPLEMENTATION.md:92:- Internal Docker network communication only (`devorbit-network`)
public/devorbit-vite-plugin.js:6: * import { devorbitPlugin } from './node_modules/devorbit-vite-plugin.js';
public/devorbit-vite-plugin.js:10: *   plugins: [devorbitPlugin(), react()],
public/devorbit-vite-plugin.js:14:export function devorbitPlugin() {
public/devorbit-vite-plugin.js:16:    name: 'devorbit-logger',
public/devorbit-vite-plugin.js:49:          type: 'devorbit-console',
public/devorbit-vite-plugin.js:61:      type: 'devorbit-console',
public/devorbit-vite-plugin.js:75:        type: 'devorbit-network',
public/devorbit-vite-plugin.js:85:        type: 'devorbit-network',
public/iframe-logger.js:112:        type: 'devorbit-console',
public/iframe-logger.js:128:      type: 'devorbit-console',
public/iframe-logger.js:142:      type: 'devorbit-console',
public/iframe-logger.js:177:            type: 'devorbit-network',
public/iframe-logger.js:189:            type: 'devorbit-network',
public/iframe-logger.js:207:    this._devorbit = {
public/iframe-logger.js:217:    if (xhr._devorbit) {
public/iframe-logger.js:218:      xhr._devorbit.startTime = Date.now();
public/iframe-logger.js:222:      if (xhr._devorbit) {
public/iframe-logger.js:224:          type: 'devorbit-network',
public/iframe-logger.js:225:          method: xhr._devorbit.method,
public/iframe-logger.js:226:          url: xhr._devorbit.url,
public/iframe-logger.js:229:          duration: Date.now() - xhr._devorbit.startTime,
public/iframe-logger.js:230:          timestamp: xhr._devorbit.startTime,
utils/agentWorkspace.ts:2:export const AGENT_TAB_MIME = 'application/x-devorbit-agent-tab';
```

## Docker/DB/Infra (Netz, Volumes, Container, DB devorbit, ghcr devhub-\*, Tunnel)

```
.github/workflows/release.yml:94:          images: ghcr.io/hpmartini/devhub-${{ matrix.image }}
IMPLEMENTATION_PLAN.md:292:docker compose logs -f devorbit
README.md:138:Every [release](https://github.com/hpmartini/Orkumo/releases) ships the desktop installers (`.dmg`, `.AppImage`, `.deb`, `.rpm`, see [DESKTOP.md](DESKTOP.md)) and multi-arch images (`ghc …
README.md:393:cloudflared tunnel create devorbit-code
README.md:394:cloudflared tunnel route dns devorbit-code code.yourdomain.com
README.md:406:cloudflared tunnel run devorbit-code
docker-compose.dev.yml:25:      - POSTGRES_DB=devorbit
docker-compose.dev.yml:30:      test: ["CMD-SHELL", "pg_isready -U postgres -d devorbit"]
docker-compose.dev.yml:54:    name: devorbit-postgres-dev
docker-compose.dev.yml:56:    name: devorbit-redis-dev
docker-compose.yml:49:      - devorbit-sessions:/app/sessions
docker-compose.yml:55:      - DATABASE_URL=postgres://postgres:${POSTGRES_PASSWORD:-postgres}@db:5432/devorbit
docker-compose.yml:95:      - POSTGRES_DB=devorbit
docker-compose.yml:102:      test: ["CMD-SHELL", "pg_isready -U postgres -d devorbit"]
docker-compose.yml:129:    container_name: devorbit-code-server
docker-compose.yml:165:  devorbit-sessions:
docker-compose.yml:166:    name: devorbit-sessions
docker-compose.yml:168:    name: devorbit-postgres
docker-compose.yml:170:    name: devorbit-redis
docker-compose.yml:172:    name: devorbit-code-server-config
docker/docker-compose.release.yml:30:      - devorbit-sessions:/app/sessions
docker/docker-compose.release.yml:35:      - DATABASE_URL=postgres://postgres:${POSTGRES_PASSWORD:-postgres}@db:5432/devorbit
docker/docker-compose.release.yml:56:      - POSTGRES_DB=devorbit
docker/docker-compose.release.yml:63:      test: ["CMD-SHELL", "pg_isready -U postgres -d devorbit"]
docker/docker-compose.release.yml:86:  devorbit-sessions:
docker/init-db.sql:156:-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO devorbit_user;
docker/init-db.sql:157:-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO devorbit_user;
docs/CODE_SERVER_IMPLEMENTATION.md:429:   docker stats devorbit-code-server
docs/CODE_SERVER_IMPLEMENTATION.md:496:   docker exec devorbit-code-server curl -I https://marketplace.visualstudio.com
scripts/docker-release-smoke.sh:8:docker build -q -f "$WT/Dockerfile.api" -t "ghcr.io/hpmartini/devhub-api:$V" "$WT" || exit 1
scripts/docker-release-smoke.sh:9:docker build -q -f "$WT/Dockerfile.frontend" -t "ghcr.io/hpmartini/devhub-frontend:$V" "$WT" || exit 1
scripts/review/190.sh:11:DATA_DIR="$(mktemp -d "${TMPDIR:-/tmp}/devorbit-190-XXXX")"
server/db/index.js:17:  const database = process.env.DB_NAME || 'devorbit';
```

## Interne Port-/CLI-Namen (PORTS.devhub, --devorbit-server-port)

```
TASK.md:468:  - Solution: `PORTS.devhub`/`PORTS.server` in `config/defaults.{js,ts}` auf 3098/3099 (wie Docker); `vite.config.ts` nutzt `PORTS` statt eigener Literale. `appStart` (Startport verwaltete …
config/defaults.js:16:  devhub: 3098,
config/defaults.ts:13:  devhub: 3098,
electron/main.js:45:const VITE_PORT = parseInt(process.env.VITE_PORT || String(PORTS.devhub), 10);
electron/main.js:70:      additionalArguments: [`--devorbit-server-port=${SERVER_PORT}`],
electron/preload.js:13:const serverPortArg = process.argv.find((arg) => arg.startsWith('--devorbit-server-port='));
scripts/wait-for-vite.js:20:const port = parseInt(process.env.VITE_PORT || String(PORTS.devhub), 10);
vite.config.ts:11:  const VITE_PORT = parseInt(env.VITE_PORT || String(PORTS.devhub), 10);
```

## Bekannte schwache Passwörter (alter Default devOrbit123 bleibt gesperrt)

```
IMPLEMENTATION_PLAN.md:683:      - PASSWORD=devOrbit123
README.md:215:  - Use weak passwords (e.g., "password123", "devOrbit123")
scripts/validate-code-server-password.sh:81:WEAK_PASSWORDS=("password" "password123" "devOrbit" "devOrbit123" "admin" "admin123" "12345678" "qwerty")
```
