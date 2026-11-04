#!/usr/bin/env bash
# Moves the local checkout from ~/PROJECTS/DevOrbitDashboard to ~/PROJECTS/Orkumo (issue #196) and
# fixes everything that hangs on the path: git remote, linked worktrees, Claude Code memory/session
# folders, Magos' project mapping. Run it after the rename PR is merged, with no Claude/dev process
# inside the folder. Idempotent: a second run only repeats the fix-ups.
#
#   scripts/rename-local-dir.sh [--dry-run]
#   SRC / DST / MAGOS_REPOS override the defaults (used by the self-test on a throwaway copy).
set -euo pipefail

DRY=0
[[ "${1:-}" == "--dry-run" ]] && DRY=1
SRC="${SRC:-$HOME/PROJECTS/DevOrbitDashboard}"
DST="${DST:-$HOME/PROJECTS/Orkumo}"
MAGOS_REPOS="${MAGOS_REPOS:-$HOME/PROJECTS/Magos/config/projekt-repos.json}"
CLAUDE_PROJECTS="$HOME/.claude/projects"

run() { if ((DRY)); then echo "would: $*"; else echo "+ $*"; "$@"; fi; }
key() { printf '%s' "$1" | sed 's#[/.]#-#g'; } # Claude Code's folder key for a cwd

if [[ -d "$SRC" && -e "$DST" ]]; then echo "both $SRC and $DST exist, resolve by hand" >&2; exit 1; fi
if [[ ! -d "$SRC" && ! -d "$DST" ]]; then echo "neither $SRC nor $DST exists" >&2; exit 1; fi

if [[ -d "$SRC" ]]; then
  # A process whose cwd is inside the folder would keep working on a path that no longer exists.
  busy=$(lsof -a -d cwd -Fpn 2>/dev/null | awk -v s="$SRC" '/^p/{p=substr($0,2)} /^n/{n=substr($0,2); if (n==s || index(n, s"/")==1) print p" "n}' || true)
  busy=$(grep -v "^$$ " <<<"$busy" || true)
  if [[ -n "$busy" ]]; then
    echo "processes still work inside $SRC (pid cwd), stop them first:" >&2
    echo "$busy" >&2
    ((DRY)) || exit 1
  fi
  SRC_P=$(cd "$SRC" && pwd -P) # git reports physical paths (/private/var vs /var)
  worktrees=$(git -C "$SRC" worktree list --porcelain | awk '/^worktree /{print substr($0,10)}' | tail -n +2)
  run mv "$SRC" "$DST"
else
  SRC_P=$SRC
  worktrees=$(git -C "$DST" worktree list --porcelain | awk '/^worktree /{print substr($0,10)}' | tail -n +2)
fi

# Linked worktrees inside the folder moved along; repair needs their new paths.
repair=()
while IFS= read -r wt; do
  [[ -z "$wt" ]] && continue
  if [[ "$wt" == "$SRC_P"/* ]]; then wt="$DST${wt#"$SRC_P"}"; elif [[ "$wt" == "$SRC"/* ]]; then wt="$DST${wt#"$SRC"}"; fi
  if ((DRY)) || [[ -d "$wt" ]]; then repair+=("$wt"); fi
done <<<"$worktrees"
if ((DRY)); then echo "would: git -C $DST worktree repair ${repair[*]+"${repair[*]}"}"; else
  echo "+ git worktree repair (${#repair[@]} worktrees)"; git -C "$DST" worktree repair ${repair[@]+"${repair[@]}"}
fi

GIT_DIR_OF=$([[ -d "$DST" ]] && echo "$DST" || echo "$SRC")
url=$(git -C "$GIT_DIR_OF" remote get-url origin)
new_url=${url//hpmartini\/DevHub/hpmartini\/Orkumo}
[[ "$new_url" != "$url" ]] && run git -C "$GIT_DIR_OF" remote set-url origin "$new_url"

old_key=$(key "$SRC")
new_key=$(key "$DST")
if [[ -d "$CLAUDE_PROJECTS" ]]; then
  for d in "$CLAUDE_PROJECTS/$old_key" "$CLAUDE_PROJECTS/$old_key"-*; do
    [[ -d "$d" ]] || continue
    target="$CLAUDE_PROJECTS/$new_key${d#"$CLAUDE_PROJECTS/$old_key"}"
    if [[ -e "$target" ]]; then echo "skip: $target exists, merge $d by hand" >&2; continue; fi
    run mv "$d" "$target"
  done
fi

if [[ -f "$MAGOS_REPOS" ]] && grep -q "\"$SRC\"" "$MAGOS_REPOS"; then
  if ((DRY)); then echo "would: replace $SRC with $DST in $MAGOS_REPOS"; else
    echo "+ $MAGOS_REPOS: $SRC -> $DST"
    SRC="$SRC" DST="$DST" perl -pi -e 's/\Q"$ENV{SRC}"\E/"$ENV{DST}"/g' "$MAGOS_REPOS"
  fi
fi

echo "done. Open new Claude sessions from $DST."
