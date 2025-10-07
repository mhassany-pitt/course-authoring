import os
import json
from datetime import datetime

prev = json.load(open('./prev-courseauthoring.json'))["data"]
prev_courses = {c["id"]: c for c in prev["courses"]}
prev_activities = {a["id"]: a for a in prev["activities"]}
for pa in prev_activities.values():
    pa["id"] = int(pa["id"])
    pa["provider_id"] = pa["providerId"]
    del pa["providerId"]
    pa["author_id"] = pa["authorId"]
    del pa["authorId"]
prev_providers = {p["id"]: {"id":p["id"], "name":p["name"], "domain": p["domainId"]} for p in prev["providers"]}
prev_authors = {a["name"]: a for a in prev["authors"]}
# prev_domains = {d["id"]: d for d in prev["domains"]}

# prev_providers['pcex_activity'] = {"id":"pcex_activity", "name":"PCEx Activities", "domain":"pcex"}

idseq = 1790000000000
def next_idseq():
    global idseq
    idseq += 1
    return idseq

authors = {}
courses = []

for course in prev_courses.values():
    if course["created"]["by"] == "Mohammad Hassany":
        continue
    
    del course["id"] # this will be auto-generated
    
    course["code"] = course["num"]
    del course["num"]
    
    course["user_email"] = prev_authors[course["created"]["by"]]["id"].lower() + "@ca.paws.lab"
    course["created_at"] = datetime.strptime(course["created"]["on"], "%Y-%m-%d %H:%M:%S.%f").strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
    course["updated_at"] = course["created_at"]
    authors[course["user_email"]] = prev_authors[course["created"]["by"]]
    del course["created"]
    
    
    course["domain"] = course["domainId"]
    del course["domainId"]
    
    course["description"] = course["desc"] if course["desc"] and course["desc"] != "null" else ""
    del course["desc"]
    
    course["published"] = course["visible"] == "1"
    del course["visible"]
    
    del course["isMy"]
    del course["groupCount"]
    
    if not course[ "institution"] or course[ "institution"] == "NULL":
        course["institution"] = "unknown"
    
    rsrcids_mapping = {r["id"]: next_idseq() for r in course["resources"]}
    unitids_mapping = {u["id"]: next_idseq() for u in course["units"]}
    
    for r in course["resources"]:
        r["id"] = rsrcids_mapping[r["id"]]
        r["providers"] = [prev_providers[p] for p in r["providerIds"]]
        del r["providerIds"]
        
    for u in course["units"]:
        u["id"] = unitids_mapping[u["id"]]
        u["level"] = 0
        u["published"] = True
        u["activities"] = {
            rsrcids_mapping[r_id]: [
                prev_activities[a_id] 
                for a_id in r_acts
                if a_id not in ["965", "967", "968"]
            ]
            for r_id, r_acts in u["activityIds"].items()
            if r_id not in ["87"]
        }
        del u["activityIds"]
        
    course["tags"] = []
    
    courses.append(course)
    

for author in authors.values():
    split = author["name"].split(", ")
    if len(split) > 1 and split[0] == split[1]:
        author["name"] = split[0]
    author["name"] = author["name"].strip()

json.dump(courses, open('./courses-to-migrate.json', 'w'), indent=2)
json.dump(authors, open('./authors-to-migrate.json', 'w'), indent=2)