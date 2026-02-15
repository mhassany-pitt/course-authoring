# topic_kcs
# index	topic_name	KCs
# 0	1	variables & operators	[Variable, SimpleVariable, SimpleDataTypeValue...

import pandas as pd

def course_modeler(topic_kcs):
    course_model = []

    all_previous = set()
    all_topics = topic_kcs["topic_name"].tolist()
    all_kcs = [set(kcs) for kcs in topic_kcs["KCs"]]

    for i, (topic, kcs) in enumerate(zip(all_topics, all_kcs)):
        current = set(kcs) - all_previous
        past = set().union(*all_kcs[:i])
        future = set().union(*all_kcs[i+1:])

        course_model.append({
            "topic": topic,
            "Past": sorted(list(past)),
            "Current": sorted(list(current)),
            "Future": sorted(list(future))
        })

        all_previous.update(current)

    course_model_df = pd.DataFrame(course_model)

    course_model_dict = {
        row["topic"]: {
            "Past": row["Past"],
            "Current": row["Current"],
            "Future": row["Future"]
        }
        for _, row in course_model_df.iterrows()
    }

    return course_model_dict


def compute_score(activity_kcs, topic_sets):
    alpha, beta, gamma = 0.2, 1.0, -1.5

    kc_set = set(activity_kcs)
    past = kc_set.intersection(topic_sets["Past"])
    current = kc_set.intersection(topic_sets["Current"])
    future = kc_set.intersection(topic_sets["Future"])
    score = alpha * len(past) + beta * len(current) + gamma * len(future)
    return {
        "past_count": len(past),
        "current_count": len(current),
        "future_count": len(future),
        "score": score,
        "past_kcs": sorted(list(past)),
        "current_kcs": sorted(list(current)),
        "future_kcs": sorted(list(future))
    }


def rank_content_per_topic(course_model_dict, activities):
    recommendations = []

    for topic, topic_sets in course_model_dict.items():
        for _, row in activities.iterrows():
            result = compute_score(row["kcs"], topic_sets)
            recommendations.append({
                "topic": topic,
                "content_name": row["content_name"],
                "content_type": row["content_type"],
                **result
            })

    recommendations_df = pd.DataFrame(recommendations)

    recommendations_df["rank"] = recommendations_df.groupby("topic")["score"] \
                                                    .rank(ascending=False, method="first")

    recommendations_df = recommendations_df.sort_values(["topic", "rank"])


def scale_to_stars(group):
    min_score = group["score"].min()
    max_score = group["score"].max()

    if max_score == min_score:
        group["star_score"] = 5
    else:
        group["star_score"] = 5 * (group["score"] - min_score) / (max_score - min_score)

    return group