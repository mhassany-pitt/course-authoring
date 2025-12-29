import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogV2Service } from './slc-items.service';
import { AppService } from '../app.service';
import { getNavLinks } from '../utils';
import { Subscription } from 'rxjs';
import {
  blankItem,
  CatalogV2Item,
  HistoryOptions,
} from '../catalog_v2/catalog-v2.types';

@Component({
  selector: 'app-slc-item',
  templateUrl: './slc-item.component.html',
  styleUrls: ['./slc-item.component.less'],
})
export class SlcItemComponent implements OnInit, OnDestroy {
  navLinks = getNavLinks(this.app);

  model: CatalogV2Item = blankItem();

  tagInput = '';
  programmingLanguageInput = '';
  topicsInput = '';
  learningObjectivesInput = '';
  prereqTopicsInput = '';
  prereqConceptsInput = '';
  prereqItemIdsInput = '';
  authorName = '';
  authorAffiliation = '';
  kcId = '';
  kcNote = '';
  kcConceptsInput = '';
  selectedKcKey = '';
  useContextId = '';
  useContextName = '';
  useBy = '';
  useDate = '';
  deliveryFormat = '';
  deliveryUrl = '';

  private historicalOptions: HistoryOptions = {
    identity_types: [],
    interaction_types: [],
    instructional_roles: [],
    delivery_formats: [],
  };

  private fieldHelp: Record<string, string> = {
    title: 'Short, human-friendly title shown in listings.',
    uniqueId: 'Stable identifier or slug for this item.',
    type: 'High-level content type (exercise, quiz, lab, etc.).',
    demoUrl: 'A URL where a demo or preview can be accessed.',
    status: 'Visibility and lifecycle state for this item.',
    tags: 'Optional keywords to help with search and filtering.',
    contentLanguage: 'Primary language code for the content (bcp-47).',
    programmingLanguages:
      'Programming languages used in the content or code samples.',
    publisher:
      'The organization or entity publishing the item, eg: University, Company, or Research Lab.',
    provider: 'The system or provider name for this item.',
    createdAt: 'The original creation date for this item.',
    authorName: 'The name of the person or team credited as an author.',
    authorAffiliation: 'Author organization or affiliation.',
    license: 'Short license name (e.g., CC BY 4.0).',
    licenseUrl: 'Link to the full license text.',
    usageNotes: 'Any special usage or attribution notes.',
    prompt: 'Brief description or prompt shown to learners.',
    sourceCode: 'Optional code sample or snippet for the item.',
    difficulty: 'Relative difficulty level for learners.',
    interactionType: 'Primary interaction style learners use.',
    topics: 'Key topics or concepts covered by the item.',
    kcNote: 'A short note about the knowledge components or classifier.',
    kcConcepts: 'Concepts associated with this item.',
    kcClassifier: 'Identifier for the knowledge component classifier.',
    instructionalRole: 'Role the item plays in instruction.',
    learningObjectives: 'Outcomes learners should achieve.',
    prereqTopics: 'Topics learners should know in advance.',
    prereqConcepts: 'Concepts learners should know in advance.',
    prereqItemIds: 'IDs of items learners should complete first.',
    deliveryFormat: 'Delivery channel or packaging format.',
    deliveryUrl: 'URL where the item can be accessed.',
    useContextId: 'ID of the course or context where used.',
    useContextName: 'Name of the course or context where used.',
    useUsedBy: 'Instructor, team, or system that used it.',
    useUsedAt: 'Date the item was used.',
  };

  statusOptions = ['public', 'private', 'deprecated'].map((value) => ({
    label: value,
    value,
  }));
  difficultyOptions = ['novice', 'intermediate', 'advanced'].map((value) => ({
    label: value,
    value,
  }));

  catalogTypeOptions: { label: string; value: string }[] = [];
  interactionTypeOptions: { label: string; value: string }[] = [];
  instructionalRoleOptions: { label: string; value: string }[] = [];
  deliveryFormatOptions: { label: string; value: string }[] = [];

  loading = true;
  saving = false;
  validationErrors: string[] = [];

  private routeSub: Subscription | undefined;

