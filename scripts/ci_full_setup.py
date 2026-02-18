#!/usr/bin/env python3
"""
CI helper: Full n8n setup via REST API using session cookies.

Replaces ci_n8n_setup.py + CLI workflow import + ci_activate_workflows.py.

Flow:
1. Login → get session cookie (n8n-auth)
2. Create Supabase credentials via REST
3. Import workflows via REST (POST /rest/workflows)
4. Activate workflows via REST (PATCH /rest/workflows/{id}/activate)
5. Output CRED1_ID, CRED2_ID to GITHUB_ENV

Usage:
  python3 scripts/ci_full_setup.py --supabase-password <pw> [--workflow-dir n8n/live]
"""

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request

N8N_HOST = os.environ.get("N8N_HOST", "http://localhost:5678")
CI_EMAIL = "ci@nomos.ai"
CI_PASSWORD = "CI-Nomos-2026!"

# Old VM credential IDs → replaced with CI-created IDs in workflow JSONs
OLD_CRED_PG = "zEr7jPswZNv6lWKu"
OLD_CRED_POOLER = "USU8ngVzsUbED3mn"

WORKFLOW_FILES = [
    "n8n/live/standard.json",
    "n8n/live/graph.json",
    "n8n/live/quantitative.json",
    "n8n/live/orchestrator.json",
]


