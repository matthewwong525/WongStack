#!/usr/bin/env bash
# Compatible line output; --json also returns local checkpoint evidence.
set -euo pipefail
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
exec node "$SCRIPT_DIR/checkpoint-evidence.mjs" "$@"