  constructor(
    private catalog: CatalogV2Service,
    private app: AppService,
    public router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.loadHistoricalOptions();
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id && id !== 'new') {
        this.loadItem(id);
      } else {
        this.newItem();
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  private ensureDefaults(item: CatalogV2Item): CatalogV2Item {
    return {
      ...blankItem(),
      ...item,
      identity: { ...blankItem().identity, ...(item.identity || {}) },
      links: { ...blankItem().links, ...(item.links || {}) },
      languages: { ...blankItem().languages, ...(item.languages || {}) },
      content: { ...blankItem().content, ...(item.content || {}) },
      classification: {
        ...blankItem().classification,
        ...(item.classification || {}),
      },
      pedagogy: { ...blankItem().pedagogy, ...(item.pedagogy || {}) },
      interaction: { ...blankItem().interaction, ...(item.interaction || {}) },
      delivery: item.delivery || [],
      rights: { ...blankItem().rights, ...(item.rights || {}) },
      uses: item.uses || [],
    };
  }

  addDelivery() {
    if (!this.deliveryFormat && !this.deliveryUrl) return;
    const delivery = this.model.delivery || [];
    delivery.push({ format: this.deliveryFormat, url: this.deliveryUrl });
    this.model.delivery = delivery;
    this.deliveryFormat = '';
    this.deliveryUrl = '';
  }

  removeDelivery(idx: number) {
    this.model.delivery?.splice(idx, 1);
  }

  newItem() {
    this.model = blankItem();
    this.validationErrors = [];
    this.tagInput = '';
    this.programmingLanguageInput = '';
    this.topicsInput = '';
    this.learningObjectivesInput = '';
    this.prereqConceptsInput = '';
    this.prereqTopicsInput = '';
    this.prereqItemIdsInput = '';
    this.authorAffiliation = '';
    this.authorName = '';
    this.kcId = '';
    this.kcNote = '';
    this.kcConceptsInput = '';
    this.useBy = '';
    this.useContextId = '';
    this.useContextName = '';
    this.useDate = '';
    this.refreshOptionLists();
  }

  private hydrateInputs(item: CatalogV2Item) {
    this.tagInput = (item.tags || []).join(', ');
    this.programmingLanguageInput = (
      item.languages?.programming_languages || []
    ).join(', ');
    this.topicsInput = (item.classification?.topics || []).join(', ');
    this.learningObjectivesInput = (
      item.pedagogy?.learning_objectives || []
    ).join('\n');
    this.prereqTopicsInput = (item.pedagogy?.prerequisites?.topics || []).join(
      ', '
    );
    this.prereqConceptsInput = (
      item.pedagogy?.prerequisites?.concepts || []
    ).join(', ');
    this.prereqItemIdsInput = (
      item.pedagogy?.prerequisites?.item_ids || []
    ).join(', ');
  }

  private splitTokens(value: string) {
    return value
      ? value
          .split(/[\n,]/)
          .map((t) => t.trim())
          .filter(Boolean)
      : [];
  }

  isValidUrl(value: string) {
    return value && /^(https?:\/\/|mailto:|tel:)/.test(value);
  }

  private validate() {
    const errors: string[] = [];
    const title = (this.model.identity?.title || '').trim();
    if (!title) errors.push('Title is required.');
    if (title.length > 250) {
      errors.push('Title must be under 250 characters.');
    }

    const uniqueId = (this.model.identity?.id || '').trim();
    if (!uniqueId) errors.push('Unique ID is required.');
    if (uniqueId.length > 250) {
      errors.push('Unique ID must be under 250 characters.');
    }

    const type = (this.model.identity?.type || '').trim();
    if (!type) errors.push('Type is required.');

    const status = (this.model.status || '').trim();
    if (!status) errors.push('Status is required.');

    const demoUrl = (this.model.links?.demo_url || '').trim();
    if (!demoUrl) errors.push('Demo URL is required.');
    if (demoUrl.length > 1000) {
      errors.push('Demo URL must be under 1000 characters.');
    }
    if (demoUrl && !this.isValidUrl(demoUrl)) {
      errors.push('Demo URL must be a valid URL.');
    }

    const contentLanguage = (
      this.model.languages?.content_language || ''
    ).trim();
    if (!contentLanguage) errors.push('Content language is required.');
    if (contentLanguage.length > 20) {
      errors.push('Content language must be under 20 characters.');
    }

    const programmingLanguages = (this.programmingLanguageInput || '').trim();
    if (!programmingLanguages) {
      errors.push('Programming languages are required.');
    }
    if (programmingLanguages.length > 250) {
      errors.push('Programming languages must be under 250 characters.');
    }

    const prompt = (this.model.content?.prompt || '').trim();
    if (prompt.length > 250) {
      errors.push('Content prompt must be under 250 characters.');
    }

    const sourceCode = (this.model.content?.source_code || '').trim();
    if (sourceCode.length > 1000) {
      errors.push('Source snippet must be under 1000 characters.');
    }

    const topics = (this.topicsInput || '').trim();
    if (topics.length > 1000) {
      errors.push('Topics must be under 1000 characters.');
    }

    const knowledgeComponents =
      this.model.classification?.knowledge_components || {};
    Object.entries(knowledgeComponents).forEach(([key, value], index) => {
      const label = key || `#${index + 1}`;
      if (!key.trim()) {
        errors.push('Knowledge component classifier is required.');
      } else if (key.trim().length > 100) {
        errors.push(
          `Knowledge component classifier "${label}" must be under 100 characters.`
        );
      }

      const note = (value?.note || '').trim();
      if (note && note.length > 250) {
        errors.push(
          `Knowledge component "${label}" note must be under 250 characters.`
        );
      }

      const concepts = (value?.concepts || []).join(', ').trim();
      if (concepts && concepts.length > 1000) {
        errors.push(
          `Knowledge component "${label}" concepts must be under 1000 characters.`
        );
      }
    });

    const learningObjectives = (this.learningObjectivesInput || '')
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean);
    learningObjectives.forEach((objective, index) => {
      if (objective.length > 250) {
        errors.push(
          `Learning objective ${index + 1} must be under 250 characters.`
        );
      }
    });

    const prereqTopics = (this.prereqTopicsInput || '').trim();
    if (prereqTopics.length > 1000) {
      errors.push('Prerequisite topics must be under 1000 characters.');
    }
    const prereqConcepts = (this.prereqConceptsInput || '').trim();
    if (prereqConcepts.length > 1000) {
      errors.push('Prerequisite concepts must be under 1000 characters.');
    }
    const prereqItemIds = (this.prereqItemIdsInput || '').trim();
    if (prereqItemIds.length > 1000) {
      errors.push('Prerequisite item IDs must be under 1000 characters.');
    }

    const delivery = this.model.delivery || [];
    if (!delivery.length) {
      errors.push('At least one delivery entry is required.');
    } else {
      delivery.forEach((entry, index) => {
        const url = (entry?.url || '').trim();
        if (!url) {
          errors.push(`Delivery ${index + 1} URL is required.`);
        } else if (!this.isValidUrl(url)) {
          errors.push(`Delivery ${index + 1} URL must be a valid URL.`);
        }
      });
    }

    const license = (this.model.rights?.license || '').trim();
    if (!license) errors.push('License is required.');
    if (license.length > 50) {
      errors.push('License must be under 50 characters.');
    }
    const licenseUrl = (this.model.rights?.license_url || '').trim();
    if (licenseUrl && !this.isValidUrl(licenseUrl)) {
      errors.push('License URL must be a valid URL.');
    }
    const usageNotes = (this.model.rights?.usage_notes || '').trim();
    if (usageNotes && usageNotes.length > 250) {
      errors.push('Usage notes must be under 250 characters.');
    }

    const publisher = (this.model.attribution?.publisher || '').trim();
    if (publisher && publisher.length > 100) {
      errors.push('Publisher must be under 100 characters.');
    }

    const provider = (this.model.attribution?.provider || '').trim();
    if (!provider) errors.push('Provider is required.');
    if (provider.length > 100) {
      errors.push('Provider must be under 100 characters.');
    }

    const authors = this.model.attribution?.authors || [];
    if (!authors.length) errors.push('At least one author is required.');
    authors.forEach((author, index) => {
      const name = (author?.name || '').trim();
      if (!name) {
        errors.push(`Author ${index + 1} name is required.`);
      } else if (name.length > 100) {
        errors.push(`Author ${index + 1} name must be under 100 characters.`);
      }
      const affiliation = (author?.affiliation || '').trim();
      if (affiliation && affiliation.length > 100) {
        errors.push(
          `Author ${index + 1} affiliation must be under 100 characters.`
        );
      }
    });

    const uses = this.model.uses || [];
    uses.forEach((use, index) => {
      const contextId = (use?.context_id || '').trim();
      if (contextId && contextId.length > 100) {
        errors.push(
          `Use ${index + 1} context ID must be under 100 characters.`
        );
      }
      const contextName = (use?.context_name || '').trim();
      if (contextName && contextName.length > 250) {
        errors.push(
          `Use ${index + 1} context name must be under 250 characters.`
        );
      }
      const usedBy = (use?.used_by || '').trim();
      if (usedBy && usedBy.length > 100) {
        errors.push(`Use ${index + 1} used by must be under 100 characters.`);
      }
    });

    return errors;
  }

