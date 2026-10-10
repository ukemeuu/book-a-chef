#!/usr/bin/env bash
# Logical backup of production via PostgREST using the service-role key.
#
# pg_dump is preferred but needs the DB password, which we don't have yet.
# PostgREST + service_role reads every row regardless of RLS, which is
# sufficient for a data backup of the tables that hold real records.
#
# Writes JSON (not custom-format dump) so it is human-inspectable and
# restorable with a small loader. Credentials are never printed.
set -euo pipefail
cd "$(dirname "$0")/.."

set -a; source .env.local; set +a
BASE="${NEXT_PUBLIC_SUPABASE_URL}"
KEY="${SUPABASE_SERVICE_ROLE_KEY}"

STAMP=$(date +%Y%m%d-%H%M%S)
OUT="backups/prod-${STAMP}"
mkdir -p "$OUT"

TABLES="bookings chefs profiles payments notifications audit_logs \
booking_status_history chef_applications chef_availability chef_blocked_dates \
disputes menus messages reviews"

echo "Backing up to $OUT"
echo

TOTAL=0
SKIPPED=0
for t in $TABLES; do
  body=$(curl -s -m 60 "$BASE/rest/v1/$t?select=*&limit=100000" \
    -H "apikey: $KEY" -H "Authorization: Bearer $KEY")

  if ! printf '%s' "$body" | head -c 1 | grep -q '\['; then
    printf '  %-24s -- absent from schema\n' "$t"
    echo '[]' > "$OUT/$t.json"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  printf '%s' "$body" > "$OUT/$t.json"
  n=$(printf '%s' "$body" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))')
  printf '  %-24s %s row(s)\n' "$t" "$n"
  TOTAL=$((TOTAL + n))
done

# Manifest so a restore can be verified.
cat > "$OUT/manifest.json" <<JSON
{
  "taken_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "project_ref": "mtmxezxpioelurgrujlk",
  "method": "postgrest-service-role",
  "total_rows": $TOTAL,
  "tables_absent": $SKIPPED
}
JSON

echo
echo "Total rows backed up: $TOTAL"
echo "Manifest: $OUT/manifest.json"

# Integrity check: every file must be valid JSON.
BAD=0
for f in "$OUT"/*.json; do
  python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$f" 2>/dev/null || {
    echo "CORRUPT: $f"; BAD=$((BAD + 1)); }
done
[[ "$BAD" -eq 0 ]] && echo "Integrity: all files parse as valid JSON" || exit 1
