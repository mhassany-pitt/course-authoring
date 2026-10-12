import os
import sys
import json
import urllib.request
import urllib.error

API_BASE = os.environ.get("CATALOG_API_BASE", "http://adapt2.sis.pitt.edu/next.course-authoring/api")
API_USER_EMAIL = os.environ.get("CATALOG_API_USER_EMAIL", "moh70@pitt.edu")
TOKEN_PATH = os.path.join(os.path.dirname(__file__), "..", "catalogv2_fixes", "api_token.txt")

def get_api_token():
    if os.path.exists(TOKEN_PATH):
        with open(TOKEN_PATH) as f:
            return f.read().strip()
    storage_token = os.path.join(os.path.dirname(__file__), "..", "..", "authoring-storage", "SLCS_CATALOG_API_TOKENS.txt")
    if os.path.exists(storage_token):
        with open(storage_token) as f:
            return f.read().splitlines()[0].strip()
    raise FileNotFoundError("Could not find api_token.txt or SLCS_CATALOG_API_TOKENS.txt")

def push_all():
    token = get_api_token()
    headers = {
        "Content-Type": "application/json",
        "api-token": token,
        "api-user-email": API_USER_EMAIL,
    }

    items_path = os.path.join(os.path.dirname(__file__), "items.json")
    with open(items_path) as f:
        items = json.load(f)

    print(f"Pushing {len(items)} items to {API_BASE}/slc-items-api as {API_USER_EMAIL}...\n")
    results = []

    for index, item in enumerate(items, 1):
        title = item.get("identity", {}).get("title", "Untitled")
        slug = item.get("identity", {}).get("id", "")
        payload = json.dumps(item).encode("utf-8")

        req = urllib.request.Request(
            f"{API_BASE}/slc-items-api",
            data=payload,
            headers=headers,
            method="POST"
        )

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                resp_data = json.loads(resp.read().decode("utf-8"))
                new_id = resp_data.get("id") or resp_data.get("_id")
                print(f"[{index:2d}/{len(items)}] [{resp.status}] Created: {title}")
                print(f"    Slug: {slug}")
                print(f"    Catalog ID: {new_id}\n")
                results.append({"slug": slug, "status": resp.status, "id": new_id, "title": title})
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="ignore")
            print(f"[{index:2d}/{len(items)}] [ERROR {e.code}] Failed: {title}")
            print(f"    Reason: {err_body}\n")
            results.append({"slug": slug, "status": e.code, "error": err_body, "title": title})
        except Exception as e:
            print(f"[{index:2d}/{len(items)}] [ERROR] Failed: {title}: {e}\n")
            results.append({"slug": slug, "status": "error", "error": str(e), "title": title})

    success_count = sum(1 for r in results if str(r.get("status")).startswith("2"))
    print("=" * 60)
    print(f"Summary: {success_count}/{len(items)} items successfully pushed to catalog.")

    return results

if __name__ == "__main__":
    push_all()
