import re

with open("laravel/app/Http/Controllers/Alexa/CharleneController.php", "r", encoding="utf-8") as f:
    content = f.read()

matches = re.findall(r"'slug'\s*=>\s*'([^']+)',\s*'titulo'\s*=>\s*'([^']+)'", content)
print(f"Total de histórias: {len(matches)}")
for i, (slug, title) in enumerate(matches, 1):
    print(f"{i}. [{slug}] {title}")
