import requests
import json

url = "http://localhost:8080/api/auth/sms/send"
headers = {"Content-Type": "application/json"}
data = {"phone": "13800138000", "scene": "LOGIN_REGISTER"}

response = requests.post(url, headers=headers, data=json.dumps(data))
print(f"Status Code: {response.status_code}")
print(f"Response: {response.text}")
