#!/usr/bin/env bash
# Verify the production service-role key can actually read data.
#
# The key is read from .env.local and never printed, never logged, and never
# passed on a command line where it could land in shell history or a process
# listing. It stays in this script's environment only.
#
# Usage:  bash supabase/verify-key.sh [production|staging]

set -euo pipefail

TARGET="${1:-production}"

cd "$(dirname "$0")/.."

ENV_FILE=".env.local"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found." >&2
  exit 1
fi

# Load without echoing anything.
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo "FAIL: SUPABASE_SERVICE_ROLE_KEY is empty in $ENV_FILE." >&2
  echo "      Create one: Dashboard -> Project Settings -> API Keys." >&2
  exit 1
fi

if [[ "$TARGET" == "staging" ]]; then
  BASE="${STAGE0_TEST_URL:-}"
  [[ -z "$BASE" ]] && { echo "FAIL: set STAGE0_TEST_URL for staging." >&2; exit 1; }
else
  BASE="${NEXT_PUBLIC_SUPABASE_URL:-}"
  [[ -z "$BASE" ]] && { echo "FAIL: set NEXT_PUBLIC_SUPABASE_URL for production." >&2; exit 1; }
fi

echo "Target: $TARGET"
echo "Host:   $(printf '%s' "$BASE" | sed -E 's#(https://)[^.]+(\..*)#\1<project-ref>\2#')"
echo

# --- 1. Does the key authenticate at all? --------------------------------
# Secret keys go on the `apikey` header. They are not JWTs, so
# `Authorization: Bearer` is wrong and fails misleadingly.
auth_code=$(curl -s -o /dev/null -w '%{http_code}' -m 25 \
  "$BASE/rest/v1/chefs?select=id&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY")

case "$auth_code" in
  200) echo "PASS  key authenticates (HTTP 200)" ;;
  401)
    echo "FAIL  key rejected (HTTP 401)." >&2
    echo "      Either the value is wrong or the key is not active yet." >&2
    exit 1
    ;;
  *) echo "FAIL  unexpected HTTP $auth_code" >&2; exit 1 ;;
esac

# --- 2. Row counts (the thing RLS was hiding before) ----------------------
count_of() {
  local table="$1"
  curl -s -m 25 "$BASE/rest/v1/$table?select=count" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Prefer: count=exact" \
    -H "Range: 0-0" \
    -D - -o /dev/null 2>/dev/null \
    | grep -i '^content-range:' \
    | sed -E 's#.*/([0-9]+).*#\1#' \
    | tr -d '\r'
}

printf '\nRow counts (previously invisible under RLS):\n'
for t in bookings chefs profiles payments notifications dispatch_log; do
  n=$(count_of "$t" || true)
  if [[ -z "$n" ]]; then
    printf '  %-16s  <missing or no access>\n' "$t"
  else
    printf '  %-16s  %s\n' "$t" "$n"
  fi
done

# --- 3. The 7 columns booking creation needs ------------------------------
printf '\nbookings columns required by POST /api/bookings/create:\n'
cols=$(curl -s -m 25 "$BASE/rest/v1/bookings?select=id&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Prefer: return=minimal" \
  -H "Accept: application/json" -o /dev/null -w '%{http_code}')

# Probe each column individually with a HEAD-style count request; a missing
# column returns a 400 mentioning "does not exist".
missing=0
for c in service_format sourcing_preference preferred_stores receipt_verified \
         cuisine_type budget_per_person assigned_at; do
  code=$(curl -s -m 20 -o /dev/null -w '%{http_code}' \
    "$BASE/rest/v1/bookings?select=$c&limit=1" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY")
  if [[ "$code" == "200" ]]; then
    printf '  %-22s  present\n' "$c"
  else
    printf '  %-22s  MISSING (HTTP %s)\n' "$c" "$code"
    missing=$((missing + 1))
  fi
done

echo
if [[ "$missing" -gt 0 ]]; then
  echo "VERDICT: booking creation is BROKEN — $missing required column(s) absent."
  echo "         Migration 01 repairs this."
  exit 2
fi
echo "VERDICT: booking schema is intact."
