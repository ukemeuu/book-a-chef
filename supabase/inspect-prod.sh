#!/usr/bin/env bash
# Read-only inspection of production. Prints STRUCTURE and COUNTS only.
# Never prints customer PII (no names, emails, phones, addresses).
set -euo pipefail
cd "$(dirname "$0")/.."

set -a; source .env.local; set +a
BASE="${NEXT_PUBLIC_SUPABASE_URL}"
KEY="${SUPABASE_SERVICE_ROLE_KEY}"
AUTH=(-H "apikey: $KEY" -H "Authorization: Bearer $KEY")

q() { curl -s -m 30 "$@" "${AUTH[@]}"; }

echo "=== 1. bookings row count, two independent methods ==="
echo -n "  Prefer:count=exact   -> "
q -I "$BASE/rest/v1/bookings?select=id" -H "Prefer: count=exact" \
  | grep -i '^content-range' | sed -E 's#.*/([0-9]+).*#\1#' | tr -d '\r'
echo -n "  full body fetch      -> "
q "$BASE/rest/v1/bookings?select=id&limit=1000" | python3 -c \
  "import json,sys
try: print(len(json.load(sys.stdin)))
except Exception: print('not-a-list')"

echo
echo "=== 2. tables actually present in public schema ==="
q "$BASE/rest/v1/" -H "Accept: application/openapi+json" | python3 -c "
import json,sys
try:
    d=json.load(sys.stdin).get('definitions',{})
    t=sorted(d.keys())
    print(f'  {len(t)} tables exposed via PostgREST:')
    for x in t: print('   -',x)
except Exception as e: print('  could not parse:',e)"

echo
echo "=== 3. bookings columns that DO exist ==="
q "$BASE/rest/v1/bookings?select=id&limit=1" -H "Prefer: return=minimal" -o /dev/null
for c in id client_id client_name client_email client_phone status chef_id \
         booking_date booking_time guests_count total_price deposit_amount \
         location_address location_city menu_title created_at assigned_at; do
  code=$(curl -s -m 15 -o /dev/null -w '%{http_code}' "$BASE/rest/v1/bookings?select=$c&limit=1" \
    -H "apikey: $KEY")
  [[ "$code" == "200" ]] && printf '  %-20s present\n' "$c" || printf '  %-20s ABSENT\n' "$c"
done

echo
echo "=== 4. profiles by role (no PII) ==="
q "$BASE/rest/v1/profiles?select=role" | python3 -c "
import json,sys,collections
try:
    rows=json.load(sys.stdin)
    c=collections.Counter(r.get('role') for r in rows)
    for k,v in sorted(c.items(), key=lambda x:str(x[0])): print(f'  {str(k):10} {v}')
    print(f'  {\"TOTAL\":10} {len(rows)}')
except Exception as e: print('  could not parse:',e)"

echo
echo "=== 5. chefs: real vs seed (no PII) ==="
q "$BASE/rest/v1/chefs?select=id,user_id,verified,is_available,created_at" | python3 -c "
import json,sys
try:
    rows=json.load(sys.stdin)
    linked=[r for r in rows if r.get('user_id')]
    print(f'  total chefs      : {len(rows)}')
    print(f'  linked to a login: {len(linked)}')
    print(f'  seed/orphan rows : {len(rows)-len(linked)}')
    for r in sorted(linked, key=lambda x: str(x.get('created_at'))):
        print(f\"    {str(r.get('created_at'))[:10]}  verified={r.get('verified')}  available={r.get('is_available')}\")
except Exception as e: print('  could not parse:',e)"
