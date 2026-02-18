#!/usr/bin/env python3
"""Debug helper: fetch last 5 n8n execution statuses."""
import json
import sys
import urllib.request

N8N_HOST = "http://localhost:5678"
CI_EMAIL = "ci@nomos.ai"
CI_PASSWORD = "CI-Nomos-2026!"


def get_cookie():
    req = urllib.request.Request(
        f"{N8N_HOST}/rest/login",
        data=json.dumps({"emailOrLdapLoginId": CI_EMAIL, "password": CI_PASSWORD}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        raw_cookies = resp.headers.get("Set-Cookie", "")
        for part in raw_cookies.split(";"):
            part = part.strip()
            if part.startswith("n8n-auth="):
                return part[9:]
    except Exception as e:
        print(f"Login failed: {e}")
    return ""


def main():
    print("=== Last 5 n8n executions ===")
    cookie = get_cookie()
    if not cookie:
        print("Could not login to n8n")
        return

    req = urllib.request.Request(
        f"{N8N_HOST}/rest/executions?limit=5",
        headers={"Cookie": f"n8n-auth={cookie}"},
    )
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        data = json.loads(resp.read())
    except Exception as e:
        print(f"Could not fetch executions: {e}")
        return

    execs = data.get("data", data) if isinstance(data, dict) else data
    if not isinstance(execs, list):
        print(f"Unexpected response: {str(data)[:200]}")
        return

    for e in execs[:5]:
        status = e.get("status", "?")
        wf_data = e.get("workflowData", {})
        wf_name = wf_data.get("name", "?") if isinstance(wf_data, dict) else e.get("workflowId", "?")
        err_msg = ""
        exec_data = e.get("data")
        if isinstance(exec_data, dict):
            run_data = exec_data.get("resultData", {}).get("runData", {})
            for node_runs in run_data.values():
                for run in (node_runs if isinstance(node_runs, list) else []):
                    if run.get("error"):
                        err_msg = str(run["error"])[:150]
        print(f"  [{status}] {wf_name}: {err_msg or 'OK'}")


if __name__ == "__main__":
    main()
