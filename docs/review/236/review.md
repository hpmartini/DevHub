# Review #236 (mw:reviewer, black-box: contract + diff)

First pass on `cd92302`. The reviewer saw only `briefings/2026-11-06-session-kopien-236.md` and the diff against `origin/main`.

| AC | Verdict (reviewer) |
|---|---|
| AC-1 | met in code; proof only via Playwright e2e, not vitest |
| AC-2 | met; same caveat |
| AC-3 | met, with a text bug (major 1); proof via e2e, not RTL |
| AC-4 | met: `test/sessionCopies.test.ts` 9/9, badge, screenshots |
| AC-5 | met; no vitest for "open twice" |
| AC-6 | met: tsc exit 0, vitest 101 files / 1172 tests |
| AC-7 | open: no PR yet |

## Findings and what happened to them

| Severity | Finding | Outcome |
|---|---|---|
| Major | The dialog said "stops that process" for every background holder. The `/resume <id>`, palette and ResumePicker paths do not stop the job, so the text promised a handover that did not happen. | **fixed**: `guardCopy(holder, run, handover)`. Only `openAgentInChat` (a job is stopped first) and chat → terminal pass `handover`. Every other path says "starts a second process … both can overwrite". RTL test checks both texts. |
| Major | AC-1/2/3/5 had no vitest/RTL proof on the open path. | **fixed**: `test/sessionOpenPath.test.tsx`. The rail decision `openPlan` (used by `activateItem`) feeds the attach URL. That URL is spawned with a real `createPtySession` against a claude stub that logs argv, and the log shows exactly `attach fa4e0236`. A second open focuses the pane. The dialog test covers Cancel (0 calls) and Create copy (1 call). |
| Minor | `utils/board.ts` matched workflow `sessionIds` only against `s.sessionId`, which after a respawn is the new transcript. | **fixed**: also matches `s.sessionIds`. |
| Minor | Copies are visible only as a badge plus tooltip; you can no longer stop or peek them from the rail. | **skipped**: the contract asks only for the marker. Follow-up if needed. |
| Minor | `getTranscriptTail` falls back to `state.sessionId` without `linkScanPath`. | **skipped**: predates this change. `linkScanPath` was present in all 194 local jobs. |
| Minor | Keyboard repeat on an interactive session without a pane could resume twice before re-render. | **skipped**: predates this change, and the background-job path in the issue is idempotent (`attach`). |
| Minor | `CLAUDE_CLI_PATH` now also pins the PTY `claude`. | **intended**: the same resolution as `resolveClaudeBinary`. Server env only. |
| Nit | Duplicate JSDoc above `pendingCopy`. | **fixed** |
