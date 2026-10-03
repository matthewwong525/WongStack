#!/usr/bin/env bash
# Opt-in setup for an existing Ubuntu workspace. All refusals precede mutation.
set -euo pipefail
[ "$#" -eq 0 ] || { [ "$#" -eq 1 ] && [ "$1" = --preflight ]; } || exit 1
fail() { echo "preserve: $1" >&2; exit 1; }
[ "$(id -u)" -eq 0 ] || fail root
# shellcheck disable=SC1091
. /etc/os-release
[ "$ID" = ubuntu ] && [ "$VERSION_ID" = 24.04 ] || fail os
case "$(uname -m)" in x86_64) node_arch=x64 ;; aarch64) node_arch=arm64 ;; *) fail architecture ;; esac
WORKSPACE_USER="${WORKSPACE_USER:-wong}"
[[ "$WORKSPACE_USER" =~ ^[a-z_][a-z0-9_-]{0,31}$ ]] && [ "$WORKSPACE_USER" != root ] || fail user
create_user=0
if entry="$(getent passwd "$WORKSPACE_USER")"; then
  IFS=: read -r _ _ workspace_uid _ _ account_home _ <<<"$entry"
  [ "$workspace_uid" -ne 0 ] || fail user
else
  create_user=1; account_home="${WORKSPACE_HOME:-/home/$WORKSPACE_USER}"; workspace_uid=-1
fi
WORKSPACE_HOME="${WORKSPACE_HOME:-$account_home}"
[ "$WORKSPACE_HOME" = "$account_home" ] && [[ "$WORKSPACE_HOME" =~ ^/[a-zA-Z0-9_./-]+$ ]] && [ "$WORKSPACE_HOME" != / ] || fail home
check_path() {
  local path="$1" current=/ part
  IFS=/ read -ra parts <<<"$path"
  for part in "${parts[@]}"; do
    [ -z "$part" ] && continue
    [ "$part" != . ] && [ "$part" != .. ] || fail path
    current="${current%/}/$part"
    [ ! -L "$current" ] || fail path
    [ ! -e "$current" ] || [ -d "$current" ] || fail path
  done
}
check_path "$WORKSPACE_HOME"
if [ "$create_user" -eq 1 ]; then
  [ ! -e "$WORKSPACE_HOME" ] || fail home
else
  [ -d "$WORKSPACE_HOME" ] && [ "$(stat -c %u "$WORKSPACE_HOME")" = "$workspace_uid" ] || fail home
fi
for path in .local .local/bin .local/lib .local/share .paseo .agent-browser; do
  check_path "$WORKSPACE_HOME/$path"
  [ ! -e "$WORKSPACE_HOME/$path" ] || [ "$(stat -c %u "$WORKSPACE_HOME/$path")" = "$workspace_uid" ] || fail path
done
user_path="$WORKSPACE_HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"
as_user() {
  if [ "$create_user" -eq 1 ]; then
    runuser -u nobody -- env -i HOME=/nonexistent USER="$WORKSPACE_USER" PATH="$user_path" "$@"
  else
    runuser -u "$WORKSPACE_USER" -- env -i HOME="$WORKSPACE_HOME" USER="$WORKSPACE_USER" PATH="$user_path" "$@"
  fi
}
OPEN_SPEC_PACKAGE=@fission-ai/openspec@1.13.2
missing_tools=()
for tool in node git gh openspec paseo claude codex opencode agent-browser cloudflared; do
  if as_user sh -c 'command -v "$1"' sh "$tool" >/dev/null; then
    version="$(as_user "$tool" --version 2>/dev/null)" || fail "tool_$tool"
    case "$tool" in
      node) [[ "$version" =~ ^v(22|24)\. ]] || fail tool_node ;;
      openspec) [[ "$version" = "${OPEN_SPEC_PACKAGE##*@}" ]] || fail tool_openspec ;;
      *) [[ "$version" =~ [0-9]+\.[0-9]+ ]] || fail "tool_$tool" ;;
    esac
  else missing_tools+=("$tool"); fi
done
existing_service=0
if systemctl cat paseo.service >/dev/null 2>&1; then
  existing_service=1
  [ "$(systemctl show paseo.service -p User --value)" = "$WORKSPACE_USER" ] || fail service
  service_env="$(systemctl show paseo.service -p Environment --value)"
  [[ " $service_env " = *" HOME=$WORKSPACE_HOME "* ]] || fail service
  command="$(systemctl show paseo.service -p ExecStart --value)"
  [[ "$command" = *"daemon run"* ]] && [[ "$command" = *"--home $WORKSPACE_HOME/.paseo"* ]] || fail service
  [[ "$service_env" != *AGENT_TOKEN* ]] || fail service
  # Reusing a daemon means keeping its unit and listening address unchanged.
  systemctl is-active --quiet paseo.service || fail service
  [ "$(ss -ltnH 'sport = :6767' | awk '{print $4}')" = 127.0.0.1:6767 ] || fail port
  [[ "$command" != *"0.0.0.0"* ]] && [[ "$command" != *"[::]"* ]] || fail port
else
  [ ! -e /etc/systemd/system/paseo.service ] && [ ! -L /etc/systemd/system/paseo.service ] || fail service
  [ -z "$(ss -ltnH 'sport = :6767')" ] || fail port