  private loadItem(id: string) {
    this.loading = true;
    this.catalog.read(id).subscribe({
      next: (item) => {
        this.model = this.ensureDefaults(item);
        this.hydrateInputs(this.model);
        this.refreshOptionLists();
        this.validationErrors = [];
      },
      error: (err) => console.error('failed to load catalog item', err),
      complete: () => (this.loading = false),
    });
  }

  private loadHistoricalOptions() {
    this.catalog.options().subscribe({
      next: (options) => {
        this.historicalOptions = options || {
          identity_types: [],
          interaction_types: [],
          instructional_roles: [],
          delivery_formats: [],
        };
        this.refreshOptionLists();
      },
      error: (err) =>
        console.error('failed to load slc options for dropdowns', err),
    });
  }

  private refreshOptionLists() {
    this.catalogTypeOptions = this.toOptions([
      ...this.historicalOptions.identity_types,
      this.model?.identity?.type,
    ]);

    this.interactionTypeOptions = this.toOptions([
      ...this.historicalOptions.interaction_types,
      this.model?.interaction?.interaction_type,
    ]);

    this.instructionalRoleOptions = this.toOptions([
      ...this.historicalOptions.instructional_roles,
      this.model?.pedagogy?.instructional_role,
    ]);

    this.deliveryFormatOptions = this.toOptions([
      ...this.historicalOptions.delivery_formats,
      ...(this.model?.delivery || []).map((d) => d.format),
    ]);
  }

