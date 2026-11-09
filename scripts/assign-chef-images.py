#!/usr/bin/env python3
"""Assign a unique portrait and cover image to each chef.

Each chef gets a distinct portrait and a distinct cover photo matched to
their cuisine. Images are Unsplash URLs (verified working) and are stored
directly on the chef row — no uploads required.
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

U = "https://images.unsplash.com/"


def req(method, path, body=None):
    cmd = ["curl", "-s", "-m", "60", "-X", method, f"{URL}{path}",
           "-H", f"apikey: {KEY}",
           "-H", f"Authorization: Bearer {KEY}",
           "-H", "Content-Type: application/json"]
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


# Unique portraits (verified working) and cover photos matched to each chef.
# Avatars are chef portraits; covers are food photographs.
ASSIGNMENTS = {
    "chef-swiok": {
        "avatar": U + "photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=600",
        "cover": U + "photo-1559737558-2f5a35f4523b?auto=format&fit=crop&q=80&w=1200",
        "gallery": [
            U + "photo-1559737558-2f5a35f4523b?auto=format&fit=crop&q=80&w=800",
            U + "photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=800",
        ],
    },
    "chef-kenneth-kamau-kamanu": {
        "avatar": U + "photo-1583394293214-28ded15ee548?auto=format&fit=crop&q=80&w=600",
        "cover": U + "photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=1200",
        "gallery": [
            U + "photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=800",
            U + "photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=800",
        ],
    },
    "boniface-chege": {
        "avatar": U + "photo-1581299894007-aaa50297cf16?auto=format&fit=crop&q=80&w=600",
        "cover": U + "photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=1200",
        "gallery": [
            U + "photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=800",
            U + "photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800",
        ],
    },
    "chef-rodgers-kelly": {
        "avatar": U + "photo-1571260899304-425eee4c7efc?auto=format&fit=crop&q=80&w=600",
        "cover": U + "photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=1200",
        "gallery": [
            U + "photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=800",
            U + "photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800",
        ],
    },
    "chef-sophia-katana": {
        "avatar": U + "photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=600",
        "cover": U + "photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&q=80&w=1200",
        "gallery": [
            U + "photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&q=80&w=800",
            U + "photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=800",
        ],
    },
    "chef-victoria-kangai": {
        "avatar": U + "photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&q=80&w=600",
        "cover": U + "photo-1585937421612-70a008356fbe?auto=format&fit=crop&q=80&w=1200",
        "gallery": [
            U + "photo-1585937421612-70a008356fbe?auto=format&fit=crop&q=80&w=800",
            U + "photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=800",
        ],
    },
    "ian-indika": {
        "avatar": U + "photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=600",
        "cover": U + "photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=1200",
        "gallery": [
            U + "photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=800",
            U + "photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&q=80&w=800",
        ],
    },
    "chef-andrew": {
        # No portrait left — use a food photograph as the avatar instead.
        "avatar": U + "photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600",
        "cover": U + "photo-1512058564366-18510be2db19?auto=format&fit=crop&q=80&w=1200",
        "gallery": [
            U + "photo-1512058564366-18510be2db19?auto=format&fit=crop&q=80&w=800",
            U + "photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800",
        ],
    },
    "kennedy-milanya-ouma": {
        # No portrait left — use a food photograph as the avatar instead.
        "avatar": U + "photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&q=80&w=600",
        "cover": U + "photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&q=80&w=1200",
        "gallery": [
            U + "photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&q=80&w=800",
            U + "photo-1476224203421-9ac39bcb3327?auto=format&fit=crop&q=80&w=800",
        ],
    },
}


def main():
    status, chefs = req("GET", "/rest/v1/chefs?select=id,slug,name,avatar_url&order=name")
    if status != 200:
        print(f"Failed to fetch chefs: {chefs}")
        return

    for chef in chefs:
        slug = chef["slug"]
        if slug not in ASSIGNMENTS:
            print(f"SKIP {chef['name']} ({slug}) — no assignment")
            continue
        a = ASSIGNMENTS[slug]
        payload = {
            "avatar_url": a["avatar"],
            "cover_image_url": a["cover"],
            "gallery_images": a["gallery"],
        }
        code, resp = req("PATCH", f"/rest/v1/chefs?id=eq.{chef['id']}", payload)
        ok = code == 200 or code == 204
        print(f"{'OK ' if ok else 'FAIL'} {chef['name']}: avatar={a['avatar'].split('/')[-1].split('?')[0]}")
        if not ok:
            print("   ", resp)


if __name__ == "__main__":
    main()
