#!/usr/bin/env bash
# Apply Stage 0 migrations to Supabase via the Management API.
#
# Requires SUPABASE_ACCESS_TOKEN (a Supabase personal access token) in
# .env.local. The token is read into this script's environment and is never
# printed, never passed on a command line, and never logged.
#
# Usage:
#   bash supabase/apply-migration.sh --list
#   bash supabase/apply-migration.sh --dry-run 01
#   bash supabase/apply-migration.sh 00
#   bash supabase/apply-migration.sh 01
#   bash supabase/apply-migration.sh all
set -euo pipefail
cd "$(dirname "$0")/.."

set -a; source .env.local; set +a

REF="mtmxezxpioelurgrujlk"
API="https://api.supabase.com/v1/projects/${REF}/database/query"
MIGDIR="supabase/migrations"

run_sql() {
  # $1 = SQL text. Writes the response to stdout.
  python3 - "$API" "$SUPABASE_ACCESS_TOKEN" "$1" <<'PY'
import json, sys, urllib.request

api, token, sql = sys.argv[1], sys.argv[2], sys.argv[3]
req = urllib.request.Request(
    api,
    data=json.dumps({"query": sql}).encode(),
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    },
    method="POST",
)
try:
    with urllib.request.urlopen(req, timeout=180) as r:
        sys.stdout.write(r.read().decode())
except urllib.error.HTTPError as e:
    sys.stdout.write(e.read().decode())
    sys.exit(1)
PY
}

resolve() {
  # $1 = "00" | "01" | ... | "all"
  if [[ "$1" == "all" ]]; then
    ls "$MIGDIR"/*_stage0_*.sql | sort
  else
    ls "$MIGDIR"/*_stage0_"$1"_*.sql 2>/dev/null || true
  fi
}

ACTION="${1:---list}"

# Informational modes never need credentials.
case "$ACTION" in
  --list)
    echo "Available migrations:"
    for f in "$MIGDIR"/*_stage0_*.sql; do
      n=$(basename "$f" | sed -nE 's/.*_stage0_([0-9]{2})_.*/\1/p')
      printf '  %s  %s\n' "$n" "$(basename "$f")"
    done
    exit 0
    ;;
  --dry-run)
    for f in $(resolve "${2:-all}"); do
      echo "───────── $(basename "$f") ─────────"
      echo "Would execute $(wc -l < "$f") lines against project $REF."
      echo "First statements:"
      grep -E '^\s*(ALTER|CREATE|DROP|INSERT|UPDATE|DELETE)' "$f" | head -8 | sed 's/^/  /'
      echo
    done
    exit 0
    ;;
esac

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  cat >&2 <<'EOF'
MISSING: SUPABASE_ACCESS_TOKEN is not set in .env.local.

Create one at https://supabase.com/dashboard/account/tokens
  name:   stage0-migration
  scopes: Organization -> Read, Projects -> Read, Projects -> SQL / Run SQL

Then store it:
  bash supabase/set-pat.sh
EOF
  exit 1
fi

FILES=$(resolve "$ACTION")
if [[ -z "$FILES" ]]; then
  echo "No migration matched '$ACTION'." >&2
  exit 1
fi

for f in $FILES; do
  NAME=$(basename "$f")
  echo "════════════════════════════════════════════"
  echo "Applying $NAME"
  echo "════════════════════════════════════════════"

  OUT=$(run_sql "$(cat "$f")") || { echo "FAILED to execute $NAME"; echo "$OUT"; exit 1; }

  # The API returns a JSON array of result sets. Surface notices/errors.
  printf '%s' "$OUT" | python3 -c "
import json, sys
raw = sys.stdin.read().strip()
try:
    data = json.loads(raw)
except Exception:
    print(raw[:2000]); raise SystemExit(0)
if isinstance(data, list):
    for item in data:
        if isinstance(item, dict):
            for k in ('message','detail','hint','error'):
                if k in item: print(f'  [{k}] {item[k]}')
            if 'severity' in item: print(f\"  [{item.get('severity')}] {item.get('message','')}\")
    if not any(isinstance(i, dict) and any(k in i for k in ('message','detail','error')) for i in data):
        print('  OK — no errors reported')
else:
    print(raw[:2000])
"
  echo
done

echo "Done. Verify with:  bash supabase/verify-key.sh production"
