import os, urllib.request, json, sys
from dotenv import load_dotenv

load_dotenv()
token = os.getenv("GITHUB_TOKEN")

# Try to create repo
req = urllib.request.Request(
    "https://api.github.com/user/repos",
    data=json.dumps({
        "name": "Anchor",
        "description": "Zero-Drift Engineering Intelligence — AI-powered developer assistant",
        "private": False,
        "auto_init": False
    }).encode(),
    headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28"
    },
    method="POST"
)

try:
    res = urllib.request.urlopen(req)
    r = json.loads(res.read())
    print("SUCCESS - Repo created!")
    print("Full name:", r["full_name"])
    print("Clone URL:", r["clone_url"])
except urllib.error.HTTPError as e:
    body = json.loads(e.read().decode())
    msg = body.get("message", "")
    print("Response:", msg)
    if "already exists" in msg:
        print("INFO - Repo already exists at vishnusagar2025/Anchor")
    elif "403" in str(e):
        print("ERROR - Token needs 'repo' scope. Please regenerate token with full repo permissions.")
        print("Go to: https://github.com/settings/tokens")
