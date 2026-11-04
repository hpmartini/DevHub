#!/usr/bin/env bash
# Self-test for rename-local-dir.sh on a throwaway clone with a linked worktree and fake HOME (#196).
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
export HOME="$T/home"
mkdir -p "$HOME/PROJECTS/Magos/config"
SRC="$HOME/PROJECTS/DevOrbitDashboard"
git init -q "$SRC"
git -C "$SRC" -c user.email=t@t -c user.name=t commit -q --allow-empty -m init
git -C "$SRC" remote add origin git@github.com:hpmartini/DevHub.git
git -C "$SRC" worktree add -q "$SRC/.claude/worktrees/wt1" -b wt1
key=$(printf '%s' "$SRC" | sed 's#[/.]#-#g')
mkdir -p "$HOME/.claude/projects/$key/memory" "$HOME/.claude/projects/$key--claude-worktrees-wt1"
echo '{ "devorbitdashboard": "'"$SRC"'" }' >"$HOME/PROJECTS/Magos/config/projekt-repos.json"

"$here/rename-local-dir.sh" --dry-run
[[ -d "$SRC" ]] || { echo "FAIL: dry-run moved the folder"; exit 1; }

"$here/rename-local-dir.sh"
"$here/rename-local-dir.sh" # idempotent second run

DST="$HOME/PROJECTS/Orkumo"
nkey=$(printf '%s' "$DST" | sed 's#[/.]#-#g')
fail() { echo "FAIL: $*"; exit 1; }
[[ ! -e "$SRC" && -d "$DST" ]] || fail "folder not moved"
[[ "$(git -C "$DST" remote get-url origin)" == "git@github.com:hpmartini/Orkumo.git" ]] || fail "remote"
git -C "$DST/.claude/worktrees/wt1" status -s >/dev/null || fail "worktree broken"
git -C "$DST" worktree list | grep -q "$DST/.claude/worktrees/wt1" || fail "worktree list"
[[ -d "$HOME/.claude/projects/$nkey/memory" ]] || fail "claude memory folder"
[[ -d "$HOME/.claude/projects/$nkey--claude-worktrees-wt1" ]] || fail "claude worktree folder"
grep -q "\"$DST\"" "$HOME/PROJECTS/Magos/config/projekt-repos.json" || fail "magos mapping"
git -C "$DST" worktree list
echo "PASS rename-local-dir.sh"
