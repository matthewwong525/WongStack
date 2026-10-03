#!/usr/bin/env bash
# The root agent's runtime is separate from every workspace's writable tools.
set -euo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
runtime=/usr/local/lib/wongstack-agent-runtime/bin/node
fail() { echo "agent-runtime: $1" >&2; exit 1; }
[ "$#" -eq 1 ] || fail arguments
case "$1" in --preflight|--ensure|--path) ;; *) fail arguments ;; esac
if [ "$1" = --path ]; then echo "$runtime"; exit 0; fi
[ "$(id -u)" -eq 0 ] || fail root
trusted_path() {
  local target="$1" current=/ part permission
  IFS=/ read -ra components <<<"$target"
  for part in "${components[@]}"; do
    [ -z "$part" ] && continue
    current="${current%/}/$part"
    [ ! -L "$current" ] || return 1
    [ -e "$current" ] || continue
    [ "$(stat -c %u "$current")" -eq 0 ] || return 1
    permission="$(stat -c %a "$current")"
    (( (8#$permission & 8#6022) == 0 )) || return 1
    if [ "$current" != "$target" ]; then [ -d "$current" ] || return 1; fi
  done
}
trusted_binary() {
  local target="$1" version
  trusted_path "$target" && [ -f "$target" ] && [ -x "$target" ] && [ "$(stat -c %h "$target")" -eq 1 ] || return 1
  [ "$(od -An -tx1 -N4 "$target" | tr -d ' \n')" = 7f454c46 ] || return 1
  version="$(env -i PATH=/usr/bin:/bin "$target" --version)" || return 1
  [[ "$version" =~ ^v(22|24)\.[0-9]+\.[0-9]+$ ]]
}
trusted_path "$runtime" || fail path
if [ -e "$runtime" ]; then trusted_binary "$runtime" || fail node; exit 0; fi
[ "$1" != --preflight ] || exit 0
# Copy only verified root-owned system binaries; never discover Node on a
# workspace user's PATH. Otherwise download a verified official Node 22 binary.
source_node=''
for candidate in /usr/bin/node /usr/local/bin/node; do
  if trusted_binary "$candidate"; then source_node="$candidate"; break; fi
done
scratch=''
if [ -z "$source_node" ]; then
  case "$(uname -m)" in x86_64) node_arch=x64 ;; aarch64) node_arch=arm64 ;; *) fail architecture ;; esac
  scratch="$(mktemp -d /usr/local/lib/.wongstack-agent-runtime.XXXXXX)"
  trap 'if [ -n "$scratch" ]; then rm -r "$scratch"; fi' EXIT
  curl -fsSL https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt -o "$scratch/sums"
  archive="$(awk -v suffix="linux-$node_arch.tar.xz" '$2 ~ suffix "$" {print $2}' "$scratch/sums")"
  [[ "$archive" =~ ^node-v22\.[0-9]+\.[0-9]+-linux-(x64|arm64)\.tar\.xz$ ]] || fail download
  curl -fsSL "https://nodejs.org/dist/latest-v22.x/$archive" -o "$scratch/$archive"
  (cd "$scratch"; sha256sum --check --ignore-missing sums)
  tar -xJf "$scratch/$archive" --strip-components=1 -C "$scratch" --wildcards '*/bin/node' --no-same-owner --no-same-permissions
  source_node="$scratch/bin/node"
  trusted_binary "$source_node" || fail download
fi
# Ancestors cannot be replaced by workspace users; recheck before creation.
trusted_path "$runtime" || fail path
install -d -m 0755 /usr/local/lib/wongstack-agent-runtime/bin
install -m 0755 -o root -g root "$source_node" "$runtime"
trusted_binary "$runtime" || fail node
