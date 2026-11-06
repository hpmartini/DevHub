# Review #195 Harness-Integration (feat/195-harness-integration, c820e82..c8c0cdc)

Verdict: **kein blocker, kein major**. Alle AC-Nachweise, die ohne UI laufen, grün.

| AC-ID | erfüllt? | Nachweis (Befehl, Ergebnis) |
|---|---|---|
| AC-1 | ja | `bun run lint` 0 errors / 48 warnings; `bunx tsc --noEmit` exit 0; `bun run test:run` 100 files / 1183 tests grün; `bun run build` ok |
| AC-2 | ja | `scripts/review/195.sh`: PUT harness=`bash`/`Codex`/`""` → 400, `codex` → 200, GET = codex, nach Server-Neustart = codex. Schema-Unit-Test in `test/harnessDispatch.test.tsx`. Route-Test nur live, nicht in vitest (s. minor) |
| AC-3 | ja | live: bash → "Invalid command"; `codex --config x`, `pi hi` → "Only a prompt after -- is allowed"; opencode mit Prompt → abgelehnt; cwd `/tmp` → outside project dirs; 0 Nachfahren-Prozesse. Unit: `test/harnessPolicy.test.js`. pty-host nutzt dieselbe `harnessArgsError`, ohne eigenen WS-Test |
| AC-4 | ja (Prozess/cwd/argv) | live: omp/opencode/codex/pi laufen, `lsof` cwd = Projektordner, argv trägt Prompt (nicht opencode). `--`-Semantik: pi `dist/cli/args.js:23` beendet Flag-Parsing bei `--`; codex (clap) ebenso; omp Binary enthält entsprechende Prüfung (nicht bis ins Detail verifiziert). "Prompt kommt als erste Nachricht an" nur via argv, Screenshot nicht prüfbar |
| AC-5 | ja | `harnessDispatch.test.tsx`: Vorbelegung, Änderung, Claude-only-Syntax (@agent, /command, Dispatch and attach) aus. TaskComposerModal reicht Props an DispatchInput durch. Default→Vorbelegung (`AgentsView.tsx:254` `pickedHarness ?? settings.dispatch.harness`, Reset in `openComposer`) nur per Code-Lesen geprüft |
| AC-6 | ja | `sessionHarness` Unit-Test; `AgentList.test.tsx` Badge per cardFields positioniert/ausgeblendet; Default-Slot `title` in types.ts + settingsService. Screenshot nicht prüfbar |
| AC-7 | ja (Host) | live mit sandbox-exec: `/api/agents/harnesses` opencode installed=false; Start → "opencode is not installed on this machine". Picker: Option disabled + "(not installed)". Docker-Modus s. minor |
| AC-8 | ja (Tests) | bestehende Tests grün; Claude-Zweig in `/api/pty` unverändert (`harnessArgs` null → alter Pfad). Screenshot nicht prüfbar |
| AC-9 | ja | live: je Harness 0 Prozesse (inkl. Kinder) nach Pane-Close. Stop-Aktion → `closeAnyPane` → WS-Close → `killPtySession` |

## Sicherheit (Vertrauensgrenze /api/pty, pty-host)

Geprüft, ohne Fund:
- Binary: nur 4 feste Namen (`Object.hasOwn` auf frozen Map, kein Prototype-Trick), Auflösung serverseitig (`config/harnesses.js:54`), kein Client-Pfad. Spawn per Argument-Array via node-pty, keine Shell.
- Args: nur `[]` oder `['--', prompt]`; jede Flag-Injection (`--config`, `-c`, `--api-key`) abgelehnt; Prompt nach `--` wird von pi/codex als Positional behandelt. Kein doppeltes `decodeURIComponent` im Harness-Pfad.
- cwd: `assertAllowedPath` mit realpath beider Seiten + Separator-Check; Traversal und Symlink nach außen werden abgefangen.
- Lage vorher: `/api/pty` ohne `command` startet schon immer eine Login-Shell; der Diff vergrößert die Angriffsfläche also nicht über das Bestehende hinaus.

