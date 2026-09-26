#!/usr/bin/env bash
# Turns a fresh Ubuntu 24.04 server into a WongStack workspace: the workspace
# user, the tools agents use, and Paseo as a service. Run as root; safe to run
# again. server/README.md is the contract a host relies on.
set -euo pipefail

WORKSPACE_USER="${WORKSPACE_USER:-wong}"
export DEBIAN_FRONTEND=noninteractive

if [ "$(id -u)" -ne 0 ]; then
  echo "run as root: sudo bash server/setup.sh" >&2
  exit 1
fi

step() { echo "==> $*"; }

step "user $WORKSPACE_USER"
id -u "$WORKSPACE_USER" >/dev/null 2>&1 || useradd --create-home --shell /bin/bash "$WORKSPACE_USER"
HOME_DIR="$(getent passwd "$WORKSPACE_USER" | cut -d: -f6)"
as_user() { runuser -u "$WORKSPACE_USER" -- env HOME="$HOME_DIR" PATH="$HOME_DIR/.local/bin:/usr/local/bin:/usr/bin:/bin" "$@"; }

step "base packages"
apt-get update
apt-get install -y ca-certificates curl git gnupg

step "Node.js 24"
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt-get install -y nodejs

step "GitHub CLI"
install -d -m 0755 /etc/apt/keyrings
curl -fsSL -o /etc/apt/keyrings/githubcli-archive-keyring.gpg https://cli.github.com/packages/githubcli-archive-keyring.gpg
chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" >/etc/apt/sources.list.d/github-cli.list
apt-get update
apt-get install -y gh

step "OpenSpec, Paseo, Codex, OpenCode, agent-browser"
npm install -g @fission-ai/openspec @getpaseo/cli @openai/codex opencode-ai agent-browser

step "Claude Code"
as_user bash -c 'curl -fsSL https://claude.ai/install.sh | bash'

# Root adds Chrome's system libraries, then drops its own copy of Chrome; the
# workspace user gets the browser in its own home, where agent-browser looks.
step "agent-browser's Chrome"
agent-browser install --with-deps
rm -rf /root/.agent-browser
as_user agent-browser install

# Ubuntu 24.04 blocks the user namespaces that Chrome's sandbox needs. This
# lets agent-browser's Chrome, and only it, use them, so the sandbox stays on.
cat >/etc/apparmor.d/agent-browser-chrome <<EOF
abi <abi/4.0>,
include <tunables/global>

profile agent-browser-chrome $HOME_DIR/.agent-browser/browsers/*/chrome flags=(unconfined) {
  userns,
  include if exists <local/agent-browser-chrome>
}
EOF
apparmor_parser -r /etc/apparmor.d/agent-browser-chrome

step "Paseo service"
cat >/etc/systemd/system/paseo.service <<EOF
[Unit]
Description=Paseo daemon (127.0.0.1:6767)
After=network-online.target
Wants=network-online.target

[Service]
User=$WORKSPACE_USER
Environment=HOME=$HOME_DIR
Environment=PATH=$HOME_DIR/.local/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=$(command -v paseo) daemon run --home $HOME_DIR/.paseo
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now paseo.service

# The last word: every promised tool is on the user's path, and Paseo runs.
step "check"
missing=0
for tool in node git gh openspec paseo claude codex opencode agent-browser; do
  as_user bash -c "command -v $tool" >/dev/null || { echo "missing: $tool" >&2; missing=1; }
done
systemctl is-active --quiet paseo.service || { echo "missing: paseo.service" >&2; missing=1; }
[ "$missing" -eq 0 ] || exit 1
echo "workspace ready for $WORKSPACE_USER"
