import urllib.request, json, sys

BASE = "http://localhost:8000"

def post(path, payload):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        BASE + path, data=data,
        headers={"Content-Type": "application/json"}, method="POST"
    )
    try:
        res = urllib.request.urlopen(req)
        return json.loads(res.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return {"ERROR": e.code, "detail": body}

print("=" * 60)
print("ANCHOR — Live API Test")
print("=" * 60)

# 1. Pipeline Analyzer
print("\n[1] Pipeline Analyzer...")
result = post("/api/pipeline/analyze", {
    "repo_full_name": "vishnusagar2025/portfolio-website",
    "file_path": "index.js",
    "code_snippet": "var x = 1\neval(userInput)\npassword = '12345'\nconsole.log(x)"
})
print(json.dumps(result, indent=2))

# 2. Pre-Push Predictor
print("\n[2] Pre-Push Predictor...")
result = post("/api/predictor/predict", {
    "repo_full_name": "vishnusagar2025/portfolio-website",
    "base_branch": "main",
    "diff": """diff --git a/app.js b/app.js
index 1234567..abcdefg 100644
--- a/app.js
+++ b/app.js
@@ -1,5 +1,8 @@
+var password = 'hardcoded123'
+eval(req.body.input)
 const express = require('express')
 const app = express()
-app.listen(3000)
+app.listen(80)
"""
})
print(json.dumps(result, indent=2))

# 3. Log Intelligence
print("\n[3] Log Intelligence...")
result = post("/api/logs/analyze", {
    "logs": """2024-01-15 10:23:01 ERROR Database connection timeout after 30s - retrying (attempt 1/3)
2024-01-15 10:23:31 ERROR Database connection timeout after 30s - retrying (attempt 2/3)
2024-01-15 10:23:61 CRITICAL Database connection failed - max retries exceeded
2024-01-15 10:24:01 ERROR NullPointerException in UserService.getUser() line 142
2024-01-15 10:24:02 ERROR NullPointerException in UserService.getUser() line 142
2024-01-15 10:24:03 WARN  Memory usage at 92% - approaching limit
2024-01-15 10:24:10 ERROR OutOfMemoryError: Java heap space
2024-01-15 10:24:11 ERROR OutOfMemoryError: Java heap space
2024-01-15 10:24:12 CRITICAL Service crashed - restarting container
2024-01-15 10:25:01 INFO  Container restarted successfully
2024-01-15 10:25:05 ERROR Database connection timeout after 30s - retrying (attempt 1/3)
2024-01-15 10:25:35 WARN  API response time 8432ms - SLA breach (threshold: 2000ms)
2024-01-15 10:25:40 ERROR 500 Internal Server Error - /api/users/profile
2024-01-15 10:25:41 ERROR 500 Internal Server Error - /api/orders/list
2024-01-15 10:25:42 ERROR 500 Internal Server Error - /api/payment/process"""
})
print(json.dumps(result, indent=2))

print("\n" + "=" * 60)
print("Test complete.")
