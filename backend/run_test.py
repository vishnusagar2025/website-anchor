import urllib.request, json
from dotenv import load_dotenv
load_dotenv()

BASE = "http://localhost:8000"

def post(path, payload):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        BASE + path, data=data,
        headers={"Content-Type": "application/json"}, method="POST"
    )
    try:
        res = urllib.request.urlopen(req, timeout=120)
        return json.loads(res.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            return {"ERROR": json.loads(body)}
        except:
            return {"ERROR": f"HTTP {e.code}: {body[:200]}"}

print("=" * 55)
print("  ANCHOR -- Live Run Test (Ollama llama3)")
print("=" * 55)

# 1. Pipeline Analyzer
print("\n[1] Pipeline Analyzer -- vishnusagar2025/learn")
r = post("/api/pipeline/analyze", {
    "repo_full_name": "vishnusagar2025/learn",
    "file_path": "app.py",
    "code_snippet": "password = 'admin123'\neval(input())\nquery = 'SELECT * FROM users WHERE id=' + id"
})
if "ERROR" in r:
    print("  ERROR:", r["ERROR"])
else:
    print(f"  Compliance Score : {r['compliance_score']}/100")
    print(f"  Violations       : {len(r['violations'])}")
    for v in r['violations']:
        print(f"    [X] {v}")
    print(f"  Suggestions      : {len(r['suggestions'])}")
    for s in r['suggestions']:
        print(f"    [+] {s}")

# 2. Pre-Push Predictor
print("\n[2] Pre-Push Predictor -- vishnusagar2025/learn")
r = post("/api/predictor/predict", {
    "repo_full_name": "vishnusagar2025/learn",
    "base_branch": "main",
    "diff": """diff --git a/app.py b/app.py
--- a/app.py
+++ b/app.py
@@ -0,0 +1,5 @@
+password = 'hardcoded_secret'
+eval(user_input)
+query = "SELECT * FROM users WHERE id=" + id
+app.run(debug=True, host='0.0.0.0')
"""
})
if "ERROR" in r:
    print("  ERROR:", r["ERROR"])
else:
    print(f"  Risk Level       : {r['risk_level'].upper()}")
    print(f"  Merge Conflict   : {r['merge_conflict_risk'].upper()}")
    print(f"  CI Failures      : {len(r['ci_failure_predictions'])}")
    for p in r['ci_failure_predictions']:
        print(f"    [X] {p}")
    print(f"  Recommendations  : {len(r['recommendations'])}")
    for rec in r['recommendations']:
        print(f"    [>] {rec}")

# 3. Log Intelligence
print("\n[3] Log Intelligence")
r = post("/api/logs/analyze", {
    "logs": """2024-01-15 10:23:01 ERROR DB connection timeout - retrying 1/3
2024-01-15 10:23:31 ERROR DB connection timeout - retrying 2/3
2024-01-15 10:23:61 CRITICAL DB connection failed - max retries exceeded
2024-01-15 10:24:01 ERROR NullPointerException in UserService.getUser() line 142
2024-01-15 10:24:03 WARN  Memory usage at 92%
2024-01-15 10:24:10 ERROR OutOfMemoryError: Java heap space
2024-01-15 10:24:12 CRITICAL Service crashed - restarting container
2024-01-15 10:25:35 WARN  API response time 8432ms - SLA breach
2024-01-15 10:25:40 ERROR 500 Internal Server Error /api/users/profile
2024-01-15 10:25:41 ERROR 500 Internal Server Error /api/orders/list"""
})
if "ERROR" in r:
    print("  ERROR:", r["ERROR"])
else:
    print(f"  Total Lines      : {r['total_lines']}")
    print(f"  Incidents Found  : {len(r['incidents'])}")
    print(f"  Summary          : {r['summary'][:150]}")
    for inc in r['incidents']:
        print(f"\n  [{inc['severity'].upper()}] {inc['pattern']}")
        print(f"    Root Cause  : {inc['root_cause']}")
        print(f"    Cost Impact : {inc['cost_impact']}")
        print(f"    Runbook     : {len(inc['runbook'])} steps")

print("\n" + "=" * 55)
print("  Test Complete")
print("=" * 55)
