#!/bin/sh
# Lint de sintaxe de todo o PHP do Laravel (app/, routes/, bootstrap/, database/).
# Uso: docker run --rm -v "$PWD/laravel:/w" -v "$PWD/scripts:/s" -w /w php:8.4-cli-alpine sh /s/tmp-lint-php.sh
n=0
err=0
for f in $(find app routes bootstrap database -name '*.php' 2>/dev/null); do
  n=$((n + 1))
  out=$(php -l "$f" 2>&1)
  case "$out" in
    'No syntax errors'*) ;;
    *)
      err=$((err + 1))
      echo "$out"
      ;;
  esac
done
echo "FILES=$n ERRORS=$err"
[ "$err" -eq 0 ]