fi
if [[ " ${missing_tools[*]} " = *" node "* ]]; then
  [ ! -e "$WORKSPACE_HOME/.local/lib/node" ] || fail tool_node
else
  as_user npm --version >/dev/null 2>&1 || fail tool_npm
fi
# Never overwrite an existing sandbox policy when installing a missing browser.
profile="/etc/apparmor.d/wongstack-preserve-$WORKSPACE_USER"
if [[ " ${missing_tools[*]} " = *" agent-browser "* ]]; then
  [ ! -e "$profile" ] && [ ! -L "$profile" ] || fail browser
fi
bash "$(dirname "$0")/agent-runtime.sh" --preflight
if [ "${1:-}" = --preflight ]; then echo "workspace compatible for $WORKSPACE_USER"; exit 0; fi
# Mutation begins here, after the complete preflight.
if [ "$create_user" -eq 1 ]; then
  useradd --create-home --home-dir "$WORKSPACE_HOME" --shell /bin/bash "$WORKSPACE_USER"
  create_user=0
fi
packages=()
for package in ca-certificates curl xz-utils; do
  if ! dpkg-query -W -f='${Status}' "$package" 2>/dev/null | /bin/grep -q 'install ok installed'; then packages+=("$package"); fi
done
for tool in "${missing_tools[@]}"; do
  case "$tool" in git|gh) packages+=("$tool") ;; esac
done
if [ "${#packages[@]}" -gt 0 ]; then apt-get update; apt-get install -y --no-upgrade "${packages[@]}"; fi
bash "$(dirname "$0")/agent-runtime.sh" --ensure
for tool in "${missing_tools[@]}"; do
  case "$tool" in
    node)
      archive="$(curl -fsSL https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt | awk -v suffix="linux-$node_arch.tar.xz" '$2 ~ suffix "$" {print $2}')"
      [[ "$archive" =~ ^node-v22\.[0-9]+\.[0-9]+-linux-(x64|arm64)\.tar\.xz$ ]] || fail download
      as_user mkdir -p "$WORKSPACE_HOME/.local/lib/node" "$WORKSPACE_HOME/.local/bin"
      scratch="$(mktemp -d)"; chmod 0755 "$scratch"
      curl -fsSL "https://nodejs.org/dist/latest-v22.x/$archive" -o "$scratch/$archive"
      curl -fsSL https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt -o "$scratch/sums"
      (cd "$scratch"; sha256sum --check --ignore-missing sums)
      as_user tar -xJf "$scratch/$archive" --strip-components=1 -C "$WORKSPACE_HOME/.local/lib/node"
      for binary in node npm npx; do as_user ln -s "../lib/node/bin/$binary" "$WORKSPACE_HOME/.local/bin/$binary"; done
      rm -r "$scratch" ;;
    git|gh) : ;;
    cloudflared)
      as_user mkdir -p "$WORKSPACE_HOME/.local/bin"
      as_user curl -fsSL "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${node_arch/x64/amd64}" -o "$WORKSPACE_HOME/.local/bin/cloudflared"
      as_user chmod 0755 "$WORKSPACE_HOME/.local/bin/cloudflared" ;;
    claude) as_user bash -c 'curl -fsSL https://claude.ai/install.sh | bash' ;;
    *)
      case "$tool" in openspec) package="$OPEN_SPEC_PACKAGE" ;; paseo) package=@getpaseo/cli ;; codex) package=@openai/codex ;; opencode) package=opencode-ai ;; *) package=agent-browser ;; esac
      as_user npm install --global --prefix "$WORKSPACE_HOME/.local" "$package" ;;
  esac
done
if [[ " ${missing_tools[*]} " = *" agent-browser "* ]]; then
  # Add absent libraries only; no global browser install or cache deletion.
  libraries=(libnss3 libatk1.0-0t64 libatk-bridge2.0-0t64 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2t64)
  absent=()
  for package in "${libraries[@]}"; do
    if ! dpkg-query -W -f='${Status}' "$package" 2>/dev/null | /bin/grep -q 'install ok installed'; then absent+=("$package"); fi
  done
  if [ "${#absent[@]}" -gt 0 ]; then apt-get update; apt-get install -y --no-upgrade "${absent[@]}"; fi
  as_user agent-browser install
  cat >"$profile" <<POLICY
abi <abi/4.0>,
include <tunables/global>
profile wongstack-preserve-$WORKSPACE_USER $WORKSPACE_HOME/.agent-browser/browsers/*/chrome flags=(unconfined) {
  userns,
}
POLICY
  apparmor_parser -r "$profile"
fi
if [ "$existing_service" -eq 0 ]; then
  paseo_bin="$(as_user sh -c 'command -v paseo')"
  cat >/etc/systemd/system/paseo.service <<UNIT
[Unit]
Description=Paseo daemon (127.0.0.1:6767)
After=network-online.target
[Service]
User=$WORKSPACE_USER
Environment=HOME=$WORKSPACE_HOME
Environment=PATH=$user_path
ExecStart=$paseo_bin daemon run --home $WORKSPACE_HOME/.paseo
Restart=always
[Install]
WantedBy=multi-user.target
UNIT
  systemctl daemon-reload; systemctl enable --now paseo.service
fi
for tool in node git gh openspec paseo claude codex opencode agent-browser cloudflared; do as_user "$tool" --version >/dev/null; done
systemctl is-active --quiet paseo.service || fail service
echo "workspace preserved for $WORKSPACE_USER"
