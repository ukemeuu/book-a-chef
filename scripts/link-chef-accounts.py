#!/usr/bin/env python3
"""Link chef login accounts for the directory.

For each chef that has an application email and no login yet:
  1. Create a Supabase auth user (email confirmed, temp password).
  2. Link the chef row to that user (user_id, email, phone).
  3. Fix the profile role — a BEFORE UPDATE trigger forces role='client',
     so delete and re-insert the profile with role='chef'.
  4. Generate a recovery link so the chef can set their own password.
"""
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env = {}
with open(os.path.join(ROOT, ".env.local")) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k] = v

URL = env["NEXT_PUBLIC_SUPABASE_URL"]
KEY = env["SUPABASE_SERVICE_ROLE_KEY"]


def req(method, path, body=None, prefer=None, raw_url=None):
    url = raw_url or f"{URL}{path}"
    cmd = ["curl", "-s", "-m", "60", "-X", method, url,
           "-H", f"apikey: {KEY}",
           "-H", f"Authorization: Bearer {KEY}",
           "-H", "Content-Type: application/json"]
    if prefer:
        cmd += ["-H", f"Prefer: {prefer}"]
    if body is not None:
        cmd += ["-d", json.dumps(body)]
    cmd += ["-w", "\n__STATUS__%{http_code}"]
    out = subprocess.run(cmd, capture_output=True, text=True, check=False).stdout
    raw, _, status = out.rpartition("__STATUS__")
    status_code = int(status.strip() or 0)
    raw = raw.strip()
    try:
        return status_code, (json.loads(raw) if raw else None)
    except Exception:
        return status_code, raw


def get_all(path):
    status, data = req("GET", path)
    if status != 200:
        raise RuntimeError(f"GET {path} -> {status}: {data}")
    return data


def main():
    apps = get_all("/rest/v1/chef_applications?select=full_name,email,phone,city,neighborhood,cuisines,dietary,starting_price,specialty_dish,bio,experience_years&order=created_at")
    chefs = get_all("/rest/v1/chefs?select=id,name,slug,email,user_id,phone,city,cuisines,dietary_specialties,price_per_guest,bio,experience_years&order=name")

    # Map chef name -> application (latest application per email/name).
    app_by_name = {}
    for a in apps:
        name = (a.get("full_name") or "").strip()
        if name and a.get("email"):
            app_by_name[name] = a

    linked = []
    skipped = []
    for c in chefs:
        name = c["name"]
        if c.get("user_id"):
            skipped.append((name, "already linked"))
            continue
        app = app_by_name.get(name)
        if not app:
            skipped.append((name, "no application email"))
            continue

        email = app["email"].strip().lower()
        phone = (app.get("phone") or "").strip() or None
        password = "Bkc2026!Welcome"

        # 1. Create the auth user.
        status, created = req("POST", "/auth/v1/admin/users", {
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"full_name": name, "phone": phone, "role": "chef"},
        })
        if status not in (200, 201):
            skipped.append((name, f"create user failed: {created}"))
            continue
        user_id = created["id"]

        # 2. Link the chef row.
        status, updated = req("PATCH", f"/rest/v1/chefs?id=eq.{c['id']}", {
            "user_id": user_id,
            "email": email,
            "phone": phone,
        }, prefer="return=representation")
        if status != 200 or not updated:
            skipped.append((name, f"link chef failed: {updated}"))
            continue

        # 3. Fix the profile role (a BEFORE UPDATE trigger forces role='client').
        # Deleting the profile sets chefs.user_id to NULL (ON DELETE SET NULL),
        # so re-link the chef row after re-inserting.
        req("DELETE", f"/rest/v1/profiles?id=eq.{user_id}")
        status, prof = req("POST", "/rest/v1/profiles", {
            "id": user_id,
            "email": email,
            "full_name": name,
            "phone": phone,
            "role": "chef",
        }, prefer="return=representation")
        if status not in (200, 201):
            skipped.append((name, f"profile re-insert failed: {prof}"))
            continue

        # Re-link the chef row (the delete nulled user_id).
        req("PATCH", f"/rest/v1/chefs?id=eq.{c['id']}", {
            "user_id": user_id,
            "email": email,
            "phone": phone,
        })

        # 4. Generate a recovery link.
        status, link = req("POST", "/auth/v1/admin/generate_link", {
            "type": "recovery",
            "email": email,
            "options": {"redirect_to": "https://bookachef.co.ke/reset-password"},
        })
        invite = None
        if isinstance(link, dict):
            invite = link.get("properties", {}).get("action_link") or link.get("action_link")

        linked.append({
            "name": name,
            "email": email,
            "phone": phone,
            "user_id": user_id,
            "temp_password": password,
            "invite": invite,
        })

    print(json.dumps({"linked": linked, "skipped": skipped}, indent=2))


if __name__ == "__main__":
    main()