## Funde

### blocker
keine

### major
keine

### minor
- `pty-host/index.js:94` – pty-host prüft für Harnesses die Args, aber nicht das cwd gegen Projektordner. Der Guardrail-Text nennt beide Seiten. Wirkung praktisch null, weil pty-host (Loopback, ohne Origin) auch eine Shell in jedem cwd startet. Es gibt auch keinen WS-Test, der zeigt, dass pty-host ablehnt.
- `server/index.js:2413` + `pty-host/index.js:119` – Docker-Modus: `installed: null`, die API prüft nicht, ob das Binary da ist, und pty-host fällt auf den bloßen Namen zurück. Fehlt das Binary auf dem Host, gibt es ein totes Terminal statt der klaren Meldung aus AC-7. Als `shortcut` kommentiert, Docker steht nicht explizit im AC.
- `config/harnesses.js:24` – `MAX_HARNESS_PROMPT = 8000` liegt über dem, was in die WS-URL passt. JSON plus `encodeURIComponent` kosten 3x (ASCII-Sonderzeichen) bis 9x (CJK). Ab etwa 5000 Zeichen überschreitet der Upgrade-Request Nodes `maxHeaderSize` (16 KB), Folge ist HTTP 431, WS-Fehler ohne Server-Meldung. Szenario: langen Issue-Text als Prompt an codex einfügen → Pane bleibt leer.
- pi/omp: Beginnt der Prompt mit `@`, gilt das ganze Argument nach `--` als Dateipfad (pi `dist/cli/args.js:25`). Szenario: Gewohnheit aus Claude, "@reviewer prüf X" → pi sucht die Datei "reviewer prüf X" und startet mit Fehler bzw. ohne Prompt. Kein Rechte-Gewinn (gleicher User, Shell ohnehin erreichbar), aber eine UX-Falle. Möglicher Fix: den Prompt mit einem Leerzeichen beginnen lassen oder im Composer warnen.
- `config/harnesses.js:64` – relative PATH-Einträge (z.B. `.`) werden nicht gefiltert. `path.join('.', 'pi')` ergibt `pi`, das prüft gegen das cwd des Servers, gespawnt wird dann per execvp aus PATH. Geprüfte und gestartete Datei können so auseinanderfallen. Lösung: nur absolute Einträge zulassen (`path.isAbsolute`).
- `components/AgentsView/AgentsView.tsx:1114` – Bilder werden vor der opencode-Prüfung hochgeladen. Bei opencode mit Bild und ohne Text wird erst hochgeladen und danach abgelehnt, die Datei bleibt verwaist.
- AC-2: Der Nachweis "Route-Test mit echtem Settings-Speicher" existiert nur als Live-Skript (`scripts/review/195-check.mjs`), nicht als vitest-Test. In CI läuft er nicht.

### nit
- `scripts/review/126/fixture-main.mjs:3-4` – Prüfskript eines fremden Issues (#126) geändert (unbenutzte Imports entfernt, `setImmediate` importiert). Verhalten bleibt gleich, gehört aber nicht in diesen Diff.
- `openInteractiveClaude` trägt jetzt alle Harnesses, der Name passt nicht mehr (Guardrail wollte Verallgemeinerung, keine Umbenennung).

## Nicht geprüft
- Screenshots (AC-4/5/6/7/8), Diff ohne Bilder.
- Ob der Prompt in der TUI tatsächlich als erste Nachricht abgeschickt wird (nur argv belegt).
- omp-Parsing von `--` nur per `strings` angedeutet, Quelltext nicht gelesen.
- Docker-/pty-host-Pfad nicht live gestartet.
- Tastaturbedienung/Badge-Lesbarkeit in kompakter Dichte (UX).
