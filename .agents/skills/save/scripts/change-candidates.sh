#!/usr/bin/env bash
# List OpenSpec change folders touched by the branch diff or local work.
# Usage: change-candidates.sh active|archive [git-ref]
set -euo pipefail

mode=${1:?expected active or archive}
ref=${2:-HEAD}
case "$mode" in active|archive) ;; *) exit 2 ;; esac

declare -A candidates=()

record_path() {
  local path=$1 key rest
  [[ $path == openspec/changes/* ]] || return 0
  rest=${path#openspec/changes/}
  if [[ $mode == active ]]; then
    [[ $rest != archive/* && $rest == */* ]] || return 0
    key=${rest%%/*}
    if [[ $ref == HEAD ]]; then
      [[ -f openspec/changes/$key/proposal.md ]] || return 0
    else
      git cat-file -e "$ref:openspec/changes/$key/proposal.md" 2>/dev/null || return 0
    fi
  else
    [[ $rest == archive/*/* ]] || return 0
    rest=${rest#archive/}
    key=${rest%%/*}
    if [[ $ref == HEAD ]]; then
      [[ -f openspec/changes/archive/$key/proposal.md ]] || return 0
    else
      git cat-file -e "$ref:openspec/changes/archive/$key/proposal.md" 2>/dev/null || return 0
    fi
  fi
  candidates["$key"]=1
}

base=$(git rev-parse --verify origin/main 2>/dev/null || git rev-parse --verify main 2>/dev/null || true)
if [[ -n $base ]]; then
  while IFS= read -r -d '' path; do record_path "$path"; done \
    < <(git diff --name-only -z "$base...$ref" -- openspec/changes/)
fi

if [[ $ref == HEAD ]]; then
  while IFS= read -r -d '' path; do record_path "$path"; done \
    < <(git diff --name-only -z -- openspec/changes/)
  while IFS= read -r -d '' path; do record_path "$path"; done \
    < <(git diff --cached --name-only -z -- openspec/changes/)
  while IFS= read -r -d '' path; do record_path "$path"; done \
    < <(git ls-files --others --exclude-standard -z -- openspec/changes/)
fi

if ((${#candidates[@]})); then
  printf '%s\n' "${!candidates[@]}" | LC_ALL=C sort
fi
