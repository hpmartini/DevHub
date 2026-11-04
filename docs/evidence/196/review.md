# Review #196 Umbenennung Orkumo

Basis `origin/main`, HEAD `ecb4746` (enthält `docs/evidence/196/ac1-restliste.md`). Kein PR offen.

## Funde

### blocker

- `electron/constants.js:14-15` (+ `test/electronUserData.test.js:8`): `legacyUserDataDir(true)` = `DevOrbitDashboard` ist falsch. Gepackte App hatte nie diesen userData-Ordner: `/Applications/DevOrbitDashboard.app/Contents/Resources/app.asar` enthält `"name": "devorbit-dashboard"`, `productName` 0 Treffer (electron-builder schreibt `productName` nicht in die package.json). Real existiert nur `~/Library/Application Support/devorbit-dashboard` (mit `data/settings.json`, Local Storage, IndexedDB); `.../DevOrbitDashboard` existiert nicht. Nach dem Update startet die Desktop-App leer = genau der Guardrail-Fall "alle Desktop-Daten scheinbar weg". Test zementiert den falschen Wert. Vorschlag: immer `devorbit-dashboard` pinnen (oder ersten existierenden aus `['devorbit-dashboard','DevOrbitDashboard']`), Test auf realen asar-Namen ausrichten, `electron-builder --dir`-Lauf mit geloggtem `app.getPath('userData')` als Nachweis.

### major

- `scripts/rename-local-dir.sh` (gesamt): Orkumos eigene Settings hängen am Pfad. Projekt-IDs = sha256(Pfad) (`server/services/scannerService.js:14`); reale `settings.json` enthält 5x `PROJECTS/DevOrbitDashboard...` plus daraus abgeleitete IDs (Kontexte, Favoriten, Archiv, Ports). Nach dem Ordner-Umzug sind diese Einträge verwaist (Job: "Lokale Daten überstehen den Wechsel ohne Verlust"). Vorschlag: im Skript (oder einmalig beim Serverstart) `buildIdRemap`/`rewriteSettingsText` aus `server/services/directoryMigration.js` mit Paar `[~/PROJECTS/DevOrbitDashboard, ~/PROJECTS/Orkumo]` anwenden, Backup vorher (Muster existiert dort).
- AC-5-Nachweis fehlt: kein `electron-builder --dir`-Build mit Pfad im Log; vorhandener Test prüft nur Konstante und Reihenfolge in main.js.

### minor

- `scripts/rename-local-dir.sh:27`: lsof-Fehler wird mit `2>/dev/null || true` geschluckt; scheitert lsof, ist der Busy-Schutz stumm aus. Vorschlag: Exitcode prüfen, ohne lsof abbrechen.
- `scripts/rename-local-dir.sh:27-28`: Aufruf aus dem Ordner heraus (Usage-Zeile legt relativen Aufruf nahe) bricht immer ab, weil Eltern-Shell und lsof selbst cwd im Ordner haben. Usage ergänzen: von außerhalb aufrufen (z. B. aus `~`).
- `scripts/rename-local-dir.sh:52`: ohne origin-Eintrag bricht `set -e` nach dem Verschieben ab (Claude-/Magos-Schritte fehlen); zweiter Lauf heilt es, trotzdem tolerieren.
- `scripts/rename-local-dir.sh:61`: Glob `$old_key-*` nimmt auch Geschwister wie `~/PROJECTS/DevOrbitDashboard-foo` mit; real aktuell nur Worktree-Ordner (geprüft). Härtung: `"$old_key"--*`.
- `release.yml:94` / `docker/docker-compose.release.yml`: GHCR-Images bleiben `devhub-*`, obwohl der Release-Workflow sie baut (Vertrag: dann umbenennen). Beibehalten vertretbar (bestehende Compose-Nutzer), muss als Annahme im PR stehen.
- Auto-Update bestehender Installationen: `app-update.yml` alter Builds zeigt auf `hpmartini/DevHub`, funktioniert nur über die Repo-Umleitung; Squirrel.Mac ersetzt Inhalt von `DevOrbitDashboard.app`, Bundle-Ordner behält alten Namen. Vor Rename nicht prüfbar; im PR als Annahme/Testschritt nennen.

### nit

- `electron/README.md:128`: "Orkumo Dashboard.app" (mit Backslash-Escape) statt `Orkumo.app`.
- `utils/remoteClient.ts:2`: "a Orkumo server" statt "an Orkumo server".
- `TASK.md:446,466`: historische Einträge auf `/Applications/Orkumo.app` umgeschrieben (damals DevOrbitDashboard.app).
- `public/iframe-logger.js`: Prettier-Umformatierung ohne Rename-Bezug (Message-Typen `devorbit-console/-network` unverändert, geprüft).
- `docs/evidence/196/ac1-restliste.md`: Befehl weicht vom Vertrag ab (zusätzlich `docs/landing-evidence` ausgeschlossen); begründet, im PR erwähnen.

