#!/usr/bin/env bash
# Store a Supabase personal access token in .env.local without echoing it
# or putting it in shell history.
#
# Usage:  bash supabase/set-pat.sh
set -euo pipefail
cd "$(dirname "$0")/.."
ENV_FILE=".env.local"

[[ -f "$ENV_FILE" ]] || { echo "ERROR: $ENV_FILE not found." >&2; exit 1; }

echo "Create a token at https://supabase.com/dashboard/account/tokens"
echo "  name:   stage0-migration"
echo "  scopes: Organization -> Read, Projects -> Read, Projects -> SQL (Run SQL)"
echo
echo "It will NOT be echoed. Paste and press Enter."
echo

if ! read -r -s -p "  Token: " PAT; then
  echo; echo "No input. Aborted." >&2; exit 1
fi
echo

if [[ "$PAT" != sbp_* ]]; then
  echo "That does not look like a Supabase PAT (expected sbp_... prefix)." >&2
  echo "Aborted — nothing written." >&2
  unset PAT
  exit 1
fi

python3 - "$ENV_FILE" "$PAT" <<'PY'
import sys, pathlib
path, val = pathlib.Path(sys.argv[1]), sys.argv[2]
lines = path.read_text().splitlines(keepends=True)
out, done = [], False
for line in lines:
    if line.startswith("SUPABASE_ACCESS_TOKEN="):
        out.append(f"SUPABASE_ACCESS_TOKEN={val}\n"); done = True
    else:
        out.append(line)
if not done:
    out.append(f"SUPABASE_ACCESS_TOKEN={val}\n")
path.write_text("".join(out))
print("written")
PY

unset PAT
echo
echo "Testing token against the Management API..."
echo
set -a; source .env.local; set +a
code=$(curl -s -o /dev/null -w '%{http_code}' -m 30 \
  "https://api.supabase.com/v1/projects/mtmxezxpioelurgrujlk" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN")
case "$code" in
  200) echo "PASS  token is valid and can reach the project." ;;
  401|403) echo "FAIL  token rejected (HTTP $code) — check scopes." ;;
  *) echo "WARN  unexpected HTTP $code" ;;
esac
