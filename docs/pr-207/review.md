# #207 Unabhängiges Review (mw:reviewer)

Der Reviewer bekam nur den Vertrag (`briefings/2026-11-05-terminal-oeffnen-207.md`) und den Diff.

## Urteil

- blocker: keiner.
- major: keiner.
- Guardrails: keine Verletzung.
- AC-3, AC-5, AC-6: belegt.
- AC-1, AC-2, AC-4: im Code belegt, der Live-Beweis kommt aus `scripts/review/207.sh`. Den durfte der Reviewer nicht ausführen; er läuft im PR unter `## Nachweise` grün.
- AC-7: offen bis zum PR. Die Medien liegen jetzt unter `docs/pr-207/`.

## Funde und was daraus wurde

| Schwere | Fund | Umgang |
|---|---|---|
| minor | `sessionId=shell-${Date.now()}` ist nicht eindeutig. Zwei Shell-Panes, die im selben Commit gemountet werden, bekommen dieselbe ID, und der Server beendet die erste. | Behoben: Die ID enthält jetzt zusätzlich einen Zufallsanteil (`AgentTerminal.tsx`, `buildShellUrl`). |
| minor | Fehlt die cwd (z. B. Worktree gelöscht), startet der Server still in `$HOME`, und das Banner nennt trotzdem den alten Ordner. | Behoben: Die `connected`-Nachricht meldet jetzt die tatsächliche cwd (eine Zeile in `server/index.js`, keine neue Route). Das Banner zeigt diese cwd und bei Abweichung eine gelbe Zeile `# <ordner> not found`. |
| minor | Die PTY-cwd-Prüfung ohne `command` kennt nur „existiert und ist ein Verzeichnis“. | Älter als dieser PR, kein neuer Weg. Nicht geändert. |
| nit | `shellCwd` akzeptiert eine nicht-numerische Nummer und relative Pfade. | Nur über manipuliertes localStorage erreichbar, harmlos. Nicht geändert. |
| nit | Die cwd geht ungefiltert in `terminal.write`. | Behoben: Steuerzeichen werden vor dem Schreiben entfernt. |
| nit | Für die Taste ContextMenu gibt es keinen eigenen Test. | Gleiche Code-Stelle wie Shift+F10 in `AgentList.tsx`, nicht geändert. |
