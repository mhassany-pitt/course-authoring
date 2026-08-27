#!/usr/bin/env python3
import os
import sys
import json
import argparse
from pathlib import Path

def patch_courses(mongo_uri="mongodb://localhost:27017/course-authoring", update_json=True, apply_db=True):
    base_dir = Path(__file__).resolve().parent.parent
    prev_path = base_dir / "migrate-old_courses" / "prev-courseauthoring.json"
    migrated_path = base_dir / "migrate-old_courses" / "courses-to-migrate.json"

    if not prev_path.exists():
        print(f"Error: Could not find {prev_path}")
        sys.exit(1)

    print(f"Loading legacy courses from {prev_path}...")
    prev_data = json.load(open(prev_path))["data"]
    prev_courses = prev_data["courses"]
    print(f"Loaded {len(prev_courses)} legacy courses.")

    # 1. Update courses-to-migrate.json if requested
    if update_json and migrated_path.exists():
        print(f"Updating {migrated_path} with cid values...")
        migrated_courses = json.load(open(migrated_path))
        patched_count = 0
        for m in migrated_courses:
            candidates = [
                p for p in prev_courses
                if p.get("num") == m.get("code") and p.get("name") == m.get("name")
            ]
            if len(candidates) == 1:
                m["cid"] = int(candidates[0]["id"])
                patched_count += 1
            elif len(candidates) > 1:
                for c in candidates:
                    created_at_prefix = c["created"]["on"].replace(" ", "T")[:19]
                    if m.get("created_at", "").startswith(created_at_prefix):
                        m["cid"] = int(c["id"])
                        patched_count += 1
                        break
        json.dump(migrated_courses, open(migrated_path, "w"), indent=2)
        print(f"Successfully patched {patched_count} / {len(migrated_courses)} courses in {migrated_path}.")

    # 2. Patch MongoDB if requested
    if apply_db:
        try:
            from pymongo import MongoClient
        except ImportError:
            print("pymongo is not installed. To patch MongoDB directly, run: pip install pymongo")
            return

        print(f"Connecting to MongoDB at {mongo_uri}...")
        try:
            client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
            db_name = mongo_uri.rsplit("/", 1)[-1].split("?")[0] or "course-authoring"
            db = client[db_name]
            courses_coll = db["courses"]
            
            # Check connection
            total_db_courses = courses_coll.count_documents({})
            print(f"Connected. Total courses in MongoDB 'courses' collection: {total_db_courses}")

            matched_in_db = 0
            for p in prev_courses:
                cid = int(p["id"])
                code = p.get("num")
                name = p.get("name")
                
                # Match by code and name
                filter_q = {"code": code, "name": name}
                res = courses_coll.update_many(filter_q, {"$set": {"cid": cid}})
                if res.matched_count > 0:
                    matched_in_db += res.matched_count
                else:
                    # Fallback match by name
                    res_name = courses_coll.update_many({"name": name, "cid": {"$exists": False}}, {"$set": {"cid": cid}})
                    if res_name.matched_count > 0:
                        matched_in_db += res_name.matched_count

            print(f"Patched {matched_in_db} course document(s) in MongoDB with their legacy cid.")
        except Exception as e:
            print(f"MongoDB connection or update failed: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Patch course schema with legacy cid")
    parser.add_argument("--mongo-uri", default=os.getenv("MONGO_URI", "mongodb://localhost:27017/course-authoring"), help="MongoDB connection URI")
    parser.add_argument("--no-db", action="store_true", help="Skip MongoDB update (only update JSON files)")
    args = parser.parse_args()

    patch_courses(mongo_uri=args.mongo_uri, update_json=True, apply_db=not args.no_db)

