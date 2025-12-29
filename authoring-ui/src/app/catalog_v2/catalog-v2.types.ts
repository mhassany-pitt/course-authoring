export interface HistoryOptions {
  identity_types: string[];
  interaction_types: string[];
  instructional_roles: string[];
  delivery_formats: string[];
}

export interface CatalogV2Item {
  id: string;
  user_email: string;
  status: 'public' | 'private' | 'deprecated';
  listed_at: string;
  updated_at: string;
  tags: string[];
  identity: {
    id: string;
    title: string;
    type: string;
  };
  links: {
    demo_url: string;
  };
  attribution: {
    authors: { name: string; affiliation: string }[];
    publisher: string;
    provider: string;
    created_at: string;
  };
  languages: {
    content_language: string;
    programming_languages: string[];
  };
  content: {
    prompt: string;
    source_code: string;
  };
  classification: {
    topics: string[];
    difficulty: string;
    knowledge_components: Record<string, { note: string; concepts: string[] }>;
  };
  pedagogy: {
    learning_objectives: string[];
    instructional_role: string;
    prerequisites: {
      topics: string[];
      concepts: string[];
      item_ids: string[];
    };
  };
  interaction: {
    interaction_type: string;
  };
  delivery: {
    format: string;
    url: string;
  }[];
  rights: {
    license: string;
    license_url: string;
    usage_notes: string;
  };
  uses: {
    context_id: string;
    context_name: string;
    used_at: string;
    used_by: string;
  }[];
}

export const blankItem = (): CatalogV2Item => ({
  id: '',
  user_email: '',
  status: 'public',
  listed_at: '',
  updated_at: '',
  tags: [],
  identity: {
    id: '',
    title: '',
    type: '',
  },
  links: {
    demo_url: '',
  },
  attribution: {
    authors: [],
    publisher: '',
    provider: '',
    created_at: '',
  },
  languages: {
    content_language: '',
    programming_languages: [],
  },
  content: {
    prompt: '',
    source_code: '',
  },
  classification: {
    topics: [],
    difficulty: '',
    knowledge_components: {},
  },
  pedagogy: {
    learning_objectives: [],
    instructional_role: '',
    prerequisites: {
      topics: [],
      concepts: [],
      item_ids: [],
    },
  },
  interaction: {
    interaction_type: '',
  },
  delivery: [],
  rights: {
    license: '',
    license_url: '',
    usage_notes: '',
  },
  uses: [],
});
