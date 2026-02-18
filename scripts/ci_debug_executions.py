#!/usr/bin/env python3
"""Debug helper: fetch last 5 n8n execution statuses with error details."""
import json
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


def extract_name(e):
    """Extract workflow name from execution record."""
    # Try workflowData.name (summary endpoint)
    wf_data = e.get("workflowData", {})
    if isinstance(wf_data, dict) and wf_data.get("name"):
        return wf_data["name"]
    # Try workflowName (some versions)
    if e.get("workflowName"):
        return e["workflowName"]
    # Fall back to workflowId
    return e.get("workflowId", "?")


def extract_errors(e):
    """Extract error messages from execution data."""
    errors = []
    # Check top-level error
    if e.get("error") or e.get("errorMessage"):
        errors.append(str(e.get("error", e.get("errorMessage", "")))[:200])
    # Check in data.resultData.error
    exec_data = e.get("data")
    if isinstance(exec_data, dict):
        result_data = exec_data.get("resultData", {})
        if result_data.get("error"):
            errors.append(str(result_data["error"])[:200])
        # Check per-node errors in runData
        run_data = result_data.get("runData", {})
        for node_name, node_runs in run_data.items():
            for run in (node_runs if isinstance(node_runs, list) else []):
                if run.get("error"):
                    err = run["error"]
                    msg = err.get("message", str(err)) if isinstance(err, dict) else str(err)
                    errors.append(f"[{node_name}] {msg[:150]}")
    return errors


def main():
    print("=== Last 5 n8n executions ===")
    cookie = get_cookie()
    if not cookie:
        print("Could not login to n8n")
        return

    # Try with includeData=true to get full execution details
    for url_suffix in ["?limit=5&includeData=true", "?limit=5"]:
        req = urllib.request.Request(
            f"{N8N_HOST}/rest/executions{url_suffix}",
            headers={"Cookie": f"n8n-auth={cookie}"},
        )
        try:
            resp = urllib.request.urlopen(req, timeout=30)
            data = json.loads(resp.read())
            break
        except Exception as e:
            print(f"Could not fetch executions ({url_suffix}): {e}")
            data = None

    if not data:
        return

    # n8n 2.x wraps executions in data.results or data directly
    inner = data.get("data", data) if isinstance(data, dict) else data
    if isinstance(inner, dict):
        execs = inner.get("results", inner.get("data", []))
    elif isinstance(inner, list):
        execs = inner
    else:
        print(f"Unexpected response format: {str(data)[:300]}")
        return

    if not execs:
        print("  No executions found")
        return

    for e in execs[:5]:
        status = e.get("status", "?")
        name = extract_name(e)
        errors = extract_errors(e)
        wf_id = e.get("workflowId", "?")
        exec_id = e.get("id", "?")
        print(f"  [{status}] id={exec_id} wf={wf_id} name={name[:50]}")
        for err in errors[:3]:
            print(f"    ERROR: {err}")
        if not errors and status != "success":
            print(f"    (no error details in response)")


if __name__ == "__main__":
    main()
