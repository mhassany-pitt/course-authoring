export class ContentRecommender {
  private topics: string[] = [];
  private topicContents = new Map<string, string[]>();
  private contentKCs = new Map<string, Set<string>>();

  addTopic(topic: string, index: number): void {
    this.topics = this.topics.filter((name) => name !== topic);
    this.topics.splice(
      Math.max(0, Math.min(index, this.topics.length)),
      0,
      topic,
    );
    if (!this.topicContents.has(topic)) this.topicContents.set(topic, []);
  }

  removeTopic(topic: string): void {
    this.topics = this.topics.filter((name) => name !== topic);
    for (const contentId of this.topicContents.get(topic) ?? [])
      this.contentKCs.delete(this.__key(topic, contentId));
    this.topicContents.delete(topic);
  }

  addContent(
    topic: string,
    contentId: string,
    contentKCs: Iterable<string>,
  ): void {
    if (!this.topicContents.has(topic))
      this.addTopic(topic, this.topics.length);
    this.contentKCs.set(this.__key(topic, contentId), new Set(contentKCs));
    const contents = this.topicContents.get(topic) ?? [];
    if (!contents.includes(contentId)) contents.push(contentId);
    this.topicContents.set(topic, contents);
  }

  removeContent(topic: string, contentId: string): void {
    this.contentKCs.delete(this.__key(topic, contentId));
    this.topicContents.set(
      topic,
      (this.topicContents.get(topic) ?? []).filter((id) => id !== contentId),
    );
  }

  calcAlignmentScore(
    topic: string,
    candidateContentKCs: Iterable<string>,
  ): number | null {
    const topicIndex = this.topics.indexOf(topic);
    if (topicIndex === -1) return null;

    const topicKCs = new Map<string, Set<string>>();
    for (const topic of this.topics)
      topicKCs.set(topic, this.__listTopicKCs(topic));

    const pastTopicsKCs = union(
      ...this.topics
        .slice(0, topicIndex)
        .map((name) => topicKCs.get(name) ?? new Set<string>()),
    );
    const currentTopicOnlyKCs = difference(
      topicKCs.get(topic) ?? new Set<string>(),
      pastTopicsKCs,
    );
    const futureTopicsKCs = union(
      ...this.topics
        .slice(topicIndex + 1)
        .map((name) => topicKCs.get(name) ?? new Set<string>()),
    );
    const futureTopicOnlyKCs = difference(
      futureTopicsKCs,
      union(pastTopicsKCs, currentTopicOnlyKCs),
    );

    const candidateKCs = new Set(candidateContentKCs);
    const past = intersection(candidateKCs, pastTopicsKCs);
    const current = intersection(candidateKCs, currentTopicOnlyKCs);
    const future = intersection(candidateKCs, futureTopicOnlyKCs);

    return 0.2 * past.size + current.size - 1.5 * future.size;
  }

  private __listTopicKCs(topic: string): Set<string> {
    const kcs = new Set<string>();
    for (const contentId of this.topicContents.get(topic) ?? []) {
      for (const kc of this.contentKCs.get(this.__key(topic, contentId)) ?? [])
        kcs.add(kc);
    }
    return kcs;
  }

  private __key(topic: string, contentId: string): string {
    return `${topic}:${contentId}`;
  }
}

function union(...sets: Set<string>[]): Set<string> {
  const result = new Set<string>();
  for (const set of sets) for (const value of set) result.add(value);
  return result;
}

function intersection(left: Set<string>, right: Set<string>): Set<string> {
  return new Set([...left].filter((value) => right.has(value)));
}

function difference(left: Set<string>, right: Set<string>): Set<string> {
  return new Set([...left].filter((value) => !right.has(value)));
}
