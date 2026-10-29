import urllib.request
import urllib.parse
import json
import os
import sys
import ssl

ssl_context = ssl._create_unverified_context()

if "/tmp/pylibs" not in sys.path and os.path.exists("/tmp/pylibs"):
    sys.path.insert(0, "/tmp/pylibs")

import yaml

BASE_API = "https://adapt2.sis.pitt.edu/cupcake/api/v1/activities/gillian-python"

TYPE_MAPPING = {
    "free-coding": "FreeCodingProblems",
    "worked-example": "CodeConstruction",
    "code-completion": "CodeCompletionProblem",
    "parameterized-code-tracing": "PredictingFinalResult",
    "code-tracing": "PredictingFinalResult",
}

def fetch_json(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, context=ssl_context) as resp:
        return json.loads(resp.read().decode('utf-8'))

def port_all(output_dir="."):
    root = fetch_json(BASE_API)
    activities = []
    for f in root.get('files', []):
        name = f['name']
        if f.get('isDirectory'):
            sub = fetch_json(f"{BASE_API}/{urllib.parse.quote(name)}")
            for sf in sub.get('files', []):
                if sf.get('isYaml'):
                    activities.append(f"{name}/{sf['name']}")
        elif f.get('isYaml'):
            activities.append(name)

    os.makedirs(output_dir, exist_ok=True)
    items = []

    for rel_path in sorted(activities):
        data = fetch_json(f"{BASE_API}/{urllib.parse.quote(rel_path)}")
        raw_yaml = data.get("content", "")
        y = yaml.safe_load(raw_yaml)

        # Companion source code
        source_file = y.get("source")
        source_code = ""
        if source_file:
            source_url = f"{BASE_API}/{urllib.parse.quote(source_file)}"
            try:
                sdata = fetch_json(source_url)
                source_code = sdata.get("content", "")
            except Exception as e:
                print(f"Warning: could not fetch source file {source_file}: {e}")

        # Activity type
        cupcake_type = y.get("pedagogy", {}).get("activity", "")
        catalog_type = TYPE_MAPPING.get(cupcake_type, "Question")

        # Authors & Publisher
        raw_authors = y.get("authors", []) or []
        authors = []
        affiliations = set()
        for a in raw_authors:
            name = f"{a.get('first', '')} {a.get('last', '')}".strip()
            aff = a.get("affiliation", "")
            if aff:
                affiliations.add(aff)
            authors.append({
                "name": name,
                "affiliation": aff
            })

        publisher = y.get("publisher", "")
        if not publisher:
            if affiliations:
                publisher = list(affiliations)[0]
            else:
                publisher = "Carnegie Mellon University"

        # Languages
        locale = y.get("locale", "en-US")
        content_lang = locale.split("-")[0] if locale else "en"
        prog_lang = y.get("runtime", {}).get("language", "python")
        prog_lang_formatted = "Python" if prog_lang.lower() == "python" else prog_lang.capitalize()

        # URLs
        quoted_rel_path = urllib.parse.quote(rel_path, safe='/')
        demo_url = f"https://adapt2.sis.pitt.edu/cupcake/#/activities/gillian-python/{quoted_rel_path}"
        splice_url = f"{demo_url}?protocol=splice"

        yaml_id = y.get("id")
        if yaml_id:
            slug = f"cupcake/gillian-python/{yaml_id}"
        else:
            slug = f"cupcake/gillian-python/{rel_path[:-5] if rel_path.endswith('.yaml') else rel_path}"

        def clean_strings(arr):
            if not arr:
                return []
            return ["null" if x is None else str(x) for x in arr]

        topics = clean_strings(y.get("pedagogy", {}).get("topics", []))
        prereqs = clean_strings(y.get("pedagogy", {}).get("prereq_topics", []))

        item = {
            "status": "public",
            "identity": {
                "id": slug,
                "title": y.get("title", ""),
                "type": catalog_type
            },
            "links": {
                "demo_url": demo_url
            },
            "attribution": {
                "provider": "Cupcake",
                "publisher": publisher,
                "authors": authors
            },
            "languages": {
                "content_language": content_lang,
                "programming_languages": [
                    prog_lang_formatted
                ]
            },
            "content": {
                "prompt": (y.get("statement") or y.get("description") or "").strip(),
                "source_code": source_code
            },
            "classification": {
                "topics": topics,
                "difficulty": y.get("pedagogy", {}).get("difficulty", "novice")
            },
            "pedagogy": {
                "learning_objectives": [],
                "instructional_role": "",
                "prerequisites": {
                    "topics": prereqs,
                    "concepts": [],
                    "item_ids": []
                }
            },
            "delivery": [
                {
                    "protocol": "HTML",
                    "url": demo_url
                },
                {
                    "protocol": "SPLICE",
                    "url": splice_url
                }
            ],
            "rights": {
                "license": y.get("license", "MIT")
            }
        }

        filename = rel_path.split("/")[-1].replace(".yaml", ".json")
        out_path = os.path.join(output_dir, filename)
        with open(out_path, "w") as out:
            json.dump(item, out, indent=2)

        items.append(item)
        print(f"Wrote {filename} ({catalog_type})")

    items_path = os.path.join(output_dir, "items.json")
    with open(items_path, "w") as out:
        json.dump(items, out, indent=2)
    print(f"\nAll {len(items)} items saved to {items_path}")

if __name__ == "__main__":
    out_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))
    port_all(out_dir)
