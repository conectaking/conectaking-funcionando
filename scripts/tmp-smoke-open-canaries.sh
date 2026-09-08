#!/bin/bash
set -e
cd /opt/conectaking
hdr(){ tr -d '\r'|grep -iE 'HTTP/|x-conecta'|head -5; }
SLUG=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc \
  "SELECT profile_slug FROM users WHERE COALESCE(profile_slug,'')<>'' AND profile_slug<>'adrianokingg' LIMIT 1;" | tr -d '[:space:]')
echo "slug=$SLUG"
if [ -n "$SLUG" ]; then
  curl -sS -D - -o /tmp/card.html "http://127.0.0.1:5000/$SLUG" | hdr
  python3 -c "h=open('/tmp/card.html',encoding='utf-8',errors='replace').read(); print('card', 'Server Error' not in h, 'len',len(h))"
fi
curl -sS -D - -o /tmp/a.html 'http://127.0.0.1:5000/adrianokingg' | hdr
curl -sS -D - -o /tmp/ks.html 'http://127.0.0.1:5000/kingSelection/eliseu' | hdr
python3 -c "h=open('/tmp/ks.html',encoding='utf-8',errors='replace').read(); print('ks', 'King Selection' in h or 'eliseu' in h.lower(), 'err','Server Error' in h)"
echo DONE
