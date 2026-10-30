# Briefing: Agents-View – ein Projekt, eine Gruppe, GitHub-Name als Titel

Issue: https://github.com/hpmartini/DevHub/issues/96

## The Job

Im Agents-View (Gruppierung „Project“, `utils/agentSessions.ts` → `projectGroups`) erscheint jedes Git-Repo als genau eine Gruppe, egal ob die Sessions im Repo-Root, in einem Unterordner oder in einem Worktree laufen. Der Gruppentitel ist der GitHub-Repo-Name (aus `context.repo.slug`, z. B. `hpmartini/glades` → `glades`), sofern ein GitHub-Remote existiert; der lokale Verzeichnisname steht dahinter in Klammern, wenn er abweicht (`glades (MindHekker)`). Ohne GitHub-Remote bleibt der Titel wie heute.

## Why

Hape steuert viele parallele Agents über den Rail. Heute zerfällt MindHekker in zwei gleichnamige Gruppen, was Übersicht und Gruppen-Aktionen (Dispatch-Ziel, Favorit, Ordnung) unbrauchbar macht. Der GitHub-Name ist meist aktueller als der Ordnername und passt zu den Issue-/PR-Chips (`glades#337`), die schon den Repo-Namen zeigen.

Befund (am Live-System geprüft, 2026-10-26):

- Sessions laufen in `~/PROJECTS/MindHekker` und `~/PROJECTS/MindHekker/MindHekker_v1` (Unterordner desselben Repos, toplevel = `MindHekker`). Ohne App-Treffer wird nach `project:dir:<cwd>` gruppiert → zwei Keys, beide mit Titel `repo.name` = „MindHekker“.
- Die DevOrbit-App liegt als `~/projects/MindHekker` (Kleinschreibung) in der DB; `isUnder` vergleicht case-sensitiv, darum matcht sie nie. macOS-Dateisystem ist case-insensitiv.
- Remote: `https://github.com/hpmartini/glades.git`; App-Name aus package.json: `glades-monorepo`.

## Guardrails

- Änderung in `utils/agentSessions.ts` (pur, unit-getestet) plus nötige Felder in `types.ts`/`server/services/agentContextService.js`; Gruppen-Key muss stabil bleiben, wenn Kontexte nachladen (Kommentar in `projectGroups` beachten), weil sonst Collapse/Ordnung springen.
- Gruppieren nach Repo-Root: Server liefert dafür den Toplevel des Hauptcheckouts (bei Worktrees das Verzeichnis über dem common git-dir) im Kontext; vor dem Laden gilt der heutige pfadbasierte Fallback.
- App-Zuordnung case-insensitiv auf darwin, weil sonst die App nie greift. Gilt für `isUnder`-Nutzung in der Gruppierung; andere Aufrufer nur, wenn derselbe Fehler offensichtlich ist.
- Titel-Priorität: GitHub-Repo-Name > App-Name > Repo-Ordnername. Klammerzusatz nur bei Abweichung (case-insensitiv verglichen).
- Bestehende persistierte Gruppen-Keys (Collapse, manuelle Gruppenordnung aus „Gruppen selbst ordnen“) dürfen nach dem Update nicht verloren gehen, soweit der Key gleich bleibt; neue Keys sind ok, wenn alte Zustände sonst nur verwaist liegen.
- Annahme: „an dieser Stelle“ = Gruppenkopf im Agents-Rail. Dashboard-App-Liste, Board-Rail und Scanner-Namen bleiben unverändert (eigenes Issue, falls gewünscht).
- Annahme: Verzeichnisname in Klammern im Titel statt eigener Detailansicht; Tooltip am Titel zeigt den vollen Pfad.
- Annahme: Sortierung „Repository“ (`repoName`) nutzt weiter den Ordnernamen; nur Gruppentitel ändert sich.

## Done means

- Mit den MindHekker-Sessions (Root + `MindHekker_v1`) zeigt der Rail eine Gruppe `glades (MindHekker)`, verknüpft mit der App (Header öffnet Detailansicht).
- Neue Unit-Tests in den bestehenden `agentSessions`-Tests: Unterordner-Session + Root-Session → eine Gruppe; App-Pfad mit anderer Groß-/Kleinschreibung matcht; Titel aus Slug mit/ohne Klammer; ohne Kontext stabiler Key. `bun run test` und `bun run build` grün.
- Andere Gruppierungen (none/status/directory) unverändert.
- Rückmeldung: PR gegen main mit Review-Anleitung, Kurzbericht was getan und welche Annahmen gegriffen haben.

## First on approval

Failing Unit-Test für den MindHekker-Fall (zwei Sessions, Root + Unterordner, Kontext mit `slug: 'hpmartini/glades'`, App-Pfad kleingeschrieben) in den `agentSessions`-Tests schreiben.
