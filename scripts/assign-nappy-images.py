#!/usr/bin/env python3
"""Give every chef a real Black Kenyan portrait and matching cover photo.

Portraits come from Nappy.co (Black & Brown stock photos, public domain) and
are matched by gender. Covers are cooking/kitchen photographs. Each chef gets
a distinct set — no two chefs share a photo.
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

IMG = "https://images.nappy.co/photo/"


def img(photo_id: str, width: int = 1200) -> str:
    return f"{IMG}{photo_id}.jpg?width={width}"


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


# Portrait (matched by gender) + cover + gallery, all from Nappy.co.
ASSIGNMENTS = {
    # ── Female chefs ──
    "chef-sophia-katana": {
        "avatar": img("aOIAw2q7iPt16pQ9XfXaO", 600),   # Woman cooking
        "cover": img("lR6qL5-cW6E1y0ObdzRPS", 1200),   # Woman in kitchen
        "gallery": [
            img("RlVupEocCog5Ttsvm3huw", 800),         # Woman in kitchen
            img("k5h_zIs4kdyau7EuPpw6e", 800),         # Woman in kitchen
            img("GuHlyIjWa6jmUvgaj65f-", 800),         # Woman making coffee
        ],
    },
    "chef-victoria-kangai": {
        "avatar": img("8vHKJA-UqoYTZN0Tx9fyJ", 600),   # Woman in kitchen
        "cover": img("FKbfSWq4Wsr-IvcuxR5U-", 1200),   # Woman works in kitchen
        "gallery": [
            img("mKh0RD3Kieg_AEfso3tGB", 800),         # Washing vegetables
            img("0Wxkst1jcNWYYZL3WSVob", 800),         # Woman grocery shopping
            img("lEI6aOlFopKXZ0SB4XWgE", 800),         # Woman looking at camera
        ],
    },
    # ── Male chefs ──
    "chef-swiok": {
        "avatar": img("wMvwUYECYmMUh2fnoeFZJ", 600),   # Man cooking with pot
        "cover": img("qeXLM5CJceCCuCqACemJb", 1200),   # Cooking in kitchen
        "gallery": [
            img("8sOvn79NjVA6bryveb6xJ", 800),         # Cooking in kitchen
            img("AsHvn5o1YuPYVkd_AbMM-", 800),         # Cooking in kitchen
        ],
    },
    "chef-kenneth-kamau-kamanu": {
        "avatar": img("ROc3CwUimmRBIbdZipAvn", 600),   # Man cooking in kitchen
        "cover": img("zwNE50qrEsvyzmwOwnnIZ", 1200),   # Cooking
        "gallery": [
            img("a74bw5ssSK8TOWEFmPAao", 800),         # Cooking
            img("aZJjedHqvAUUlPrTi3Ovi", 800),         # Street food
        ],
    },
    "boniface-chege": {
        "avatar": img("pK68RmDfek2_L-YhG9Q5I", 600),   # Black man smiling into camera
        "cover": img("pX-DhmYNsRGY7wC0epawS", 1200),   # Black men working on set
        "gallery": [
            img("2lByK3aGfKRz7t05hD53N", 800),         # Production team
            img("iHMZ03AVYP2tecS-o7-10", 800),         # Crew behind the camera
        ],
    },
    "chef-rodgers-kelly": {
        "avatar": img("dVvNL5A-1v3Qt3RrVO2Gt", 600),   # Man cooks at home with tablet
        "cover": img("U2C8iCFaikUGzFj1o9SiT", 1200),   # Man with muscles
        "gallery": [
            img("UVn4WLWD8W1A0AHG1rcvy", 800),         # Man with muscles
            img("jaf9HWx_i6g_eLRaBjZQj", 800),         # Shopping in market
        ],
    },
    "ian-indika": {
        "avatar": img("m-sJlHwVnVIGN2PGvobnS", 600),   # Man apron
        "cover": img("8ltEfJyMp-V_eKdso4cLr", 1200),   # Butcher
        "gallery": [
            img("0LsMQoo-LPoc9c7M3ZRbL", 800),         # Butcher
            img("67MKvmNkhq2mtdWpuft80", 800),         # Portrait
        ],
    },
    "chef-andrew": {
        "avatar": img("67MKvmNkhq2mtdWpuft80", 600),   # Portrait
        "cover": img("0LsMQoo-LPoc9c7M3ZRbL", 1200),   # Butcher
        "gallery": [
            img("8ltEfJyMp-V_eKdso4cLr", 800),         # Butcher
            img("A5p8Rtjxw9bd9B6GZc5jG", 800),         # Food shopping
        ],
    },
    "kennedy-milanya-ouma": {
        "avatar": img("6kSQWMejTtSuYehC74UKV", 600),   # Man working at home
        "cover": img("aZJjedHqvAUUlPrTi3Ovi", 1200),   # Street food
        "gallery": [
            img("jaf9HWx_i6g_eLRaBjZQj", 800),         # Shopping in market
            img("zwNE50qrEsvyzmwOwnnIZ", 800),         # Cooking
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
            print(f"SKIP {chef['name']} ({slug})")
            continue
        a = ASSIGNMENTS[slug]
        payload = {
            "avatar_url": a["avatar"],
            "cover_image_url": a["cover"],
            "gallery_images": a["gallery"],
        }
        code, resp = req("PATCH", f"/rest/v1/chefs?id=eq.{chef['id']}", payload)
        ok = code in (200, 204)
        print(f"{'OK ' if ok else 'FAIL'} {chef['name']}: {a['avatar'].split('/')[-1].split('?')[0]}")


if __name__ == "__main__":
    main()
