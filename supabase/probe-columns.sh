#!/usr/bin/env bash
# Probe EVERY column the application writes to or reads from `bookings`,
# and diff against what migration 01 actually adds.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env.local; set +a
BASE="${NEXT_PUBLIC_SUPABASE_URL}"
KEY="${SUPABASE_SERVICE_ROLE_KEY}"

probe() {
  local c="$1"
  local code
  code=$(curl -s -m 15 -o /dev/null -w '%{http_code}' \
    "$BASE/rest/v1/bookings?select=$c&limit=1" -H "apikey: $KEY")
  [[ "$code" == "200" ]] && echo present || echo ABSENT
}

echo "Columns written by POST /api/bookings/create (the insert that fails):"
MISSING_IN_CREATE=()
for c in client_id chef_id menu_id client_name client_email client_phone \
         booking_date booking_time guests_count location_address location_city \
         special_requests dietary_notes service_format sourcing_preference \
         preferred_stores receipt_verified total_price deposit_amount \
         deposit_paid status; do
  r=$(probe "$c")
  printf '  %-22s %s\n' "$c" "$r"
  [[ "$r" == "ABSENT" ]] && MISSING_IN_CREATE+=("$c")
done

echo
echo "Columns the dashboard / dispatch / accept paths depend on:"
for c in chef_response_at assigned_at cancellation_reason special_requests \
         cuisine_type budget_per_person; do
  printf '  %-22s %s\n' "$c" "$(probe "$c")"
done

echo
echo "=== Cross-check against migration 01 ==="
M01=$(grep -oE "ADD COLUMN IF NOT EXISTS [a-z_]+" \
      supabase/migrations/20260101000100_stage0_01_repair_schema_drift.sql \
      | awk '{print $NF}' | sort -u || true)

echo "Migration 01 adds: $(echo "$M01" | tr '\n' ' ')"
echo
echo "Absent but NOT repaired by migration 01 (these would still break things):"
GAP=0
for c in "${MISSING_IN_CREATE[@]:-}"; do
  [[ -z "$c" ]] && continue
  if ! echo "$M01" | grep -qx "$c"; then
    echo "  *** $c"
    GAP=$((GAP+1))
  fi
done
[[ "$GAP" -eq 0 ]] && echo "  (none — migration 01 covers every column the insert needs)"
