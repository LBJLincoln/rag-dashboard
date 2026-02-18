#!/usr/bin/env python3
"""
CI helper: activate all workflows in a fresh n8n instance.
Tries with API key first, then without auth (if N8N_USER_MANAGEMENT_DISABLED=true).
"""
import json
import os
import sys
import urllib.request
import urllib.error

N8N_HOST = os.environ.get("N8N_HOST", "http://localhost:5678")
N8N_API_KEY = os.environ.get("N8N_CI_API_KEY", os.environ.get("N8N_API_KEY", ""))


def get_workflows(api_key):
    url = f"{N8N_HOST}/rest/workflows?limit=50"
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["X-N8N-API-KEY"] = api_key
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            wfs = data.get("data", data) if isinstance(data, dict) else data
            return wfs if isinstance(wfs, list) else []
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"  GET /rest/workflows HTTP {e.code}: {body[:200]}")
        return []
    except Exception as e:
        print(f"  GET /rest/workflows error: {e}")
        return []


def activate_workflow(wid, name, api_key):
    url = f"{N8N_HOST}/rest/workflows/{wid}/activate"
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["X-N8N-API-KEY"] = api_key
    req = urllib.request.Request(url, method="POST", headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            print(f"  Activated: {name[:60]}")
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"  Activation failed {name[:40]}: HTTP {e.code} — {body[:150]}")
        return False
    except Exception as e:
        print(f"  Activation error {name[:40]}: {e}")
        return False


def main():
    api_key = N8N_API_KEY
    print(f"n8n host: {N8N_HOST}")
    print(f"API key: {'SET (' + api_key[:15] + '...)' if api_key else 'NOT SET'}")

    workflows = get_workflows(api_key)
    print(f"Found {len(workflows)} workflows")

    if not workflows and api_key:
        print("Retrying without API key...")
        workflows = get_workflows("")

    activated = 0
    already_active = 0
    failed = 0

    for w in workflows:
        wid = str(w.get("id", ""))
        name = w.get("name", "?")
        active = w.get("active", False)
        print(f"  [{'ACTIVE' if active else 'inactive'}] {name[:60]}")
        if active:
            already_active += 1
        elif wid:
            if activate_workflow(wid, name, api_key):
                activated += 1
            else:
                # try without key
                if activate_workflow(wid, name, ""):
                    activated += 1
                else:
                    failed += 1

    print(f"\nSummary: {already_active} already active, {activated} activated, {failed} failed")
    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
