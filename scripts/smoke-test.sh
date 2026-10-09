#!/usr/bin/env bash
#
# End-to-end smoke test for the Travelov API. Exercises the happy path:
# search -> login -> hotel detail -> booking -> sandbox payment -> confirmation,
# then checks the admin dashboard endpoints.
#
# Usage:
#   API=http://localhost:5080 ./scripts/smoke-test.sh
#
set -euo pipefail

API="${API:-http://localhost:5080}"
DEMO_EMAIL="${DEMO_EMAIL:-user@travelov.test}"
DEMO_PASSWORD="${DEMO_PASSWORD:-User123!}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@travelov.test}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin123!}"

pass() { printf '  \033[32mPASS\033[0m %s\n' "$1"; }
fail() { printf '  \033[31mFAIL\033[0m %s\n' "$1"; exit 1; }

json_get() { # json_get <json> <key> -> first matching "key":"value"
  printf '%s' "$1" | grep -o "\"$2\":\"[^\"]*\"" | head -n 1 | sed -e 's/^[^:]*:"//' -e 's/"$//'
}

echo "== 1. Health =="
curl -sf "$API/health" >/dev/null || fail "health endpoint"
pass "GET /health"

echo "== 2. Search hotels =="
SEARCH=$(curl -sf "$API/api/hotels?page=1&pageSize=5") || fail "search"
HOTEL_ID=$(json_get "$SEARCH" "id")
[ -n "$HOTEL_ID" ] || fail "search returned no hotel"
pass "GET /api/hotels -> hotel $HOTEL_ID"

echo "== 3. Login as demo user =="
LOGIN=$(curl -sf -X POST "$API/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$DEMO_EMAIL\",\"password\":\"$DEMO_PASSWORD\"}") || fail "login"
TOKEN=$(json_get "$LOGIN" "accessToken")
[ -n "$TOKEN" ] || fail "no access token"
AUTH=(-H "Authorization: Bearer $TOKEN")
pass "POST /api/auth/login"

echo "== 4. Hotel detail with availability =="
CHECK_IN=$(date -d "+14 days" +%Y-%m-%d 2>/dev/null || date -v+14d +%Y-%m-%d)
CHECK_OUT=$(date -d "+17 days" +%Y-%m-%d 2>/dev/null || date -v+17d +%Y-%m-%d)
DETAIL=$(curl -sf "$API/api/hotels/$HOTEL_ID?checkIn=$CHECK_IN&checkOut=$CHECK_OUT&guests=2") || fail "detail"
ROOM_TYPE_ID=$(printf '%s' "$DETAIL" | grep -o '"roomTypes":\[{"id":"[^"]*"' | head -n 1 | sed -e 's/.*"id":"//' -e 's/"$//')
[ -n "$ROOM_TYPE_ID" ] || fail "no room type in detail"
pass "GET /api/hotels/{id} -> room type $ROOM_TYPE_ID ($CHECK_IN -> $CHECK_OUT)"

echo "== 5. Create booking =="
BOOKING=$(curl -sf -X POST "$API/api/bookings" "${AUTH[@]}" -H 'Content-Type: application/json' -d "{
  \"hotelId\": \"$HOTEL_ID\",
  \"roomTypeId\": \"$ROOM_TYPE_ID\",
  \"checkIn\": \"$CHECK_IN\",
  \"checkOut\": \"$CHECK_OUT\",
  \"rooms\": 1,
  \"guests\": 2,
  \"guestName\": \"Budi Santoso\",
  \"guestEmail\": \"user@travelov.test\",
  \"guestPhone\": \"+62 812 0000 0000\"
}") || fail "create booking"
BOOKING_ID=$(json_get "$BOOKING" "id")
BOOKING_CODE=$(json_get "$BOOKING" "code")
BOOKING_STATUS=$(json_get "$BOOKING" "status")
[ "$BOOKING_STATUS" = "PendingPayment" ] || fail "expected PendingPayment, got $BOOKING_STATUS"
pass "POST /api/bookings -> $BOOKING_CODE ($BOOKING_STATUS)"

echo "== 6. Pay (sandbox simulate) =="
PAY=$(curl -sf -X POST "$API/api/payments/simulate" "${AUTH[@]}" -H 'Content-Type: application/json' \
  -d "{\"bookingCode\":\"$BOOKING_CODE\",\"success\":true}") || fail "simulate payment"
PAY_STATUS=$(json_get "$PAY" "bookingStatus")
[ "$PAY_STATUS" = "Confirmed" ] || fail "expected Confirmed, got $PAY_STATUS"
pass "POST /api/payments/simulate -> $PAY_STATUS"

echo "== 7. Idempotent callback replay =="
REPLAY=$(curl -sf -X POST "$API/api/payments/simulate" "${AUTH[@]}" -H 'Content-Type: application/json' \
  -d "{\"bookingCode\":\"$BOOKING_CODE\",\"success\":true}") || fail "replay"
ALREADY=$(printf '%s' "$REPLAY" | sed -n 's/.*"alreadyProcessed":\([a-z]*\).*/\1/p')
[ "$ALREADY" = "true" ] || fail "expected alreadyProcessed=true, got '$ALREADY'"
pass "replay returned alreadyProcessed=true"

echo "== 8. Booking history =="
curl -sf "$API/api/bookings" "${AUTH[@]}" >/dev/null || fail "booking history"
pass "GET /api/bookings"

echo "== 9. Admin login + dashboard =="
ADMIN_LOGIN=$(curl -sf -X POST "$API/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}") || fail "admin login"
ADMIN_TOKEN=$(json_get "$ADMIN_LOGIN" "accessToken")
[ -n "$ADMIN_TOKEN" ] || fail "no admin token"
ADMIN_AUTH=(-H "Authorization: Bearer $ADMIN_TOKEN")

curl -sf "$API/api/admin/stats" "${ADMIN_AUTH[@]}" >/dev/null || fail "admin stats"
pass "GET /api/admin/stats"
curl -sf "$API/api/admin/bookings?page=1&pageSize=5" "${ADMIN_AUTH[@]}" >/dev/null || fail "admin bookings"
pass "GET /api/admin/bookings"
curl -sf "$API/api/admin/hotels?page=1&pageSize=5" "${ADMIN_AUTH[@]}" >/dev/null || fail "admin hotels"
pass "GET /api/admin/hotels"

echo "== 10. Admin endpoints reject a normal user =="
ADMIN_STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$API/api/admin/stats" "${AUTH[@]}")
[ "$ADMIN_STATUS" = "403" ] || fail "expected 403 for non-admin, got $ADMIN_STATUS"
pass "GET /api/admin/stats as user -> 403"

printf '\n\033[32mAll smoke tests passed.\033[0m\n'