Ohne Befund geprüft: entfernte Zeilen enthalten keine persistierten Bezeichner (localStorage-Keys, `DEVORBIT_*`/`DEVHUB_*`, `devorbit-data`, `devorbit-rate-limits.json`, appIds, URL-Schema devorbit, Header X-DevOrbit-Token, Docker-Namen); keine privaten Pfade/Secrets im Diff; `scripts/review/179.sh` nur Kommentar; `publish.repo`, Menü-Links, `fix-node-pty-binaries.cjs` (`Orkumo.app`) konsistent; Magos-Eintrag (Zeile 34) wird vom Skript getroffen.

## AC

| AC   | erfüllt?                      | Nachweis (Befehl, Ergebnis)                                                                                                                                                                                                                        |
| ---- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | ja (Code), PR-Restliste offen | Restgrep laut Vertrag: Treffer nur technisch/persistiert bzw. historisches Lighthouse-JSON; Restliste committet, PR fehlt                                                                                                                          |
| AC-2 | ja                            | `bunx vitest run` 75 Dateien / 814 Tests grün; `bun run lint` 0 Fehler, 47 Warnungen; `vite build` (outDir /tmp) grün                                                                                                                              |
| AC-3 | Code ja, nicht selbst geprüft | `index.html` title + `APP_NAME`='Orkumo'; Screenshots in `docs/evidence/196/`; kein Playwright-Lauf (keine Server gestartet)                                                                                                                       |
| AC-4 | ja                            | keine localStorage-Keys in entfernten Zeilen; Screenshot `board-localstorage.png`, Lauf nicht wiederholt                                                                                                                                           |
| AC-5 | **nein**                      | userData-Pin für gepackte App zeigt auf nicht existierenden Ordner `DevOrbitDashboard` (blocker); `electron-builder --dir`-Nachweis fehlt                                                                                                          |
| AC-6 | noch nicht prüfbar            | curl auf alte Repo-URL = 200, kein Redirect; Rename laut Reihenfolge nach PR                                                                                                                                                                       |
| AC-7 | noch nicht prüfbar            | Pages `/Orkumo/` = 404, `/DevHub/` = 200; Pages-Branch nicht im Diff; Build-Quelle `landing/` auf `/Orkumo/` umgestellt                                                                                                                            |
| AC-8 | ja                            | `electron-builder.json` publish.repo=Orkumo, `electron/main.js` Links Orkumo; `release.yml` ohne Repo-URL (nur `devhub-*`-Images, s. minor)                                                                                                        |
| AC-9 | ja (mit minor)                | `bash scripts/rename-local-dir.test.sh` = PASS inkl. Worktree-Liste; `--dry-run` gegen echten Ordner: Busy-PIDs, Verschieben, Worktree-Reparatur inkl. externer Worktrees, Remote-URL, ca. 50 Claude-Projektordner, Magos-Ersetzung; nichts bewegt |

Nicht geprüft: Playwright/DOM-Volltextsuche (AC-3), Inhalt des Pages-Branch, Auto-Update über Redirect, App-Verhalten nach echtem Ordner-Umzug.

## Behebung (nach dem Review)

| Fund                                    | Stand                                                                                                                                                                                          |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| blocker userData                        | `electron/constants.js` `LEGACY_USER_DATA_DIR = 'devorbit-dashboard'`, Pin in `electron/main.js` für dev und gepackt; Test angepasst; AC-5 per `electron-builder --dir`-Lauf belegt (siehe PR) |
| major Settings verwaist                 | `scripts/remap-project-path.mjs` (nutzt `buildIdRemap`/`rewriteSettingsText`, Backup `.bak-<stamp>`), von `rename-local-dir.sh` aufgerufen; Selbsttest prüft neue ID, neuen Pfad, Backup       |
| major AC-5                              | siehe blocker                                                                                                                                                                                  |
| minor lsof                              | ohne lsof oder bei leerer Ausgabe Abbruch                                                                                                                                                      |
| minor Aufruf aus dem Ordner             | Usage nennt `cd ~`, Busy-Meldung ebenso                                                                                                                                                        |
| minor ohne origin                       | toleriert                                                                                                                                                                                      |
| minor Glob                              | `"$old_key"--*`, Selbsttest prüft Geschwisterordner                                                                                                                                            |
| minor GHCR, Auto-Update                 | als Annahme im PR                                                                                                                                                                              |
| nit README, remoteClient                | behoben                                                                                                                                                                                        |
| nit TASK.md, iframe-logger, AC-1-Befehl | als Annahme im PR                                                                                                                                                                              |
