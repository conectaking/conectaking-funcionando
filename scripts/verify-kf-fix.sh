#!/bin/sh
docker exec conectaking-api node --check public_html/formPageEdit.js && echo SYNTAX_OK
curl -sS 'http://127.0.0.1:5000/formPageEdit.js?v=2026-09-07-syntax' | sed -n '7594p'
curl -sS 'http://127.0.0.1:5000/formPageEdit.html' | grep -o 'formPageEdit.js?v=[^"]*' | head -2
