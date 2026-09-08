#!/bin/bash
set -e
cd /opt/conectaking

rm -rf laravel && tar xzf /tmp/ck-laravel.tgz
rm -f laravel/.env
tar xzf /tmp/ck-middleware.tgz -C .
cp -f /tmp/docker-compose.prod.yml docker-compose.prod.yml

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod build api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
sleep 14
hdr() { tr -d '\r' | grep -iE 'HTTP/|x-conecta|content-type' | head -6; }

echo "=== form canary ==="
FORM_ID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT pi.id FROM profile_items pi JOIN users u ON u.id=pi.user_id WHERE u.profile_slug='adrianokingg' AND pi.item_type IN ('digital_form','guest_list') AND pi.is_active LIMIT 1;" | tr -d '[:space:]')
echo "form_id=$FORM_ID"
if [ -n "$FORM_ID" ]; then
  curl -sS -D - -o /tmp/form.html "http://127.0.0.1:5000/adrianokingg/form/$FORM_ID" | hdr
  python3 -c "h=open('/tmp/form.html',encoding='utf-8',errors='replace').read(); print('rich', 'yes-no-follow' in h or 'linear_scale' in h or 'ck-form' in h, 'short_text-ok', 'Server Error' not in h, 'len',len(h))"
fi

echo "=== ks cover ==="
curl -sS -D - -o /tmp/cover.jpg 'http://127.0.0.1:5000/api/king-selection/public/cover?slug=eliseu' | hdr
python3 -c "b=open('/tmp/cover.jpg','rb').read(20); print('jpeg', b[:3]==b'\\xff\\xd8\\xff' or b[:10], 'len', len(open('/tmp/cover.jpg','rb').read()))"

echo "=== ks og ==="
curl -sS -D - -o /tmp/og.jpg 'http://127.0.0.1:5000/api/king-selection/public/og-image?slug=eliseu' | hdr
python3 -c "b=open('/tmp/og.jpg','rb').read(3); print('jpeg', b==b'\\xff\\xd8\\xff', 'len', len(open('/tmp/og.jpg','rb').read()))"

echo "=== progress 401 ==="
curl -sS -D - -o /tmp/prog.json 'http://127.0.0.1:5000/api/bible/my-progress' | hdr
python3 -c "import json;o=json.load(open('/tmp/prog.json'));print('unauthorized_ish', o.get('success') is False, o.get('message','')[:60])"

echo "=== guest register token ==="
TOK=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT registration_token FROM guest_list_items WHERE registration_token IS NOT NULL AND allow_self_registration=true LIMIT 1;" | tr -d '[:space:]')
echo "tok=${TOK:0:12}..."
if [ -n "$TOK" ]; then
  curl -sS -D - -o /tmp/greg.html "http://127.0.0.1:5000/guest-list/register/$TOK" | hdr
  python3 -c "h=open('/tmp/greg.html',encoding='utf-8',errors='replace').read(); print('page', 'Inscrição' in h or 'inscrição' in h.lower() or 'WhatsApp' in h, 'err','Server Error' in h, 'engine-laravel', True)"
fi

echo DONE
