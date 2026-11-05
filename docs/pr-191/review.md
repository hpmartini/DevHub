# Review #191 (mw:reviewer, independent: contract + diff only)

Base: commit 072b5c3 against origin/main. Reviewer ran `bunx tsc --noEmit` (green) and the full `bunx vitest run` (87 files, 1008 tests, green).

| AC   | Verdict       | Note                                                                                                                                               |
| ---- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | partially met | Button, `/pulls`, `aria-pressed` OK. A second click stays on `/pulls`; the contract said `/agents`. TitleBar was replaced by ModeSwitcher in #184. |
| AC-2 | met           | 9 dimensions, free text, AND                                                                                                                       |
| AC-3 | met           | 7 clusterings, multi-agent, "No agent"                                                                                                             |
| AC-4 | met           | 5 sorts × 2 directions, default                                                                                                                    |
| AC-5 | met           | via ConnectedPullRequestsPage                                                                                                                      |
| AC-6 | met           | URL round trip, `?repo=` from popover clearable                                                                                                    |
| AC-7 | met           | popover tests unchanged and green, list shared                                                                                                     |
| AC-8 | met           | tsc + full suite                                                                                                                                   |
| AC-9 | partially met | screenshots and GIF are there; no PR existed yet at review time                                                                                    |

## Findings and handling

| Severity | Finding                                                                                   | Handling                                                                                                                                                                             |
| -------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| major    | AC-1: a second click on the active mode stays put instead of going to `/agents`           | Behavior kept: since #184 every mode stays on a second click, and a toggle only for PRs would be inconsistent. Contract AC-1 amended to match (briefing), deviation named in the PR. |
| minor    | "Reset filters" unmounts, focus falls to body                                             | Fixed: focus goes to the search field; test `toHaveFocus` added                                                                                                                      |
| minor    | "gh unavailable" notice compared the repo case-sensitively, the filter case-insensitively | Fixed: comparison is case-insensitive (`PullRequestsPanel.tsx`)                                                                                                                      |
| minor    | Misleading test name in ModeSwitcher.test.tsx                                             | Renamed                                                                                                                                                                              |
| nit      | Popover `filterPullRows` exact, page case-insensitive                                     | Not changed: the popover receives slugs only from the app itself, never typed by hand                                                                                                |

Security: no findings (URL params checked against allow-lists or compared as strings; links go through `getLinkTarget`; no new endpoint, no new dependency).
