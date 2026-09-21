import os
import sys
import json
import argparse
import subprocess
import urllib.request
from datetime import datetime, timezone

LEGACY_API_URL = "http://adapt2.sis.pitt.edu/course-authoring/GetData?usr=moh70-authoring&grp=admins"


def fetch_legacy_data(api_url=LEGACY_API_URL):
    """
    Fetch course warehouse data from the legacy Course Authoring servlet API.
    Note: The legacy API returns a JavaScript object literal (unquoted keys, etc.)
    rather than valid JSON. We decode using latin1 to preserve special characters,
    then parse using Node.js eval (identical to legacy course.authoring.js).
    """
    print(f"Fetching legacy data from: {api_url} ...", file=sys.stderr)
    req = urllib.request.Request(api_url, headers={"User-Agent": "CourseAuthoring-Migrate/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        raw_bytes = resp.read()

    raw_js = raw_bytes.decode("latin1")
    print(f"Received {len(raw_js)} characters. Parsing JavaScript object with Node...", file=sys.stderr)

    node_cmd = [
        "node",
        "-e",
        "const fs = require('fs'); const raw = fs.readFileSync(0, 'utf-8'); const obj = eval('(' + raw + ')'); process.stdout.write(JSON.stringify(obj));"
    ]
    proc = subprocess.Popen(node_cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stdout, stderr = proc.communicate(input=raw_js.encode("utf-8"))
    if proc.returncode != 0:
        raise RuntimeError(f"Failed to parse JS object from legacy API: {stderr.decode('utf-8')}")

    data = json.loads(stdout.decode("utf-8"))
    return data["data"]


def load_local_data(file_path):
    print(f"Loading legacy data from local file: {file_path} ...")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read().strip()
    try:
        data = json.loads(content)
        return data["data"] if "data" in data else data
    except json.JSONDecodeError:
        print("File is not standard JSON. Parsing as JavaScript object via Node...")
        node_cmd = [
            "node",
            "-e",
            "const fs = require('fs'); const raw = fs.readFileSync(0, 'utf-8'); const obj = eval('(' + raw + ')'); process.stdout.write(JSON.stringify(obj));"
        ]
        proc = subprocess.Popen(node_cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        stdout, stderr = proc.communicate(input=content.encode("utf-8"))
        if proc.returncode != 0:
            raise RuntimeError(f"Failed to parse JS object: {stderr.decode('utf-8')}")
        data = json.loads(stdout.decode("utf-8"))
        return data["data"] if "data" in data else data


def transform_course(course, prev_activities, prev_providers, prev_authors, next_idseq):
    cid = int(course["id"])
    course_copy = json.loads(json.dumps(course))
    del course_copy["id"]

    course_copy["cid"] = cid
    course_copy["code"] = course_copy.get("num", "")
    course_copy.pop("num", None)

    created_info = course_copy.get("created", {})
    author_name = created_info.get("by", "")
    author_obj = prev_authors.get(author_name)
    author_id = author_obj["id"].lower() if author_obj and "id" in author_obj else "unknown"
    course_copy["user_email"] = f"{author_id}@ca.paws.lab"

    try:
        course_copy["created_at"] = datetime.strptime(
            created_info["on"], "%Y-%m-%d %H:%M:%S.%f"
        ).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
    except Exception:
        course_copy["created_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"

    course_copy["updated_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
    course_copy.pop("created", None)

    course_copy["domain"] = course_copy.get("domainId", "")
    course_copy.pop("domainId", None)

    desc = course_copy.get("desc")
    course_copy["description"] = desc if desc and desc != "null" else ""
    course_copy.pop("desc", None)

    course_copy["published"] = course_copy.get("visible") == "1"
    course_copy.pop("visible", None)

    course_copy.pop("isMy", None)
    course_copy.pop("groupCount", None)

    if not course_copy.get("institution") or course_copy.get("institution") == "NULL":
        course_copy["institution"] = "unknown"

    rsrcids_mapping = {r["id"]: next_idseq() for r in course_copy.get("resources", [])}
    unitids_mapping = {u["id"]: next_idseq() for u in course_copy.get("units", [])}

    for r in course_copy.get("resources", []):
        r["id"] = rsrcids_mapping[r["id"]]
        r["providers"] = [prev_providers[p] for p in r.get("providerIds", []) if p in prev_providers]
        r.pop("providerIds", None)

    for u in course_copy.get("units", []):
        u["id"] = unitids_mapping[u["id"]]
        u["level"] = 0
        u["published"] = True
        u["activities"] = {
            rsrcids_mapping[r_id]: [
                prev_activities[int(a_id)]
                for a_id in r_acts
                if a_id not in ["965", "967", "968"] and int(a_id) in prev_activities
            ]
            for r_id, r_acts in u.get("activityIds", {}).items()
            if r_id in rsrcids_mapping
        }
        u.pop("activityIds", None)

    course_copy["tags"] = []
    return course_copy


def main():
    parser = argparse.ArgumentParser(description="Clone / Migrate legacy courses from ADAPT2 Course Authoring")
    parser.add_argument("--cid", default="461", help="Legacy course ID (CID) to clone (e.g. 461). Use 'all' for all courses.")
    parser.add_argument("--local-file", default=None, help="Optional path to local prev-courseauthoring.json (skips network)")
    parser.add_argument("--api-url", default=LEGACY_API_URL, help="Legacy API URL")
    parser.add_argument("--output", default=None, help="Output JSON file path")
    parser.add_argument("--stdout", action="store_true", help="Print transformed JSON to standard output")
    args = parser.parse_args()

    # 1. Fetch or load legacy data
    if args.local_file:
        prev = load_local_data(args.local_file)
    else:
        try:
            prev = fetch_legacy_data(args.api_url)
        except Exception as e:
            print(f"Warning: Failed to fetch from legacy API ({e}). Falling back to local file...")
            script_dir = os.path.dirname(os.path.abspath(__file__))
            fallback_path = os.path.join(script_dir, "prev-courseauthoring.json")
            prev = load_local_data(fallback_path)

    # 2. Index activities, providers, authors
    prev_courses = {str(c["id"]): c for c in prev["courses"]}
    prev_activities = {int(a["id"]): {
        "id": int(a["id"]),
        "provider_id": a.get("providerId") or a.get("provider_id"),
        "author_id": a.get("authorId") or a.get("author_id"),
        "name": a.get("name"),
        "url": a.get("url"),
        "domain": a.get("domain"),
        "tags": a.get("tags") or []
    } for a in prev["activities"]}

    prev_providers = {
        p["id"]: {"id": p["id"], "name": p["name"], "domain": p["domainId"]}
        for p in prev["providers"]
    }
    # Fallback provider if needed
    prev_providers.setdefault("pcex_activity", {"id": "pcex_activity", "name": "PCEx Activities", "domain": "pcex"})

    prev_authors = {a["name"]: a for a in prev["authors"]}

    idseq = int(datetime.now(timezone.utc).timestamp() * 1000)
    def next_idseq():
        nonlocal idseq
        idseq += 1
        return idseq

    # 3. Clone single course or all
    if args.cid != "all":
        target_cid = str(args.cid)
        if target_cid not in prev_courses:
            print(f"Error: Course CID {target_cid} not found in legacy data!")
            sys.exit(1)

        raw_course = prev_courses[target_cid]
        cloned = transform_course(raw_course, prev_activities, prev_providers, prev_authors, next_idseq)

        if args.stdout:
            print(json.dumps(cloned, indent=2, ensure_ascii=False))
            return

        out_file = args.output or os.path.join(os.path.dirname(os.path.abspath(__file__)), f"course-{target_cid}.json")
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(cloned, f, indent=2, ensure_ascii=False)

        print(f"\nSuccessfully cloned legacy course CID {target_cid}!")
        print(f"  Name:        {cloned['name']}")
        print(f"  Code:        {cloned['code']}")
        print(f"  CID:         {cloned['cid']}")
        print(f"  Domain:      {cloned['domain']}")
        print(f"  Institution: {cloned['institution']}")
        print(f"  User Email:  {cloned['user_email']}")
        print(f"  Units:       {len(cloned['units'])}")
        print(f"  Resources:   {len(cloned['resources'])}")
        act_count = sum(len(acts) for u in cloned["units"] for acts in u["activities"].values())
        print(f"  Activities:  {act_count}")
        print(f"  Saved to:    {out_file}")
    else:
        courses = []
        authors = {}
        for c in prev_courses.values():
            if c.get("created", {}).get("by") == "Mohammad Hassany":
                continue
            cloned = transform_course(c, prev_activities, prev_providers, prev_authors, next_idseq)
            courses.append(cloned)
            authors[cloned["user_email"]] = prev_authors.get(c.get("created", {}).get("by"), {})

        for author in authors.values():
            if "name" in author:
                split = author["name"].split(", ")
                if len(split) > 1 and split[0] == split[1]:
                    author["name"] = split[0]
                author["name"] = author["name"].strip()

        out_file = args.output or os.path.join(os.path.dirname(os.path.abspath(__file__)), "courses-to-migrate.json")
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(courses, f, indent=2, ensure_ascii=False)
        print(f"Successfully migrated {len(courses)} courses to {out_file}")


if __name__ == "__main__":
    main()