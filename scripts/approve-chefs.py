#!/usr/bin/env python3
"""Approve chef applications and create their directory profiles.

Mirrors POST /api/admin/chef-actions (action: "approve") but runs directly
against the Supabase API with the service role key, for bulk onboarding.
"""
import json
import os
import subprocess

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
SITE = "https://bookachef.co.ke"

TARGET_EMAILS = [
    "kennedymillanya1989@gmail.com",
    "ianindika37@gmail.com",
    "yabot32489@slotbeer.com",
]


def req(method, path, body=None, prefer=None):
    cmd = ["curl", "-s", "-m", "60", "-X", method, f"{URL}{path}",
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


def slugify(name):
    import re
    s = str(name or "").lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return re.sub(r"^-+|-+$", "", s)


def unique_slug(base):
    status, existing = req("GET", f"/rest/v1/chefs?slug=eq.{base}&select=slug")
    if status == 200 and existing:
        return f"{base}-{os.urandom(3).hex()}"
    return base


def main():
    for email in TARGET_EMAILS:
        email = email.lower()
        status, apps = req("GET", f"/rest/v1/chef_applications?email=eq.{email}&select=*")
        if status != 200 or not apps:
            print(f"SKIP {email}: no application")
            continue
        app = apps[0]
        name = (app.get("full_name") or "").strip()
        if not name:
            print(f"SKIP {email}: no name")
            continue

        phone = (app.get("phone") or "").strip() or None
        password = "Bkc2026!Welcome"

        # 1. Create auth user + profile (trigger makes role 'client').
        status, created = req("POST", "/auth/v1/admin/users", {
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"full_name": name, "phone": phone, "role": "chef"},
        })
        if status not in (200, 201):
            print(f"FAIL {name}: create user -> {created}")
            continue
        user_id = created["id"]

        # 2. Build the listing.
        slug = unique_slug(slugify(name))
        cuisines = app.get("cuisines") or ["Continental"]
        areas = [a for a in [app.get("neighborhood"), "Westlands", "Kilimani", "Karen"] if a]
        bio = (app.get("bio") or "").strip() or f"Private chef based in {app.get('city') or 'Nairobi'}."
        chef_payload = {
            "user_id": user_id,
            "name": name,
            "slug": slug,
            "brand_name": app.get("brand_name") or f"{name} Kitchen",
            "tagline": f"{cuisines[0]} dining, cooked in your kitchen",
            "bio": bio,
            "city": app.get("city") or "Nairobi",
            "service_areas": areas,
            "cuisines": cuisines,
            "dietary_specialties": app.get("dietary") or ["Halal"],
            "price_per_guest": float(app.get("starting_price") or 4500),
            "min_guests": 2,
            "max_guests": 30,
            "rating": 5,
            "reviews_count": 0,
            "verified": True,
            "verification_status": "approved",
            "avatar_url": "/icon.png",
            "cover_image_url": "/icon.png",
            "gallery_images": [],
            "is_available": False,
            "featured": False,
            "phone": phone,
            "email": email,
        }
        status, chef = req("POST", "/rest/v1/chefs", chef_payload, prefer="return=representation")
        if status not in (200, 201) or not chef:
            print(f"FAIL {name}: create chef -> {chef}")
            continue
        chef = chef[0]

        # 3. Fix the profile role (trigger blocks UPDATE).
        req("DELETE", f"/rest/v1/profiles?id=eq.{user_id}")
        req("POST", "/rest/v1/profiles", {
            "id": user_id,
            "email": email,
            "full_name": name,
            "phone": phone,
            "role": "chef",
        })
        # Re-link the chef row (delete nulled user_id).
        req("PATCH", f"/rest/v1/chefs?id=eq.{chef['id']}", {
            "user_id": user_id, "email": email, "phone": phone,
        })

        # 4. Seed a signature menu.
        dish = (app.get("specialty_dish") or "Chef's Signature").strip()
        req("POST", "/rest/v1/menus", {
            "chef_id": chef["id"],
            "title": f"{dish} Tasting Menu",
            "tag": "Signature",
            "description": f"A signature menu built around {dish}.",
            "price_per_guest": float(app.get("starting_price") or 4500),
            "courses": {
                "appetizer": {"name": "Seasonal opening", "description": "Chef's selection"},
                "main": {"name": dish, "description": "Signature course"},
                "dessert": {"name": "Closing course", "description": "Chef's selection"},
            },
            "is_active": True,
        })

        # 5. Mark the application approved.
        from datetime import datetime, timezone
        req("PATCH", f"/rest/v1/chef_applications?id=eq.{app['id']}", {
            "status": "approved",
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
        })

        print(f"APPROVED {name} | slug={slug} | phone={phone} | price={chef_payload['price_per_guest']}")


if __name__ == "__main__":
    main()
