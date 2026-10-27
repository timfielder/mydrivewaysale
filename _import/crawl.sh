#!/bin/bash
for slug in $(python3 -c "import json;[print(c['slug']) for c in json.load(open('supportedCities.json'))]"); do
  [ -s "city_pages/$slug.html" ] && continue
  curl -s -A "Mozilla/5.0 (compatible; MyDrivewaySale-migration-check)" -o "city_pages/$slug.html" -w "%{http_code} $slug\n" "https://mydrivewaysale.net/$slug/"
  sleep 2
done
echo DONE
