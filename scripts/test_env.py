import subprocess

cmd = "docker exec conectaking-laravel php -r \"echo 'OPENAI=' . (getenv('OPENAI_API_KEY') ? '1' : '0') . ' GEMINI=' . (getenv('GEMINI_API_KEY') ? '1' : '0') . ' TG=' . (getenv('TELEGRAM_CAMERA_BOT_TOKEN') ? '1' : '0') . PHP_EOL;\""
res = subprocess.run(["ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64", cmd], capture_output=True, text=True)
print("STDOUT:", res.stdout)
print("STDERR:", res.stderr)
