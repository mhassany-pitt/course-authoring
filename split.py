import json
from collections import defaultdict

all = json.load(open('/Users/themhassany/Desktop/activities.json'))

byproviders = defaultdict(list)

for activity in all:
    provider = activity['providerId']
    del activity['providerId']
    activity['author'] = activity['authorId']
    del activity['authorId']
    byproviders[provider].append(activity)

for providerId, activities in byproviders.items():
    with open(f'/Users/themhassany/Desktop/providers/{providerId}.json', 'w') as f:
        json.dump(activities, f)