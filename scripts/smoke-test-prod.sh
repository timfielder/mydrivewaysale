#!/usr/bin/env bash
# Post-deploy smoke test for the static mydrivewaysale.net site.
# Usage: scripts/smoke-test-prod.sh [BASE_URL]      (default https://mydrivewaysale.net)
#   SKIP_HOSTS=1  skip the .com / www / plain-http host checks (automatic when BASE_URL is not
#                 https://mydrivewaysale.net, e.g. the Cloudflare preview, which has no .htaccess).
#   SKIP_HTTP=1   skip only the plain-http (port 80) checks. Needed from Fred's box: its egress
#                 proxy answers every port-80 request with a 500 (Server: Pingora).
# Exit code = number of failed checks (0 = all passed).
set -u
BASE="${1:-https://mydrivewaysale.net}"; BASE="${BASE%/}"
PROD="https://mydrivewaysale.net"
[ "$BASE" != "$PROD" ] && SKIP_HOSTS="${SKIP_HOSTS:-1}"
SKIP_HOSTS="${SKIP_HOSTS:-0}"; SKIP_HTTP="${SKIP_HTTP:-0}"
UA="mds-smoke-test/1.0"; fails=0; passes=0
ok()  { passes=$((passes+1)); printf 'PASS  %s\n' "$1"; }
bad() { fails=$((fails+1));  printf 'FAIL  %s\n' "$1"; }
hdr() { curl -sS -o /dev/null -A "$UA" --max-time 25 -w '%{http_code} %{redirect_url}' "$1" 2>/dev/null || echo "000 "; }

# expect_status URL CODE
expect_status() { local r; r=$(hdr "$1"); [ "${r%% *}" = "$2" ] && ok "$2 $1" || bad "$1 expected $2, got ${r%% *}"; }
# expect_redirect URL CODE TARGET   (first hop only, exact Location)
expect_redirect() {
  local r code loc; r=$(hdr "$1"); code="${r%% *}"; loc="${r#* }"
  if [ "$code" = "$2" ] && [ "$loc" = "$3" ]; then ok "$2 $1 -> $3"; else bad "$1 expected $2 -> $3, got $code -> $loc"; fi
}

echo "== Key pages (200) on $BASE"
for p in / /hub/ /austin-tx-garage-sale-guide/ /milwaukee-wi-rummage-sale-guide/ /hartford-ct-tag-sale-guide/ \
  /atlanta-ga-yard-sale-guide/ /austin-tx-garage-sale-liability/ /driveway-liability-checklist/ \
  /the-ultimate-color-sticker-pricing-strategy/ /international-garage-sale-guide/ /stickercalc-web/ \
  /stickercalc-app/ /app/ /general-texas-garage-sale-guide/ /privacy-policy/ /terms-of-service/ \
  /about-contact/ /robots.txt /sitemap-index.xml /ads.txt; do
  expect_status "$BASE$p" 200
done

echo "== Content checks"
home=$(curl -sS -A "$UA" --max-time 25 "$BASE/" || true)
if [ "$BASE" = "$PROD" ]; then
  grep -q 'googletagmanager.com/gtag/js?id=GT-5TGL39GM' <<<"$home" && ok "Google tag on /" || bad "Google tag missing on /"
  xr=$(curl -sSI -A "$UA" --max-time 25 "$BASE/hub/" | tr -d '\r' | grep -i '^x-robots-tag' || true)
  [ -z "$xr" ] && ok "no X-Robots-Tag on /hub/" || bad "X-Robots-Tag present on /hub/: $xr"
  grep -q 'Disallow: /$' <<<"$(curl -sS --max-time 25 "$BASE/robots.txt")" && bad "robots.txt disallows everything" || ok "robots.txt allows crawling"
fi
grep -q 'mydriveways0a-20' <<<"$(curl -sS -A "$UA" --max-time 25 "$BASE/hub/")" && ok "Amazon tag on /hub/" || bad "Amazon tag missing on /hub/"
expect_status "$BASE/this-page-does-not-exist-$RANDOM/" 404

