#!/usr/bin/env python3
"""
CI helper: setup fresh n8n instance for GitHub Actions testing.

Flow:
1. Check if n8n is ready
2. Complete n8n owner setup (first-time setup wizard via REST API)
3. Login and get session token
4. Create or retrieve API key
5. Create Supabase PostgreSQL credentials
6. Output: N8N_API_KEY, CRED1_ID, CRED2_ID (for GITHUB_ENV)

Usage:
  python3 scripts/ci_n8n_setup.py --supabase-password <pw> [--host http://localhost:5678]
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
CI_FIRSTNAME = "CI"
CI_LASTNAME = "Runner"

# Old credential IDs from VM workflows (to be replaced by CI-created IDs)
OLD_CRED_PG = "zEr7jPswZNv6lWKu"       # Supabase PostgreSQL (quantitative)
OLD_CRED_POOLER = "USU8ngVzsUbED3mn"   # Supabase Postgres Pooler (graph)


def request(method, path, data=None, headers=None, cookies=None, raise_on_error=True):
    url = f"{N8N_HOST}{path}"
    body = json.dumps(data).encode() if data else None
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    if cookies:
        req_headers["Cookie"] = "; ".join(f"{k}={v}" for k, v in cookies.items())

    req = urllib.request.Request(url, data=body, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read()
            cookie_header = resp.headers.get("Set-Cookie", "")
            return json.loads(raw) if raw else {}, cookie_header
    except urllib.error.HTTPError as e:
        body_text = e.read().decode("utf-8", errors="replace")
        if raise_on_error:
            print(f"  HTTP {e.code} {method} {path}: {body_text[:300]}")
            raise
        return {"error": body_text, "status": e.code}, ""


def parse_cookie(cookie_header, name):
    for part in cookie_header.split(";"):
        part = part.strip()
        if part.startswith(f"{name}="):
            return part[len(f"{name}="):]
    return ""


def wait_for_n8n(host, max_wait=180):
    print(f"Waiting for n8n at {host}...")
    for i in range(max_wait // 5):
        try:
            urllib.request.urlopen(f"{host}/healthz", timeout=5)
            print(f"  n8n ready after {i*5}s")
            return True
        except Exception:
            time.sleep(5)
    return False


def get_settings():
    try:
        data, _ = request("GET", "/rest/settings", raise_on_error=False)
        return data
    except Exception:
        return {}


def setup_owner():
    """Create the n8n owner account (first-time setup)."""
    print("Creating n8n owner account...")
    payload = {
        "email": CI_EMAIL,
        "firstName": CI_FIRSTNAME,
        "lastName": CI_LASTNAME,
        "password": CI_PASSWORD,
    }
    try:
        data, _ = request("POST", "/rest/owner-setup", data=payload, raise_on_error=False)
        if "error" in data:
            print(f"  Owner setup response: {data}")
        else:
            print(f"  Owner created: {data.get('data', {}).get('email', '?')}")
        return data
    except Exception as e:
        print(f"  Owner setup exception: {e}")
        return {}


def login():
    """Login and return (token, cookies_dict)."""
    print("Logging in to n8n...")
    payload = {"email": CI_EMAIL, "password": CI_PASSWORD}
    try:
        data, cookie_str = request("POST", "/rest/login", data=payload, raise_on_error=False)
        if "error" in data:
            print(f"  Login failed: {data}")
            return None, {}
        token = data.get("data", {}).get("token", "")
        # Parse n8n.user.id cookie
        cookies = {}
        for part in cookie_str.split(","):
            for segment in part.split(";"):
                segment = segment.strip()
                if "=" in segment:
                    k, v = segment.split("=", 1)
                    k = k.strip()
                    if k in ("n8n-auth", "n8n.user.id"):
                        cookies[k] = v.strip()
        print(f"  Logged in, token={token[:20]}..., cookies={list(cookies.keys())}")
        return token, cookies
    except Exception as e:
        print(f"  Login exception: {e}")
        return None, {}


def create_api_key(token, cookies):
    """Create a new API key for the CI user."""
    print("Creating API key...")
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        data, _ = request("POST", "/rest/me/api-key",
                          data={"label": "CI Key"},
                          headers=headers,
                          cookies=cookies,
                          raise_on_error=False)
        api_key = (data.get("data", {}).get("apiKey", "") or
                   data.get("data", {}).get("api_key", "") or
                   data.get("apiKey", ""))
        if api_key:
            print(f"  API key created: {api_key[:20]}...")
            return api_key
        print(f"  API key response: {data}")
        return ""
    except Exception as e:
        print(f"  API key exception: {e}")
        return ""


def test_api_key(api_key):
    """Test if the API key works."""
    try:
        data, _ = request("GET", "/api/v1/workflows",
                          headers={"X-N8N-API-KEY": api_key},
                          raise_on_error=False)
        if "error" not in data:
            return True
        return False
    except Exception:
        return False


def create_credential(api_key, name, cred_type, cred_data, cookies=None, token=None):
    """Create an n8n credential via API."""
    headers = {"X-N8N-API-KEY": api_key} if api_key else {}
    if token and not api_key:
        headers["Authorization"] = f"Bearer {token}"
    payload = {"name": name, "type": cred_type, "data": cred_data}
    try:
        data, _ = request("POST", "/api/v1/credentials",
                          data=payload, headers=headers,
                          cookies=cookies or {}, raise_on_error=False)
        cred_id = data.get("id", "")
        if cred_id:
            print(f"  Created credential '{name}': id={cred_id}")
        else:
            print(f"  Credential creation failed for '{name}': {data}")
        return cred_id
    except Exception as e:
        print(f"  Credential creation exception for '{name}': {e}")
        return ""


def main():
    global N8N_HOST

    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default=N8N_HOST)
    parser.add_argument("--supabase-password", required=True)
    args = parser.parse_args()

    N8N_HOST = args.host
    supabase_pw = args.supabase_password

    # 1. Wait for n8n
    if not wait_for_n8n(N8N_HOST):
        print("ERROR: n8n did not become ready in time")
        sys.exit(1)

    # 2. Check settings and do setup if needed
    settings = get_settings()
    needs_setup = (settings.get("userManagement", {}).get("showSetupOnFirstLoad", False) or
                   not settings.get("userManagement", {}).get("isInstanceOwnerSetUp", True))
    print(f"n8n settings: needsSetup={needs_setup}, raw={json.dumps(settings.get('userManagement', {}))[:200]}")

    if needs_setup:
        setup_owner()

    # 3. Try static API key first (N8N_GLOBAL_ADMIN_API_KEY if it works)
    static_key = os.environ.get("N8N_API_KEY", "rag-tests-ci-api-key-2026")
    api_key = ""
    cookies = {}
    token = ""

    if test_api_key(static_key):
        print(f"Static API key works: {static_key[:20]}...")
        api_key = static_key
    else:
        print("Static API key did not work, using login flow...")
        # 4. Login
        token, cookies = login()
        if not token and not cookies:
            # Try default n8n admin credentials
            print("Login failed, trying alternate approach...")
            # n8n might accept basic setup without login for fresh instances
            # Try to set up owner again in case it was missed
            setup_owner()
            token, cookies = login()

        # 5. Create API key
        if token or cookies:
            api_key = create_api_key(token, cookies)

        if not api_key:
            print("WARNING: Could not obtain API key, will try with session cookies only")

    # 6. Create Supabase credentials
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

    cred1_id = create_credential(api_key, "Supabase PostgreSQL", "postgres",
                                  supabase_pg_data, cookies, token)
    cred2_id = create_credential(api_key, "Supabase Postgres (Pooler)", "postgres",
                                  supabase_pooler_data, cookies, token)

    # 7. Output to GITHUB_ENV
    github_env = os.environ.get("GITHUB_ENV", "")
    output = {
        "N8N_CI_API_KEY": api_key or static_key,
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
        print("WARNING: No credentials created — Postgres nodes will fail in tests")
    print("=== Done ===")


if __name__ == "__main__":
    main()