  private toOptions(values: string[]) {
    const options = values
      .map((value) => ({ label: value, value }))
      .filter((opt) => opt.value);

    const seen = new Set<string>();
    const uniqueOptions: { label: string; value: string }[] = [];
    options.forEach((opt) => {
      if (!seen.has(opt.value)) {
        seen.add(opt.value);
        uniqueOptions.push(opt);
      }
    });

    if (uniqueOptions.length === 0)
      uniqueOptions.push({
        label: 'Type to add new option',
        value: 'Type to add new option',
      });

    return uniqueOptions;
  }

  showFieldInfo(key: string) {
    const message = this.fieldHelp[key];
    if (message) {
      window.alert(message);
    }
  }

  copyId() {
    if (!this.model.id) return;
    navigator.clipboard?.writeText(this.model.id).catch(() => {});
  }

  save() {
    this.saving = true;
    this.model.tags = this.splitTokens(this.tagInput);
    this.model.languages = this.model.languages || {};
    this.model.languages.programming_languages = this.splitTokens(
      this.programmingLanguageInput
    );
    this.model.classification = this.model.classification || {};
    this.model.classification.topics = this.splitTokens(this.topicsInput);
    this.model.pedagogy = this.model.pedagogy || {};
    this.model.pedagogy.learning_objectives = this.learningObjectivesInput
      ? this.learningObjectivesInput
          .split('\n')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];
    this.model.pedagogy.prerequisites = {
      topics: this.splitTokens(this.prereqTopicsInput),
      concepts: this.splitTokens(this.prereqConceptsInput),
      item_ids: this.splitTokens(this.prereqItemIdsInput),
    };

    this.validationErrors = this.validate();
    if (this.validationErrors.length) {
      this.saving = false;
      return;
    }

    const op = this.model.id
      ? this.catalog.update(this.model)
      : this.catalog.create(this.model);
    op.subscribe({
      next: (item) => {
        this.model = this.ensureDefaults(item);
        this.hydrateInputs(this.model);
        this.validationErrors = [];
        this.router.navigate(['/slc-items']);
      },
      error: (err) => console.error('failed to save item', err),
      complete: () => (this.saving = false),
    });
  }

  addAuthor() {
    if (!this.authorName && !this.authorAffiliation) return;
    this.model.attribution = this.model.attribution || { authors: [] };
    this.model.attribution.authors = this.model.attribution.authors || [];
    this.model.attribution.authors.push({
      name: this.authorName,
      affiliation: this.authorAffiliation,
    });
    this.authorName = '';
    this.authorAffiliation = '';
  }

  removeAuthor(idx: number) {
    this.model.attribution?.authors?.splice(idx, 1);
  }

  addKnowledgeComponent() {
    if (!this.kcId) return;
    this.model.classification.knowledge_components =
      this.model.classification.knowledge_components || {};
    const existing = this.model.classification.knowledge_components[this.kcId];
    this.model.classification.knowledge_components[this.kcId] = {
      note: this.kcNote,
      concepts: this.splitTokens(this.kcConceptsInput),
    };
    this.selectedKcKey = this.kcId;
    this.kcId = '';
    this.kcNote = '';
    this.kcConceptsInput = '';
  }

  removeKnowledgeComponent(key: string) {
    delete this.model.classification.knowledge_components?.[key];
  }

  editKnowledgeComponent(key: string) {
    const kc = this.model.classification.knowledge_components?.[key];
    if (!kc) return;
    this.selectedKcKey = key;
    this.kcId = key;
    this.kcNote = kc.note || '';
    this.kcConceptsInput = (kc.concepts || []).join(', ');
  }

  clearKnowledgeComponentForm() {
    this.selectedKcKey = '';
    this.kcId = '';
    this.kcNote = '';
    this.kcConceptsInput = '';
  }

  addUse() {
    if (!this.useContextId && !this.useContextName) return;
    this.model.uses = this.model.uses || [];
    this.model.uses.push({
      context_id: this.useContextId,
      context_name: this.useContextName,
      used_at: this.useDate,
      used_by: this.useBy,
    });
    this.useContextId = '';
    this.useContextName = '';
    this.useBy = '';
    this.useDate = '';
  }

  removeUse(idx: number) {
    this.model.uses?.splice(idx, 1);
  }
}
