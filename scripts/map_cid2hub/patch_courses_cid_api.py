#!/usr/bin/env python3
"""
patch_courses_cid_api.py

Automates setting the legacy course ID ('cid') on ported courses in the database
by calling the Course Authoring REST API with an Admin API token.

Usage:
  python3 scripts/patch_courses_cid_api.py --token ca_tok_YOUR_API_TOKEN
  python3 scripts/patch_courses_cid_api.py --token ca_tok_YOUR_API_TOKEN --dry-run
  python3 scripts/patch_courses_cid_api.py --token ca_tok_YOUR_API_TOKEN --api-url http://localhost:3000/api
"""

import os
import sys
import json
import argparse
import ssl
import urllib.request
import urllib.error
from pathlib import Path

def get_ssl_context(insecure=False):
    if insecure:
        return ssl._create_unverified_context()
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        pass
    try:
        return ssl.create_default_context()
    except Exception:
        return ssl._create_unverified_context()

def fetch_json(url, token, method="GET", body=None, ssl_context=None):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "User-Agent": "CourseAuthoring-CidPatcher/1.0"
    }
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    
    with urllib.request.urlopen(req, context=ssl_context) as resp:
        if resp.status in (200, 201):
            content = resp.read().decode("utf-8")
            return json.loads(content) if content else {}
        raise RuntimeError(f"HTTP {resp.status} response from {url}")

def main():
    parser = argparse.ArgumentParser(description="Patch course 'cid' values using Course Authoring Admin API")
    parser.add_argument("--token", default=os.getenv("API_TOKEN"), help="Admin API Token (ca_tok_...)")
    parser.add_argument("--api-url", default=os.getenv("API_URL", "http://localhost:3000/api"), help="Base API URL (default: http://localhost:3000/api)")
    parser.add_argument("--dry-run", action="store_true", help="Simulate patches without sending PATCH requests")
    parser.add_argument("--insecure", "-k", action="store_true", help="Skip SSL certificate verification")
    parser.add_argument("--verbose", "-v", action="store_true", help="Print courses with no legacy match as well")
    parser.add_argument("--legacy-json", default=None, help="Path to prev-courseauthoring.json")
    args = parser.parse_args()

    token = args.token
    if not token:
        print("Error: No API token provided. Pass --token ca_tok_... or set the API_TOKEN environment variable.")
        sys.exit(1)

    api_url = args.api_url.rstrip("/")
    ssl_context = get_ssl_context(insecure=args.insecure)

    # Locate legacy courses file
    base_dir = Path(__file__).resolve().parent.parent
    legacy_path = Path(args.legacy_json) if args.legacy_json else base_dir / "migrate-old_courses" / "prev-courseauthoring.json"

    if not legacy_path.exists():
        print(f"Error: Could not find legacy courses file at {legacy_path}")
        sys.exit(1)

    print(f"1. Loading legacy courses from: {legacy_path}")
    with open(legacy_path, "r", encoding="utf-8") as f:
        prev_data = json.load(f)["data"]
    prev_courses = prev_data["courses"]
    print(f"   Loaded {len(prev_courses)} legacy courses.\n")

    # Index legacy courses
    legacy_by_code_name = {}
    legacy_by_name = {}
    for pc in prev_courses:
        cid = int(pc["id"])
        code = (pc.get("num") or "").strip()
        name = (pc.get("name") or "").strip()
        if code and name:
            legacy_by_code_name[(code.lower(), name.lower())] = cid
        if name and name.lower() not in legacy_by_name:
            legacy_by_name[name.lower()] = cid

    # Fetch all courses from API
    admin_courses_url = f"{api_url}/courses/admin/all"
    print(f"2. Fetching courses from API: {admin_courses_url}...")
    try:
        courses = fetch_json(admin_courses_url, token, method="GET", ssl_context=ssl_context)
    except urllib.error.HTTPError as e:
        print(f"   API Error ({e.code}): {e.read().decode('utf-8')}")
        sys.exit(1)
    except urllib.error.URLError as e:
        if "CERTIFICATE_VERIFY_FAILED" in str(e) and not args.insecure:
            print(f"   SSL Error: {e}")
            print("   Tip: Re-run with --insecure (or -k) to bypass SSL verification.")
        else:
            print(f"   Failed to connect to API: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"   Failed to connect to API: {e}")
        sys.exit(1)

    print(f"   Successfully retrieved {len(courses)} courses from database via API.\n")

    # Process and patch
    print("3. Analyzing and patching course 'cid' values...")
    if args.dry_run:
        print("   [DRY-RUN MODE ENABLED - No changes will be made]")

    already_has_cid = 0
    patched_count = 0
    not_matched_count = 0
    errors_count = 0

    for c in courses:
        course_id = c.get("id")
        code = (c.get("code") or "").strip()
        name = (c.get("name") or "").strip()
        existing_cid = c.get("cid")

        if existing_cid is not None and int(existing_cid) > 0:
            already_has_cid += 1
            continue

        matched_cid = legacy_by_code_name.get((code.lower(), name.lower()))
        if matched_cid is None:
            matched_cid = legacy_by_name.get(name.lower())

        if matched_cid is not None:
            if args.dry_run:
                print(f"   [DRY-RUN] Course '{name}' [{code}] (ID: {course_id}) -> would set cid = {matched_cid}")
                patched_count += 1
            else:
                patch_url = f"{api_url}/courses/admin/{course_id}"
                try:
                    fetch_json(patch_url, token, method="PATCH", body={"cid": matched_cid}, ssl_context=ssl_context)
                    print(f"   [PATCHED] Course '{name}' [{code}] (ID: {course_id}) -> cid = {matched_cid}")
                    patched_count += 1
                except Exception as e:
                    print(f"   [ERROR] Failed to patch course '{name}' (ID: {course_id}): {e}")
                    errors_count += 1
        else:
            not_matched_count += 1
            if args.verbose:
                print(f"   [NO MATCH] Course '{name}' [{code}] (ID: {course_id}) -> no legacy course found")

    print("\n==========================================")
    print("           PATCH RUN SUMMARY              ")
    print("==========================================")
    print(f"Total courses retrieved via API: {len(courses)}")
    print(f"Courses already having 'cid':    {already_has_cid}")
    if args.dry_run:
        print(f"Courses that would be patched:   {patched_count}")
    else:
        print(f"Courses successfully patched:    {patched_count}")
    print(f"Courses with no legacy match:    {not_matched_count}")
    if errors_count:
        print(f"Errors encountered:              {errors_count}")
    print("==========================================")

if __name__ == "__main__":
    main()

