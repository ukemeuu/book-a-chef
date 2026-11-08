#!/usr/bin/env python3
"""Finish onboarding Kennedy Milanya Ouma — his auth account already exists."""
import json
import os
import subprocess
from datetime import datetime, timezone

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

USER_ID = "648ebe40-7248-4c86-9b0d-d95882e1891a"
EMAIL = "kennedymillanya1989@gmail.com"
NAME = "Kennedy Milanya Ouma"
PHONE = "0724432022"
APP_ID = "67514303-470c-4601-b117-d017ee503dfc"


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
    code = int(status.strip() or 0)
    raw = raw.strip()
    try:
        return code, (json.loads(raw) if raw else None)
    except Exception:
        return code, raw


chef_payload = {
    "user_id": USER_ID,
    "name": NAME,
    "slug": "kennedy-milanya-ouma",
    "brand_name": "Milanya Kitchen",
    "tagline": "International chef and private dining host",
    "bio": "International chef and food lover with experience across Swahili, seafood, nyama choma, Italian, Indian and Pan-Asian cuisines. Chef Kennedy hosts private cooking, yacht parties and bespoke dining experiences in Nairobi.",
    "city": "Nairobi",
    "service_areas": ["Kilimani", "Westlands", "Karen", "Runda"],
    "cuisines": ["Swahili", "Seafood", "Nyama Choma", "BBQ", "Kenyan Traditional",
                 "Italian", "Indian", "Pan-Asian", "Fine Dining", "Continental",
                 "French", "Mediterranean"],
    "dietary_specialties": ["Halal", "Vegetarian", "Vegan / Plant-Based"],
    "price_per_guest": 4500,
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
    "phone": PHONE,
    "email": EMAIL,
}

status, chef = req("POST", "/rest/v1/chefs", chef_payload, prefer="return=representation")
if status not in (200, 201) or not chef:
    print(f"FAIL create chef: {chef}")
    raise SystemExit(1)
chef = chef[0]
print(f"created chef: {chef['name']} | slug={chef['slug']} | id={chef['id']}")

# Fix the profile role (trigger blocks UPDATE).
req("DELETE", f"/rest/v1/profiles?id=eq.{USER_ID}")
status, prof = req("POST", "/rest/v1/profiles", {
    "id": USER_ID, "email": EMAIL, "full_name": NAME, "phone": PHONE, "role": "chef",
}, prefer="return=representation")
print(f"profile role -> {prof[0]['role'] if prof else 'FAILED'}")

# Re-link the chef row.
req("PATCH", f"/rest/v1/chefs?id=eq.{chef['id']}",
     {"user_id": USER_ID, "email": EMAIL, "phone": PHONE})

# Seed a menu.
req("POST", "/rest/v1/menus", {
    "chef_id": chef["id"],
    "title": "Signature International Tasting Menu",
    "tag": "Signature",
    "description": "A signature menu built around Chef Kennedy's international cooking.",
    "price_per_guest": 4500,
    "courses": {
        "appetizer": {"name": "Seasonal opening", "description": "Chef's selection"},
        "main": {"name": "Chef's Signature", "description": "Signature course"},
        "dessert": {"name": "Closing course", "description": "Chef's selection"},
    },
    "is_active": True,
})
print("menu seeded")

# Approve the application.
req("PATCH", f"/rest/v1/chef_applications?id=eq.{APP_ID}", {
    "status": "approved",
    "reviewed_at": datetime.now(timezone.utc).isoformat(),
})
print("application approved")
