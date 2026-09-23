#!/bin/bash
token=$(grep TELEGRAM_BOT_TOKEN /opt/ck-agent/.env | cut -d= -f2 | tr -d "'\"")
echo "Token: ${token:0:10}..."
res=$(curl -4 -s -X POST "https://api.telegram.org/bot${token}/setMyName" -H 'Content-Type: application/json' -d '{"name":"Agente King"}')
echo "Resultado setMyName: $res"
