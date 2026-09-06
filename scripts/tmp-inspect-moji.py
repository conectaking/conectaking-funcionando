#!/usr/bin/env python3
from pathlib import Path
import re

# Inspect sample of "broken" file
p = Path('/opt/conectaking/public_html/formPageEdit.js')
raw = p.read_bytes()
t = raw.decode('utf-8', errors='replace')
# find a mojibake-like snippet
for needle in ['Ã§', 'Ã£', 'formul', 'CÃ', 'nÃ']:
    i = t.find(needle)
    if i >= 0:
        snip = t[i:i+40]
        print('needle', needle, 'snip', repr(snip))
        print(' bytes', raw[raw.find(snip.encode('utf-8', errors='ignore')[:20] if False else 0):])
        break

# Find first match of pattern and show codepoints
m = re.search(r'.{0,10}Ã.{0,15}', t)
if m:
    s = m.group(0)
    print('match', repr(s))
    print('codepoints', [hex(ord(c)) for c in s])

# Maybe files use Windows-1252 decoded wrong differently
# Try cp1252 roundtrip variants
before = len(re.findall(r'Ã[§£©³¡­ºµ¢ª´ ]|â€', t))
print('before markers', before)
for enc in ['cp1252', 'latin-1', 'iso-8859-1']:
    try:
        fixed = t.encode(enc).decode('utf-8')
        after = len(re.findall(r'Ã[§£©³¡­ºµ¢ª´ ]|â€', fixed))
        print(enc, 'after', after, 'fffd', '\ufffd' in fixed, 'sample', repr(fixed[m.start():m.start()+30] if m else ''))
    except Exception as e:
        print(enc, 'fail', type(e).__name__, e)
