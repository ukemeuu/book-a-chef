#!/usr/bin/env bash
# Securely store the Supabase service-role key in .env.local, then verify it.
#
# The key is read with echo disabled, so it never appears on screen, never
# enters shell history, and never lands in a process listing. It is written
# straight into .env.local (gitignored) and then unset.
#
# Usage:  bash supabase/set-key.sh

set -euo pipefail

cd "$(dirname "$0")/.."
ENV_FILE=".env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found." >&2
  exit 1
fi

echo "Paste your Supabase secret key (starts with sb_secret_)."
echo "It will NOT be echoed. Press Enter when done."
echo

if ! read -r -s -p "  Key: " KEY; then
  echo
  echo "No input. Aborted." >&2
  exit 1
fi
echo

# Basic sanity check before we write anything.
if [[ "$KEY" != sb_secret_* ]]; then
  echo "That does not look like a secret key (expected sb_secret_... prefix)." >&2
  echo "Aborted — nothing was written." >&2
  unset KEY
  exit 1
fi

if [[ ${#KEY} -lt 20 ]]; then
  echo "Key looks too short (${#KEY} chars). Aborted — nothing written." >&2
  unset KEY
  exit 1
fi

# Replace the value on the SUPABASE_SERVICE_ROLE_KEY line, whatever it was.
# Written via python so no shell interpolation can mangle the value.
python3 - "$ENV_FILE" "$KEY" <<'PY'
import sys, pathlib

path, key = pathlib.Path(sys.argv[1]), sys.argv[2]
lines = path.read_text().splitlines(keepends=True)

out, done = [], False
for line in lines:
    if line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
        out.append(f"SUPABASE_SERVICE_ROLE_KEY={key}\n")
        done = True
    else:
        out.append(line)

if not done:
    out.append(f"SUPABASE_SERVICE_ROLE_KEY={key}\n")

path.write_text("".join(out))
print("written")
PY

unset KEY
echo
echo "Stored in .env.local (gitignored)."
echo "=============================================="
echo
bash supabase/verify-key.sh production
