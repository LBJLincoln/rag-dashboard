#!/usr/bin/env python3
"""
CI helper: initialize n8n database with CI owner user + personal project.

This creates the minimum data needed for n8n CLI workflow import to work.
Runs AFTER n8n starts (so migrations have created the tables), but BEFORE
workflow import (which requires a user+project to assign the workflow to).

Prerequisites:
  - pip install bcrypt
  - docker compose is running (postgres accessible)

Usage:
  python3 scripts/ci_init_n8n_db.py
"""
import os
import subprocess
import sys

CI_USER_ID = "11111111-1111-1111-1111-111111111111"
CI_EMAIL = "ci@nomos.ai"
CI_FIRSTNAME = "CI"
CI_LASTNAME = "Runner"
CI_PASSWORD = "CI-Nomos-2026!"
CI_PROJECT_ID = "ci-personal-project-2026"

POSTGRES_SERVICE = "postgres"
POSTGRES_USER = "n8n"
POSTGRES_DB = "n8n"


def run_psql(sql):
    """Run SQL against the postgres container via docker compose exec."""
    cmd = [
        "docker", "compose", "exec", "-T", POSTGRES_SERVICE,
        "psql", "-U", POSTGRES_USER, "-d", POSTGRES_DB, "-c", sql
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  SQL error: {result.stderr[:300]}")
        return False
    print(f"  SQL OK: {result.stdout.strip()[:100]}")
    return True


def get_bcrypt_hash(password):
    """Generate bcrypt hash for the CI user password."""
    try:
        import bcrypt
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt(10)).decode()
    except ImportError:
        # Fallback: use a pre-computed hash (bcrypt of 'CI-Nomos-2026!' rounds=10)
        # This is a valid bcrypt hash that n8n can verify
        return "$2b$10$UExFKuiF9Mly7cROalruX.MbXSxwS1cdq4335Yr4vqU7uIU4vT44W"


def main():
    print("=== Initializing n8n DB with CI owner user ===")

    pw_hash = get_bcrypt_hash(CI_PASSWORD)
    print(f"Password hash: {pw_hash[:30]}...")

    # Escape single quotes in hash for SQL
    pw_hash_sql = pw_hash.replace("'", "''")

    # 1. Create CI owner user
    print("\n1. Creating CI owner user...")
    sql_user = f"""
INSERT INTO "user" (id, email, "firstName", "lastName", password, "roleSlug", disabled, "mfaEnabled", "createdAt", "updatedAt")
VALUES (
    '{CI_USER_ID}',
    '{CI_EMAIL}',
    '{CI_FIRSTNAME}',
    '{CI_LASTNAME}',
    '{pw_hash_sql}',
    'global:owner',
    false,
    false,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    password = EXCLUDED.password,
    "roleSlug" = EXCLUDED."roleSlug";
""".strip()

    if not run_psql(sql_user):
        # Try without UPDATE (maybe conflict is on email)
        sql_user_no_update = f"""
INSERT INTO "user" (id, email, "firstName", "lastName", password, "roleSlug", disabled, "mfaEnabled", "createdAt", "updatedAt")
VALUES (
    '{CI_USER_ID}', '{CI_EMAIL}', '{CI_FIRSTNAME}', '{CI_LASTNAME}',
    '{pw_hash_sql}', 'global:owner', false, false, NOW(), NOW()
) ON CONFLICT DO NOTHING;
""".strip()
        run_psql(sql_user_no_update)

    # 2. Create personal project
    print("\n2. Creating CI personal project...")
    sql_project = f"""
INSERT INTO project (id, name, type, "creatorId", "createdAt", "updatedAt")
VALUES (
    '{CI_PROJECT_ID}',
    'CI Personal Project',
    'personal',
    '{CI_USER_ID}',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;
""".strip()
    run_psql(sql_project)

    # 3. Create project relation (link user to project)
    print("\n3. Creating project relation...")
    sql_relation = f"""
INSERT INTO project_relation ("projectId", "userId", role, "createdAt", "updatedAt")
VALUES (
    '{CI_PROJECT_ID}',
    '{CI_USER_ID}',
    'project:personalOwner',
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING;
""".strip()
    run_psql(sql_relation)

    # 4. Verify
    print("\n4. Verifying...")
    run_psql('SELECT id, email, "roleSlug" FROM "user" WHERE id = \'' + CI_USER_ID + '\';')
    run_psql('SELECT id, name, type FROM project WHERE id = \'' + CI_PROJECT_ID + '\';')
    run_psql('SELECT "projectId", "userId", role FROM project_relation WHERE "userId" = \'' + CI_USER_ID + '\';')

    print("\n=== DB init complete ===")


if __name__ == "__main__":
    main()