def http(method, path, data=None, headers=None, cookies=None, raise_on_error=False):
    """HTTP helper — returns (dict_or_str, cookie_str)."""
    url = f"{N8N_HOST}{path}"
    body = json.dumps(data).encode() if data else None
    req_headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if headers:
        req_headers.update(headers)
    if cookies:
        req_headers["Cookie"] = "; ".join(f"{k}={v}" for k, v in cookies.items())

    req = urllib.request.Request(url, data=body, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read()
            cookie_header = resp.headers.get("Set-Cookie", "")
            try:
                return json.loads(raw) if raw else {}, cookie_header
            except Exception:
                return raw.decode("utf-8", errors="replace"), cookie_header
    except urllib.error.HTTPError as e:
        body_text = e.read().decode("utf-8", errors="replace")
        if raise_on_error:
            print(f"  HTTP {e.code} {method} {path}: {body_text[:200]}")
            raise
        try:
            parsed = json.loads(body_text)
        except Exception:
            parsed = {"error": body_text, "status": e.code}
        return parsed, ""


def wait_for_n8n(max_wait=120):
    print(f"Waiting for n8n at {N8N_HOST}...")
    for i in range(max_wait // 5):
        try:
            urllib.request.urlopen(f"{N8N_HOST}/healthz", timeout=5)
            print(f"  n8n ready after {i*5}s")
            return True
        except Exception:
            time.sleep(5)
    return False


def parse_cookies(cookie_header):
    """Parse Set-Cookie header(s) into a dict."""
    cookies = {}
    for part in cookie_header.split(","):
        for segment in part.split(";"):
            segment = segment.strip()
            if "=" in segment:
                k, v = segment.split("=", 1)
                k = k.strip()
                if k in ("n8n-auth", "n8n.user.id", "n8n-browse-id"):
                    cookies[k] = v.strip()
    return cookies


def login():
    """Login and return cookies dict."""
    print("Logging in to n8n...")
    for payload in [
        {"emailOrLdapLoginId": CI_EMAIL, "password": CI_PASSWORD},
        {"email": CI_EMAIL, "password": CI_PASSWORD},
    ]:
        data, cookie_str = http("POST", "/rest/login", data=payload)
        if isinstance(data, dict) and "error" not in data:
            cookies = parse_cookies(cookie_str)
            if cookies:
                print(f"  Logged in, cookies: {list(cookies.keys())}")
                return cookies
            print(f"  Login returned no cookies: {str(data)[:100]}")
        else:
            print(f"  Login failed ({list(payload.keys())[0]}): {str(data)[:100]}")
    print("  ERROR: Login failed")
    return {}


def get_or_create_api_key(cookies):
    """Try to create an API key using session cookies."""
    print("Getting/creating API key...")
    for endpoint in ["/api/v1/me/api-key", "/rest/me/api-key"]:
        for method in ["POST", "GET"]:
            data, _ = http(method, endpoint, data={"label": "CI Key"} if method == "POST" else None, cookies=cookies)
            if isinstance(data, dict):
                api_key = (
                    data.get("data", {}).get("apiKey", "") or
                    data.get("data", {}).get("api_key", "") or
                    data.get("apiKey", "") or
                    data.get("api_key", "")
                )
                if api_key:
                    print(f"  API key via {method} {endpoint}: {api_key[:20]}...")
                    return api_key
    return ""


def extract_id(data):
    """Extract 'id' from n8n response (handles both flat and {data: {...}} formats)."""
    if not isinstance(data, dict):
        return ""
    return (data.get("id", "") or
            data.get("data", {}).get("id", "") if isinstance(data.get("data"), dict) else "")


def extract_error(data):
    """Extract error/message from n8n response."""
    if not isinstance(data, dict):
        return str(data)[:200]
    return str(
        data.get("message", "") or
        data.get("error", "") or
        data.get("data", {}).get("message", "") if isinstance(data.get("data"), dict) else ""
    )[:200]


def create_credential(name, cred_type, cred_data, cookies, api_key=""):
    """Create n8n credential via REST."""
    payload = {"name": name, "type": cred_type, "data": cred_data}
    attempts = [("/rest/credentials", None)]
    if api_key:
        attempts.append(("/api/v1/credentials", {"X-N8N-API-KEY": api_key}))

    for endpoint, extra_headers in attempts:
        data, _ = http("POST", endpoint, data=payload, headers=extra_headers,
                       cookies=cookies)
        if isinstance(data, dict):
            cred_id = extract_id(data)
            if cred_id:
                print(f"  Created '{name}' id={cred_id} via {endpoint}")
                return cred_id
            print(f"  {endpoint} failed for '{name}': {extract_error(data)} | raw={str(data)[:100]}")
    return ""


def import_workflow(filepath, cookies, api_key="", cred1_id="", cred2_id=""):
    """Import a workflow JSON via REST API."""
    if not os.path.exists(filepath):
        print(f"  Skip (not found): {filepath}")
        return None

    with open(filepath) as f:
        wf = json.load(f)

    name = wf.get("name", "?")

    # Strip VM-specific fields that cause FK violations
    for field in ["shared", "ownedBy"]:
        if field in wf and wf[field]:
            wf[field] = [] if isinstance(wf[field], list) else None

    # Strip meta.instanceId
    if wf.get("meta") and wf["meta"].get("instanceId"):
        wf["meta"].pop("instanceId", None)

    # Strip workflow ID so n8n creates a fresh one (avoids ID conflicts)
    old_id = wf.pop("id", None)

    # Patch credential IDs if provided
    if cred1_id or cred2_id:
        wf_str = json.dumps(wf)
        if cred1_id:
            wf_str = wf_str.replace(OLD_CRED_PG, cred1_id)
        if cred2_id:
            wf_str = wf_str.replace(OLD_CRED_POOLER, cred2_id)
        wf = json.loads(wf_str)

    print(f"  Importing: {name} (old id={old_id})")

    # Try REST endpoints in order
    attempts = [("/rest/workflows", None)]
    if api_key:
        attempts.append(("/api/v1/workflows", {"X-N8N-API-KEY": api_key}))

    for endpoint, extra_headers in attempts:
        data, _ = http("POST", endpoint, data=wf,
                       headers=extra_headers,
                       cookies=cookies)
        if isinstance(data, dict):
            wf_id = extract_id(data)
            if wf_id:
                wf_name = (data.get("name") or
                           data.get("data", {}).get("name", "?") if isinstance(data.get("data"), dict) else "?")
                print(f"    Imported via {endpoint}: id={wf_id}, name={wf_name[:50]}")
                return wf_id
            print(f"    {endpoint} failed for '{name}': {extract_error(data)} | raw={str(data)[:100]}")

    print(f"  FAILED to import: {name}")
    return None


def activate_workflow(wf_id, name, cookies, api_key=""):
    """Activate a workflow via REST."""
    attempts = [(f"/rest/workflows/{wf_id}/activate", None)]
    if api_key:
        attempts.append((f"/api/v1/workflows/{wf_id}/activate", {"X-N8N-API-KEY": api_key}))

    for endpoint, extra_headers in attempts:
        for method in ["PATCH", "POST"]:
            data, _ = http(method, endpoint, data={},
                           headers=extra_headers,
                           cookies=cookies)
            active = (data.get("active") if isinstance(data, dict) else False) or \
                     (data.get("data", {}).get("active") if isinstance(data.get("data"), dict) else False)
            if active:
                print(f"  Activated ({method}): {name} ({wf_id})")
                return True
        print(f"    {endpoint} activation failed: {extract_error(data) if isinstance(data, dict) else str(data)[:100]}")
    return False


def list_workflows(cookies, api_key=""):
    """List all workflows, return list of dicts."""
    attempts = [("/rest/workflows?limit=20", None)]
    if api_key:
        attempts.append(("/api/v1/workflows?limit=20", {"X-N8N-API-KEY": api_key}))

    for endpoint, extra_headers in attempts:
        data, _ = http("GET", endpoint, headers=extra_headers, cookies=cookies)
        if isinstance(data, dict):
            wfs = data.get("data", data)
            if isinstance(wfs, list) and len(wfs) >= 0:
                return wfs
    return []


def verify_workflows(cookies, api_key=""):
    """Print all workflows in n8n."""
    print("=== Verifying workflows ===")
    wfs = list_workflows(cookies, api_key)
    print(f"Total: {len(wfs)} workflows")
    for w in wfs:
        status = "ACTIVE" if w.get("active") else "inactive"
        print(f"  [{status}] id={w.get('id','?')} {w.get('name','?')[:55]}")
    return len(wfs)


def main():
    global N8N_HOST
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default=N8N_HOST)
    parser.add_argument("--supabase-password", required=True)
    parser.add_argument("--workflow-dir", default=None)
    args = parser.parse_args()

    N8N_HOST = args.host
    supabase_pw = args.supabase_password
    github_env = os.environ.get("GITHUB_ENV", "")

    workflow_files = WORKFLOW_FILES
    if args.workflow_dir:
        workflow_files = [os.path.join(args.workflow_dir, os.path.basename(f)) for f in WORKFLOW_FILES]

    # 1. Wait for n8n
    if not wait_for_n8n():
        print("ERROR: n8n not ready")
        sys.exit(1)

    # 2. Login
    cookies = login()
    if not cookies:
        print("ERROR: Cannot login to n8n")
        sys.exit(1)

    # 3. Try to get/create API key (optional — cookies are primary)
    api_key = get_or_create_api_key(cookies)
    if not api_key:
        # Fall back to static key (may or may not work)
        static_key = os.environ.get("N8N_API_KEY", "")
        if static_key:
            print(f"  Falling back to static API key: {static_key[:20]}...")
            api_key = static_key

    # 4. Create Supabase credentials
    print("\n=== Creating Supabase credentials ===")
    supabase_pg_data = {
        "host": "db.ayqviqmxifzmhphiqfmj.supabase.co",
        "port": 5432,
        "database": "postgres",
        "user": "postgres",
        "password": supabase_pw,
        "ssl": True,
        "sshTunnel": False,
        "allowUnauthorizedCerts": False,
    }
    supabase_pooler_data = {
        "host": "aws-1-eu-west-1.pooler.supabase.com",
        "port": 6543,
        "database": "postgres",
        "user": "postgres.ayqviqmxifzmhphiqfmj",
        "password": supabase_pw,
        "ssl": True,
        "sshTunnel": False,
        "allowUnauthorizedCerts": False,
    }
    cred1_id = create_credential("Supabase PostgreSQL", "postgres", supabase_pg_data, cookies, api_key)
    cred2_id = create_credential("Supabase Postgres (Pooler)", "postgres", supabase_pooler_data, cookies, api_key)

    # 5. Import workflows (skip if already exist in n8n)
    print("\n=== Checking existing workflows ===")
    existing_wfs = list_workflows(cookies, api_key)
    print(f"Found {len(existing_wfs)} existing workflows in n8n")
    for w in existing_wfs:
        status = "ACTIVE" if w.get("active") else "inactive"
        print(f"  [{status}] id={w.get('id','?')} {w.get('name','?')[:55]}")

    # Import if not already present
    print("\n=== Importing workflows ===")
    imported = {}  # filepath → wf_id
    if len(existing_wfs) >= len(workflow_files):
        print("  Workflows already in n8n — skipping import")
        for w in existing_wfs:
            imported[w.get("name", "")] = w.get("id", "")
    else:
        for wf_file in workflow_files:
            wf_id = import_workflow(wf_file, cookies, api_key, cred1_id, cred2_id)
            if wf_id:
                imported[wf_file] = wf_id
        print(f"\nImported: {len(imported)}/{len(workflow_files)} workflows")

    # 6. Activate all inactive workflows
    print("\n=== Activating workflows ===")
    time.sleep(2)
    current_wfs = list_workflows(cookies, api_key)
    activated = 0
    for w in current_wfs:
        if not w.get("active"):
            if activate_workflow(w["id"], w.get("name", w["id"]), cookies, api_key):
                activated += 1
        else:
            print(f"  Already active: {w.get('name','?')[:55]}")

    print(f"\nActivated {activated} workflows, {len(current_wfs) - activated} already active")
    verify_workflows(cookies, api_key)

    # 7. Output to GITHUB_ENV
    output = {
        "N8N_CI_API_KEY": api_key or "rag-ci-nomos-2026-b7f8a91d2e3c4f5a6b7c8d9e0f1a2b3c4d5e6f7",
        "CRED1_ID": cred1_id,
        "CRED2_ID": cred2_id,
    }
    print("\n=== CI Setup Results ===")
    for k, v in output.items():
        safe_v = v[:20] + "..." if len(v) > 20 else v
        print(f"  {k}={safe_v}")
        if github_env:
            with open(github_env, "a") as f:
                f.write(f"{k}={v}\n")

    if not cred1_id and not cred2_id:
        print("WARNING: No credentials created — Postgres nodes may fail in tests")

    total_wfs = len(list_workflows(cookies, api_key))
    if total_wfs == 0:
        print("ERROR: No workflows in n8n after setup")
        sys.exit(1)

    print(f"=== Done: {total_wfs} workflows in n8n ===")


if __name__ == "__main__":
    main()
