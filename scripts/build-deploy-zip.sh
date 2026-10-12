#!/usr/bin/env bash
# Build a Hostinger-ready deployment ZIP.
#
# Hostinger runs `npm run build` itself (per AGENTS.md), so this packages
# SOURCE — not a prebuilt .next. The earlier *-slim.zip artifacts contain a
# compiled .next with no app/ or components/, which cannot satisfy a build
# step and must not be used.
#
# SECURITY: .env.local holds the live SUPABASE_SERVICE_ROLE_KEY and must never
# leave this machine inside an archive. It is explicitly excluded, and the
# archive is scanned for secrets before it is written.
set -euo pipefail
cd "$(dirname "$0")/.."

VER="${1:-$(git rev-parse --short HEAD)}"
OUT="bookachef-deploy-${VER}.zip"

echo "=== 1. Verifying the build compiles (Hostinger will run this) ==="
npm run build > /tmp/deploy-build.log 2>&1 || {
  echo "BUILD FAILED — not packaging. Tail of log:" >&2
  tail -30 /tmp/deploy-build.log >&2
  exit 1
}
grep -E "Compiled successfully|Failed to compile" /tmp/deploy-build.log | head -2 | sed 's/^/  /'

echo
echo "=== 2. Packaging source ==="
rm -f "$OUT"

# Everything the build needs. node_modules is intentionally absent — Hostinger
# installs from package-lock.json.
zip -rq "$OUT" \
  app \
  components \
  utils \
  public \
  package.json \
  package-lock.json \
  next.config.mjs \
  tailwind.config.js \
  postcss.config.js \
  tsconfig.json \
  middleware.ts \
  next-env.d.ts \
  .env.example \
  -x '*.DS_Store' '*/.DS_Store' '*.tsbuildinfo'

echo "  wrote $OUT ($(du -h "$OUT" | cut -f1))"

echo
echo "=== 3. Secret scan (fail if any real secret slipped in) ==="
LEAK=0

# 3a. No .env file may ship except the documented template.
STRAY=$(unzip -Z1 "$OUT" | grep -E '(^|/)\.env' | grep -vE '(^|/)\.env\.example$' || true)
if [[ -n "$STRAY" ]]; then
  echo "  *** FAIL: archive contains an env file ***" >&2
  printf '      %s\n' "$STRAY" >&2
  LEAK=1
fi

# 3b. Real Supabase keys. Length thresholds so placeholders do not trip this.
#     Note: the legacy anon JWT (eyJ...) is intentionally hardcoded in
#     middleware.ts and utils/supabase/ as a dev fallback. It is public by
#     design, so it is not treated as a leak here.
BLOB=$(unzip -p "$OUT" 2>/dev/null)
if printf '%s' "$BLOB" | grep -qE 'sb_secret_[A-Za-z0-9_-]{15,}'; then
  echo "  *** FAIL: archive contains a Supabase SECRET key ***" >&2
  LEAK=1
fi
if printf '%s' "$BLOB" | grep -qE 'sbp_[A-Za-z0-9]{20,}'; then
  echo "  *** FAIL: archive contains a Supabase access token ***" >&2
  LEAK=1
fi
if printf '%s' "$BLOB" | grep -qE 'sb_publishable_[A-Za-z0-9]{15,}'; then
  echo "  *** FAIL: archive contains a Supabase publishable key ***" >&2
  LEAK=1
fi

# 3c. Payment / email secrets with a non-empty, non-placeholder value.
if printf '%s' "$BLOB" | grep -qE '(MPESA_PASSKEY|MPESA_CONSUMER_SECRET|MPESA_CONSUMER_KEY|RESEND_API_KEY|WHATSAPP_ACCESS_TOKEN)=[A-Za-z0-9_-]{8,}'; then
  echo "  *** FAIL: archive contains a payment or email secret ***" >&2
  LEAK=1
fi

if [[ "$LEAK" -eq 0 ]]; then
  echo "  clean — only .env.example, no keys, no payment secrets"
else
  exit 1
fi

echo
echo "=== 4. Contents ==="
unzip -Z1 "$OUT" | awk -F/ '{print $1}' | sort -u | sed 's/^/  /'
echo "  entries: $(unzip -Z1 "$OUT" | wc -l | tr -d ' ')"
echo
echo "Upload $OUT via hPanel -> bookachef.co.ke -> Deployments."
