#!/usr/bin/env bash
set -euo pipefail
API="${API_URL:-http://localhost:4000}"
echo "== health =="
curl -sf "$API/health"; echo
SLUG="pilot-$(date +%s)"
REG=$(curl -sf -X POST "$API/api/v1/auth/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"pilot-$SLUG@example.com\",\"password\":\"password12345\",\"organizationName\":\"Pilot Org\",\"organizationSlug\":\"$SLUG\"}")
TOKEN=$(echo "$REG" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
CASE=$(curl -sf -X POST "$API/api/v1/cases" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"E2E repair dispute","jurisdiction":"US-CA"}')
CID=$(echo "$CASE" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
curl -sf -X POST "$API/api/v1/cases/$CID/claims" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"role":"tenant","claims":"Heater broken for 10 days."}' > /dev/null
echo "OK e2e smoke passed case=$CID"