if [ "$BASE" = "$PROD" ]; then
  echo "== Redirects and gone URLs (.htaccess)"
  expect_redirect "$BASE/guide/" 301 "$PROD/hub/"
  expect_redirect "$BASE/hello-world/" 301 "$PROD/"
  expect_redirect "$BASE/home" 301 "$PROD/"
  expect_redirect "$BASE/category/uncategorized/" 301 "$PROD/"
  expect_redirect "$BASE/2026/" 301 "$PROD/"
  expect_redirect "$BASE/?p=1" 301 "$PROD/"
  expect_redirect "$BASE/author/timtfielder-com/" 301 "$PROD/about-contact/"
  expect_redirect "$BASE/wp-sitemap.xml" 301 "$PROD/sitemap-index.xml"
  expect_redirect "$BASE/wp-sitemap-posts-page-1.xml" 301 "$PROD/sitemap-index.xml"
  expect_redirect "$BASE/hub/%5BINSERT_1800GOTJUNK_AFFILIATE_LINK%5D" 301 "$PROD/hub/"
  expect_redirect "$BASE/san-antonio-tx-garage-sale-guide/%5BINSERT_EXTRASPACE_AFFILIATE_LINK%5D" 301 "$PROD/san-antonio-tx-garage-sale-guide/"
  expect_redirect "$BASE/hub" 301 "$PROD/hub/"
  for p in /feed/ /comments/feed/ /wp-admin/ /wp-login.php /xmlrpc.php /wp-json/ /wp-json/wp/v2/pages; do
    expect_status "$BASE$p" 410
  done
fi

if [ "$SKIP_HOSTS" != "1" ]; then
  echo "== Host redirects (one hop to $PROD, path kept)"
  for h in https://mydrivewaysale.com https://www.mydrivewaysale.com https://www.mydrivewaysale.net; do
    expect_redirect "$h/" 301 "$PROD/"
    expect_redirect "$h/hub/" 301 "$PROD/hub/"
  done
  if [ "$SKIP_HTTP" != "1" ]; then
    for h in http://mydrivewaysale.net http://www.mydrivewaysale.net http://mydrivewaysale.com http://www.mydrivewaysale.com; do
      expect_redirect "$h/austin-tx-garage-sale-guide/" 301 "$PROD/austin-tx-garage-sale-guide/"
    done
  else
    echo "SKIP  plain-http host checks (SKIP_HTTP=1)"
  fi
fi

if [ "$BASE" = "$PROD" ]; then
  echo "== Topic noindex and sitemap (AdSense prep)"
  topic=$(curl -sS -A "$UA" --max-time 25 "$BASE/austin-tx-garage-sale-liability/" || true)
  echo "$topic" | grep -qi 'name="robots" content="noindex' && ok "noindex on /austin-tx-garage-sale-liability/" || bad "missing noindex on /austin-tx-garage-sale-liability/"
  echo "$topic" | grep -q 'rel="canonical" href="https://mydrivewaysale.net/austin-tx-garage-sale-liability/"' && ok "self-canonical on topic page" || bad "topic page canonical is not self"
  guide=$(curl -sS -A "$UA" --max-time 25 "$BASE/austin-tx-garage-sale-guide/" || true)
  echo "$guide" | grep -qi 'name="robots" content="[^"]*noindex' && bad "city guide is noindex" || ok "city guide is indexable"
  hub=$(curl -sS -A "$UA" --max-time 25 "$BASE/hub/" || true)
  echo "$hub" | grep -qi 'name="robots" content="[^"]*noindex' && bad "hub is noindex" || ok "hub is indexable"
  smap=$(curl -sS -A "$UA" --max-time 25 "$BASE/sitemap-0.xml" || true)
  smap_n=$(printf '%s' "$smap" | grep -o '<loc>' | wc -l)
  [ "$smap_n" = "118" ] && ok "sitemap-0.xml has 118 URLs" || bad "sitemap-0.xml has $smap_n URLs, expected 118"
  echo "$smap" | grep -q '/austin-tx-garage-sale-liability/' && bad "topic URL is in the sitemap" || ok "topic URL is not in the sitemap"
  ads=$(curl -sS -A "$UA" --max-time 25 "$BASE/ads.txt" || true)
  echo "$ads" | grep -q 'google.com, pub-2398634112645558, DIRECT, f08c47fec0942fa0' && ok "ads.txt has the publisher line" || bad "ads.txt missing the publisher line"
fi

echo "== $passes passed, $fails failed"
exit "$fails"
