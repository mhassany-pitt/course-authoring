import os
import sys
import json
import urllib.request
import urllib.error
import ssl

ssl_context = ssl._create_unverified_context()

API_BASE = os.environ.get("CATALOG_API_BASE", "https://adapt2.sis.pitt.edu/next.course-authoring/api")
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
    return "724f107f-134e-480c-a1b3-4ec55b039290"

def push_all(target_file=None):
    token = get_api_token()
    headers = {
        "Content-Type": "application/json",
        "api-token": token,
        "api-user-email": API_USER_EMAIL,
    }

    if target_file:
        file_path = os.path.abspath(target_file) if os.path.isabs(target_file) else os.path.join(os.path.dirname(__file__), target_file)
        with open(file_path) as f:
            data = json.load(f)
            items = data if isinstance(data, list) else [data]
    else:
        items_path = os.path.join(os.path.dirname(__file__), "items.json")
        with open(items_path) as f:
            items = json.load(f)

    # Check existing items to avoid duplicates
    print(f"Fetching existing catalog items from {API_BASE}/catalog-v2...")
    req_cat = urllib.request.Request(f"{API_BASE}/catalog-v2", headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req_cat, context=ssl_context, timeout=30) as resp:
            existing_catalog = json.loads(resp.read().decode('utf-8'))
            existing_slugs = {it.get('identity', {}).get('id'): it.get('id') for it in existing_catalog if it.get('identity', {}).get('id')}
    except Exception as e:
        print(f"Warning: Could not fetch catalog list ({e}). Continuing without duplicate check.")
        existing_slugs = {}

    print(f"Pushing {len(items)} items to {API_BASE}/slc-items-api as {API_USER_EMAIL}...\n")
    results = []

    for index, item in enumerate(items, 1):
        title = item.get("identity", {}).get("title", "Untitled")
        slug = item.get("identity", {}).get("id", "")

        if slug in existing_slugs:
            existing_id = existing_slugs[slug]
            print(f"[{index:2d}/{len(items)}] [SKIPPED] Already exists: {title}")
            print(f"    Slug: {slug}")
            print(f"    Catalog ID: {existing_id}\n")
            results.append({"slug": slug, "status": "exists", "id": existing_id, "title": title})
            continue

        payload = json.dumps(item).encode("utf-8")

        req = urllib.request.Request(
            f"{API_BASE}/slc-items-api",
            data=payload,
            headers=headers,
            method="POST"
        )

        try:
            with urllib.request.urlopen(req, context=ssl_context, timeout=30) as resp:
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

    success_count = sum(1 for r in results if str(r.get("status")).startswith("2") or r.get("status") == "exists")
    print("=" * 60)
    print(f"Summary: {success_count}/{len(items)} items processed successfully.")

    return results

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else None
    push_all(target)
