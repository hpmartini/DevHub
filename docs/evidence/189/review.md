# Review #189 Chat-UI (black box, origin/main...HEAD)

Contract: `briefings/2026-11-03-chat-ui-mode.md`. Run myself: `bunx vitest run test/chatService.test.js utils/chatEvents.test.ts` -> 37/37 green; `bunx tsc --noEmit` -> 0 errors.

| AC-ID | erfüllt?     | Nachweis (Befehl, Ergebnis)                                                                                                                                                                                 |
| ----- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1  | ja (Beleg)   | `ac1-checks.txt`: tsc 0, lint 0 errors / 48 warnings, 989/989 tests, build ok. Lint/build/full suite selbst nicht ausgeführt (Auftrag)                                                                      |
| AC-2  | ja           | `utils/chatEvents.test.ts` 15 Tests: Delta, voller Turn, tool_use+result, Permission, result/Fehler, kaputte Events; `parseLine` überspringt Müll (chatService.test)                                        |
| AC-3  | ja           | `test/chatService.test.js` it.each: cwd außerhalb, Traversal, Metazeichen, NUL, Modell-Injection, Modus, Session-ID, resume+continue -> 400, `spawn` nie aufgerufen; Route-Check in `scripts/review/189.sh` |
| AC-4  | ja           | `ac4-markdown.png` (H2, Liste, Codeblock, Tabelle), `ac4-sse-text-deltas.jsonl`                                                                                                                             |
| AC-5  | ja           | `ac5-tool-diff.png`; Diff-Logik in chatEvents-Test                                                                                                                                                          |
| AC-6  | ja           | `ac6-permission.gif`, `ac6-1..4`; FS selbst geprüft: Sandbox hat `allowed.txt`, kein `denied.txt`                                                                                                           |
| AC-7  | ja           | `ac7-1/2/3` (streaming, interrupted, nächste Eingabe)                                                                                                                                                       |
| AC-8  | ja           | `isSubmitKey`-Tests (enter / mod+enter / IME), `ac8-settings.png`, `ac8-shift-enter.png`; Setting im Schema + Default                                                                                       |
| AC-9  | ja           | `ac9-1-attached.png`, `ac9-2-described.png`                                                                                                                                                                 |
| AC-10 | teilweise    | `ac10-resume-in-chat.png`, `ac10-terminal-resume.png`; Transkript-JSONL-Pfad fehlt noch (gehört in PR-Text)                                                                                                 |
| AC-11 | ja           | `ac11-pgrep-before/after-close.txt`, `ac11-orphan-timeout.txt` (Watcher weg -> Prozess weg), `ac11-after-reload.png`                                                                                        |
| AC-12 | ja (schwach) | 989 Tests grün; `ac12-attach-beside-chat.png` zeigt Attach-Pane nur mit Kopfzeile, kein TUI-Inhalt                                                                                                          |

## Blocker

keine

## Major

keine

## Minor

- `server/services/chatService.js:333` + `:230`: Sessions, deren Prozess selbst endet (Crash, `exit`), bleiben samt bis zu 5000 Events in `sessions`; nur `stopChat` löscht. Langlaufender Server sammelt Leichen. Fix: in `onEnd` nach kurzer Frist (oder wenn `watchers === 0`) `sessions.delete`.
- `server/services/chatService.js:342`: SIGKILL nach 3 s trifft nur `claude`, nicht dessen Kinder (MCP-Server, Bash-Tools). Hängt der CLI, bleiben Enkel verwaist. Fix: `detached: true` + `process.kill(-pid)` oder vorhandenes `tree-kill` (schon Dependency).
- `server/services/chatService.js:265`: Orphan-Timer (10 min) läuft auch während eines laufenden Turns; Handy im Standby -> langer Agent-Lauf wird mitten im Turn abgebrochen. Fix: Timer nur bei `!s.busy` scharf schalten oder bei `result` neu starten.
- `server/services/chatService.js:23,115`: `name` darf mit `-` beginnen (`--name --foo`). Commander nimmt Pflichtwerte gierig, daher vermutlich keine Injection, aber nicht getestet. Fix: `--name=${name}` oder `NAME_RE` ohne führendes `-`, plus Testfall.
- `server/services/chatService.js:167`: `pending` wird bei Interrupt / `control_cancel_request` nicht geleert; alte Allow/Deny-Karten bleiben klickbar, Antwort geht an einen toten Request. Fix: bei Cancel/Interrupt/`result` aufräumen.
- `components/AgentsView/Chat/ChatMarkdown.tsx`: Markdown-Bilder (`![](http://…)`) laden extern. Prompt-Injection aus gelesenen Dateien kann so Daten per URL abfließen lassen. Fix: `img` durch Link/Text ersetzen oder `urlTransform` auf `data:`/lokale beschränken.
- `hooks/useChatSessions.ts:38`: Chat-Liste wird nur beim Mount geladen; Chats aus einem zweiten Client/Tab erscheinen erst nach Reload (`chatEvents.emit('change')` hat keinen Abnehmer im Client).
- Begründung SDK vs. CLI direkt (Guardrail „Wahl begründen") steht im Code nicht; nur Protokoll-Kommentar in `chatService.js:1-9`. In PR-Text aufnehmen.
- AC-12-Screenshot belegt Attach schwach (leeres TUI); AC-10 JSONL-Pfad in PR-Text nachtragen.

## Nit

- `ChatMarkdown.tsx:7ff`: `{...p}` reicht react-markdowns `node`-Prop an DOM-Elemente durch (React-Warnung im Dev). Fix: `({ node, ...p })`.
- `utils/chatEvents.ts:125`: `index` aus dem Stream ungeprüft als Array-Index (riesiger Index -> dünnes Riesen-Array). CLI ist vertrauenswürdig, Obergrenze trotzdem billig.

## Sicherheits-Check (ohne Fund)

- Spawn per Argument-Array ohne Shell, `cwd` realpath + Allowlist, Modell-Regex, Session-ID UUID, Modus-Enum ohne `bypassPermissions`, Skip-Permissions nur mit `DEVORBIT_AGENTS_ALLOW_UNSAFE_FLAGS` (403).
- Routen hinter globalem `requireRemoteToken` + CORS-Allowlist; JSON-Body verhindert Form-CSRF; Chat-ID als UUID validiert; `decision` per zod-Enum.
- Markdown ohne `rehype-raw`/`dangerouslySetInnerHTML`; Standard-`urlTransform` filtert `javascript:`.
- Server-Ende: `process.on('exit', stopAllChats)`; Pane-/Tab-Schließen ruft DELETE; „Im Terminal öffnen" wartet auf Prozessende (`stopChatAndWait`).
- Guardrails „nicht anfassen" (`--bg`, attach, Agent-Liste, Board, Code-Modus, DB-Schema): im Diff unberührt.

## Nicht geprüft

- `bun run lint`, `bun run build`, volle Test-Suite (laut Auftrag nicht ausgeführt; nur Beleg gelesen).
- Laufzeitverhalten gegen echte CLI (kein Server/CLI gestartet); Commander-Verhalten bei `--name -x`.
- A11y/390-px-Ambition (nicht Teil der ACs).
