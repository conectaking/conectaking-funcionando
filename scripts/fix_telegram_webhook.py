import urllib.request
import json

token = "8871691156:AAGir9vNUOeukdbtFctvLbi8u2BCe95FgJw"
secret_token = "mkK244lveO0N1qPR_cbf9305d-bc1b-45b0-be15-d77d9546db85"
url = "https://n8n.conectaking.com.br/webhook/ck-agent-telegram/webhook"

# 1. Check current webhook info
req = urllib.request.urlopen(f"https://api.telegram.org/bot{token}/getWebhookInfo")
print("Before:", json.loads(req.read()))

# 2. Set webhook with secret token
data = json.dumps({
    "url": url,
    "allowed_updates": ["message", "callback_query"],
    "secret_token": secret_token
}).encode("utf-8")

req = urllib.request.Request(
    f"https://api.telegram.org/bot{token}/setWebhook",
    data=data,
    headers={"Content-Type": "application/json"}
)
resp = urllib.request.urlopen(req)
print("SetWebhook result:", json.loads(resp.read()))

# 3. Check again
req = urllib.request.urlopen(f"https://api.telegram.org/bot{token}/getWebhookInfo")
print("After:", json.loads(req.read()))
