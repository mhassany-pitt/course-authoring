import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CatalogV2Service } from '../../catalog_v2/catalog-v2.service';
import { CatalogV2Item } from '../../catalog_v2/catalog-v2.types';
import { ContentRecommender } from '../content-recommender';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ButtonModule } from 'primeng/button';
import { CdkScrollable } from "@angular/cdk/scrolling";

type QuickFilterSectionKey = 'types' | 'authors' | 'providers' | 'knowledgeComponents' | 'contentLanguages';

@Component({
  selector: 'app-catalog-browser',
  templateUrl: './catalog-browser.component.html',
  styleUrl: './catalog-browser.component.less',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    ButtonModule,
  ],
})
export class CatalogBrowserComponent implements OnInit, OnChanges {
  @Input() resourceName = '';
  @Input() unitName = '';
  @Input() domain = '';
  @Input() providerIds: string[] = [];
  @Input() selectedActivities: any[] = [];
  @Input() recommender?: ContentRecommender;
  @Output() close = new EventEmitter<void>();
  @Output() selectedActivitiesChange = new EventEmitter<any[]>();
  @Output() interaction = new EventEmitter<any>();

  allItems: CatalogV2Item[] = [];
  items: CatalogV2Item[] = [];
  selectedItems: CatalogV2Item[] = [];
  loading = false;
  error = '';
  globalQuery = '';
  filterMode: 'all' | 'selected' | 'unselected' = 'unselected';
  selectedTypes: string[] = [];
  selectedProviders: string[] = [];
  selectedAuthors: string[] = [];
  selectedKnowledgeComponents: string[] = [];
  selectedContentLanguages: string[] = [];
  authorsQuery = '';
  knowledgeComponentsQuery = '';
  selectedKnowledgeComponentCategory = (typeof window !== 'undefined' && localStorage.getItem('lastSelectedKcCategory')) || 'All';
  showAllAuthors = false;
  showAllKnowledgeComponents = false;
  sortOrder: 'none' | 'asc' | 'desc' = 'desc';
  scoresCache = new Map<string, number | null>();
  maxPositiveScore = 0;
  minNegativeScore = 0;
  private readonly authorsDefaultLimit = 20;
  private readonly knowledgeComponentsDefaultLimit = 20;
  quickFilterSections: Record<QuickFilterSectionKey, boolean> = {
    types: true,
    authors: false,
    providers: true,
    knowledgeComponents: false,
    contentLanguages: true,
  };

  constructor(
    private catalogV2: CatalogV2Service,
  ) { }

  ngOnInit() {
    this.loadCatalogItems();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['providerIds'] && this.allItems.length) {
      this.applyProviderFilter();
      this.syncSelectedItems();
    }

    if (changes['selectedActivities'] && this.items.length) {
      this.syncSelectedItems();
    }

    if (changes['recommender'] || changes['unitName']) {
      this.updateScoresCache();
    }
  }

  get filteredItems() {
    const items = this.filterItems(this.items);
    let result = items;

    if (this.filterMode === 'selected') {
      result = items.filter((item) => this.isSelected(item));
    } else if (this.filterMode === 'unselected') {
      result = items.filter((item) => !this.isSelected(item));
    }

    if (this.sortOrder === 'none') {
      return result;
    }

    return [...result].sort((a, b) => {
      const scoreA = this.getAlignmentScore(a) ?? 0;
      const scoreB = this.getAlignmentScore(b) ?? 0;
      return this.sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
    });
  }

  get lastLoadedAt() {
    return this.catalogV2.getLastLoadedAt();
  }

  get reloadCatalogLabel() {
    const lastLoadedAt = this.lastLoadedAt;
    if (!lastLoadedAt) {
      return 'Load catalog';
    }

    const diffMs = Math.max(0, Date.now() - lastLoadedAt.getTime());
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) {
      return 'Last loaded: just now!';
    }
    if (diffMinutes < 60) {
      return `Last loaded: ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago!`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `Last loaded: ${diffHours} hour${diffHours === 1 ? '' : 's'} ago!`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `Last loaded: ${diffDays} day${diffDays === 1 ? '' : 's'} ago!`;
  }

  get typeOptions() {
    return this.facetOptionsFor('type');
  }

  get providerOptions() {
    return this.facetOptionsFor('provider');
  }

  get authorOptions() {
    return this.facetOptionsFor('author');
  }

  get knowledgeComponentOptions() {
    return this.facetOptionsFor('knowledgeComponent');
  }

  get contentLanguageOptions() {
    return this.facetOptionsFor('contentLanguage');
  }

  get knowledgeComponentCategories() {
    const categories = Array.from(
      new Set(
        this.items.flatMap((item) => Object.keys(item.classification?.knowledge_components || {}))
          .map((category) => String(category || '').trim())
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b));

    return ['All', ...categories];
  }

  get filteredAuthorOptions() {
    const query = this.authorsQuery.trim().toLowerCase();
    if (!query)
      return this.authorOptions;
    return this.authorOptions.filter((option) => option.label.toLowerCase().includes(query));
  }

  get visibleAuthorOptions() {
    return this.showAllAuthors
      ? this.filteredAuthorOptions
      : this.filteredAuthorOptions.slice(0, this.authorsDefaultLimit);
  }

  get hasMoreAuthors() {
    return this.filteredAuthorOptions.length > this.authorsDefaultLimit;
  }

  get filteredKnowledgeComponentOptions() {
    const query = this.knowledgeComponentsQuery.trim().toLowerCase();
    const options = this.knowledgeComponentOptions;
    if (!query)
      return options;
    return options.filter((option) => option.label.toLowerCase().includes(query));
  }

  get visibleKnowledgeComponentOptions() {
    return this.showAllKnowledgeComponents
      ? this.filteredKnowledgeComponentOptions
      : this.filteredKnowledgeComponentOptions.slice(0, this.knowledgeComponentsDefaultLimit);
  }

  get hasMoreKnowledgeComponents() {
    return this.filteredKnowledgeComponentOptions.length > this.knowledgeComponentsDefaultLimit;
  }

  filterItems(items: CatalogV2Item[], excludeFacet: 'type' | 'provider' | 'author' | 'knowledgeComponent' | 'contentLanguage' | '' = '') {
    return items.filter((item) => {
      const type = item.identity?.type || '';
      const provider = item.attribution?.provider || '';
      const authors = (item.attribution?.authors || []).map((author) => author.name).filter(Boolean);
      const knowledgeComponents = this.knowledgeComponentsText(item, this.selectedKnowledgeComponentCategory);
      const contentLanguage = item.languages?.content_language || '';

      const kcsObj = item.classification?.knowledge_components;
      const hasCategory = this.selectedKnowledgeComponentCategory === 'All'
        || !!(kcsObj && typeof kcsObj === 'object' && Object.prototype.hasOwnProperty.call(kcsObj, this.selectedKnowledgeComponentCategory));

      return hasCategory
        && (excludeFacet === 'type' || !this.selectedTypes.length || this.selectedTypes.includes(type))
        && (excludeFacet === 'provider' || !this.selectedProviders.length || this.selectedProviders.includes(provider))
        && (excludeFacet === 'author' || !this.selectedAuthors.length || authors.some((author) => this.selectedAuthors.includes(author)))
        && (excludeFacet === 'knowledgeComponent'
          || !this.selectedKnowledgeComponents.length
          || knowledgeComponents.some((knowledgeComponent) => this.selectedKnowledgeComponents.includes(knowledgeComponent)))
        && (excludeFacet === 'contentLanguage'
          || !this.selectedContentLanguages.length
          || this.selectedContentLanguages.includes(contentLanguage));
    });
  }

  facetOptionsFor(facet: 'type' | 'provider' | 'author' | 'knowledgeComponent' | 'contentLanguage') {
    const allValues = this.extractFacetValues(this.items, facet);
    const filteredValues = this.extractFacetValues(this.filterItems(this.items, facet), facet);
    const counts = new Map<string, number>();

    filteredValues.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
    return [...new Set(allValues)]
      .sort((a, b) => {
        const countDiff = (counts.get(b) || 0) - (counts.get(a) || 0);
        return countDiff || a.localeCompare(b);
      })
      .map((label) => ({ label, count: counts.get(label) || 0 }));
  }

  extractFacetValues(items: CatalogV2Item[], facet: 'type' | 'provider' | 'author' | 'knowledgeComponent' | 'contentLanguage') {
    if (facet === 'type')
      return items.map((item) => item.identity?.type || '').filter(Boolean);
    if (facet === 'provider')
      return items.map((item) => item.attribution?.provider || '').filter(Boolean);
    if (facet === 'knowledgeComponent')
      return items.flatMap((item) => this.knowledgeComponentsText(item, this.selectedKnowledgeComponentCategory));
    if (facet === 'contentLanguage')
      return items.map((item) => item.languages?.content_language || '').filter(Boolean);
    return items.flatMap((item) => (item.attribution?.authors || []).map((author) => author.name || '').filter(Boolean));
  }

  isFacetAvailable(count: number, selection: string[], value: string) {
    return count > 0 || this.isFacetSelected(selection, value);
  }

  filterTable(table: any, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    table.filterGlobal(value, 'contains');
    this.emitInteraction('catalog-search', { field: 'search' }, value, null);
  }

  loadCatalogItems(force = false) {
    this.loading = true;
    this.error = '';
    this.catalogV2.list({ force }).subscribe({
      next: (items) => {
        this.allItems = items || [];
        this.applyProviderFilter();
        this.syncSelectedItems();
        this.loading = false;
      },
      error: () => {
        this.error = 'Unable to load catalog items.';
        this.loading = false;
      },
    });
  }

  reloadCatalogItems() {
    this.emitInteraction('reload-catalog', { field: 'catalog' }, { force: true }, null);
    this.loadCatalogItems(true);
  }

  applyProviderFilter() {
    const providerIds = this.providerIds || [];
    const domain = (this.domain || '').trim();
    this.items = this.allItems.filter((item) => {
      const matchesProvider = !providerIds.length || providerIds.includes(item.attribution?.provider);
      const matchesDomain = !domain || (item.languages?.programming_languages || []).includes(domain);
      return matchesProvider && matchesDomain;
    });
    this.updateScoresCache();
  }

  syncSelectedItems() {
    const selected = this.selectedActivities || [];
    this.selectedItems = this.items.filter((item) => selected.some((activity: any) =>
      activity.id == item.id || activity.url == item.links?.demo_url
    ));
  }

  addSelectedItem(item: CatalogV2Item) {
    const activity = this.mapItemToActivity(item);
    console.log('catalog-browser selected activity', activity);
    const activities = [...(this.selectedActivities || [])];
    if (!activities.some((current: any) => current.id == activity.id || current.url == activity.url))
      activities.push(activity);
    this.emitInteraction('add-activity', { item: this.getItemSummary(item), field: 'activities' }, activity, null);
    this.selectedActivitiesChange.emit(activities);
  }

  removeSelectedItem(item: CatalogV2Item) {
    const activity = this.mapItemToActivity(item);
    const activities = (this.selectedActivities || []).filter((current: any) =>
      current.id != activity.id && current.url != activity.url
    );
    this.emitInteraction('remove-activity', { item: this.getItemSummary(item), field: 'activities' }, activity, null);
    this.selectedActivitiesChange.emit(activities);
  }

  mapItemToActivity(item: CatalogV2Item) {
    return {
      id: item.paws_id,
      name: item.identity?.title || 'Untitled Item',
      url: item.links?.demo_url || '',
      domain: this.domain || '',
      tags: item.tags || [],
      delivery: item.delivery || [],
      provider_id: item.attribution?.provider || '',
      author_id: (item.attribution?.authors || [])
        .map((author) => author.name)
        .filter(Boolean)
        .join(', '),
    };
  }

  toggleFacet(selection: string[], value: string, facet: string) {
    const prevValue = [...selection];
    const index = selection.indexOf(value);
    if (index >= 0)
      selection.splice(index, 1);
    else
      selection.push(value);
    this.emitInteraction('toggle-filter', { field: 'facet', facet, value }, [...selection], prevValue);
  }

  isFacetSelected(selection: string[], value: string) {
    return selection.includes(value);
  }

  clearFacetFilters() {
    const prevValue = {
      types: [...this.selectedTypes],
      providers: [...this.selectedProviders],
      authors: [...this.selectedAuthors],
      knowledgeComponents: [...this.selectedKnowledgeComponents],
      contentLanguages: [...this.selectedContentLanguages],
    };
    this.selectedTypes = [];
    this.selectedProviders = [];
    this.selectedAuthors = [];
    this.selectedKnowledgeComponents = [];
    this.selectedContentLanguages = [];
    this.emitInteraction('clear-filters', { field: 'facets' }, {
      types: [],
      providers: [],
      authors: [],
      knowledgeComponents: [],
      contentLanguages: [],
    }, prevValue);
  }

  toggleQuickFilterSection(key: QuickFilterSectionKey) {
    const prevValue = this.quickFilterSections[key];
    this.quickFilterSections[key] = !this.quickFilterSections[key];
    this.emitInteraction(
      'toggle-filter-section',
      { field: 'filter-section', section: key },
      this.quickFilterSections[key],
      prevValue
    );
  }

  toggleAuthorsView() {
    this.quickFilterSections.authors = true;
    const prevValue = this.showAllAuthors;
    this.showAllAuthors = !this.showAllAuthors;
    this.emitInteraction('toggle-authors-view', { field: 'authors-view' }, this.showAllAuthors, prevValue);
  }

  toggleKnowledgeComponentsView() {
    this.quickFilterSections.knowledgeComponents = true;
    const prevValue = this.showAllKnowledgeComponents;
    this.showAllKnowledgeComponents = !this.showAllKnowledgeComponents;
    this.emitInteraction('toggle-kc-view', { field: 'knowledge-components-view' }, this.showAllKnowledgeComponents, prevValue);
  }

  onAuthorsQueryChange(value: string) {
    const prevValue = this.authorsQuery;
    this.authorsQuery = value || '';
    this.showAllAuthors = false;
    this.emitInteraction('filter-authors', { field: 'authors-query' }, this.authorsQuery, prevValue);
  }

  onKnowledgeComponentsQueryChange(value: string) {
    const prevValue = this.knowledgeComponentsQuery;
    this.knowledgeComponentsQuery = value || '';
    this.showAllKnowledgeComponents = false;
    this.emitInteraction('filter-kcs', { field: 'knowledge-components-query' }, this.knowledgeComponentsQuery, prevValue);
  }

  onKnowledgeComponentCategoryChange(value: string) {
    const prevValue = this.selectedKnowledgeComponentCategory;
    this.selectedKnowledgeComponentCategory = value || 'All';
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastSelectedKcCategory', this.selectedKnowledgeComponentCategory);
    }
    this.showAllKnowledgeComponents = false;
    this.emitInteraction('change-kc-category', { field: 'knowledge-components-category' }, this.selectedKnowledgeComponentCategory, prevValue);
  }

  get selectedFacetCount() {
    return this.selectedTypes.length
      + this.selectedProviders.length
      + this.selectedAuthors.length
      + this.selectedKnowledgeComponents.length
      + this.selectedContentLanguages.length;
  }

  authorsText(item: CatalogV2Item) {
    const authors = item.attribution?.authors || [];
    return authors.map((author) => author.name).filter(Boolean).join(', ') || '-';
  }

  updateScoresCache() {
    this.scoresCache.clear();
    let maxPos = 0;
    let minNeg = 0;

    this.items.forEach((item) => {
      const score = this.calculateRawScore(item);
      this.scoresCache.set(item.id, score);

      if (score !== null) {
        if (score > 0 && score > maxPos) {
          maxPos = score;
        } else if (score < 0 && score < minNeg) {
          minNeg = score;
        }
      }
    });

    this.maxPositiveScore = maxPos;
    this.minNegativeScore = minNeg;
  }

  calculateRawScore(item: CatalogV2Item): number | null {
    if (!this.recommender) return null;
    const kcs = this.knowledgeComponentsText(item);
    return this.recommender.calcAlignmentScore(this.unitName || '', kcs);
  }

  getAlignmentScore(item: CatalogV2Item): number | null {
    if (!this.scoresCache.has(item.id)) {
      const score = this.calculateRawScore(item);
      this.scoresCache.set(item.id, score);
    }
    return this.scoresCache.get(item.id) ?? null;
  }

  getNormalizedScoreObj(item: CatalogV2Item): { percentage: string; value: number; raw: number } | null {
    const raw = this.getAlignmentScore(item);
    if (raw === null) return null;

    let percentage = '0%';
    if (raw > 0) {
      const pct = this.maxPositiveScore > 0 ? Math.round((raw / this.maxPositiveScore) * 100) : 0;
      percentage = `+${pct}%`;
    } else if (raw < 0) {
      const pct = this.minNegativeScore < 0 ? Math.round((raw / this.minNegativeScore) * 100) : 0;
      percentage = `-${pct}%`;
    }

    return {
      percentage,
      value: raw,
      raw
    };
  }

  getScoreTooltip(scoreObj: { percentage: string; value: number; raw: number }): string {
    const rawVal = scoreObj.raw.toFixed(1);
    if (scoreObj.raw > 0) {
      return `Alignment relevance: ${scoreObj.percentage} (Raw score: +${rawVal}). Reinforces concepts in this unit and past units.`;
    }
    if (scoreObj.raw < 0) {
      return `Alignment warning: ${scoreObj.percentage} (Raw score: ${rawVal}). Introduces future concepts prematurely.`;
    }
    return `Alignment neutral: 0% (Raw score: 0.0). No overlapping concepts with the course curriculum.`;
  }

  knowledgeComponentsText(item: CatalogV2Item, category = 'All') {
    const knowledgeComponents = item.classification?.knowledge_components;
    if (!knowledgeComponents || typeof knowledgeComponents !== 'object')
      return [];

    const entries = Object.entries(knowledgeComponents)
      .filter(([currentCategory]) => category === 'All' || currentCategory === category)
      .map(([, entry]) => entry);

    return Array.from(
      new Set(
        entries
          .flatMap((entry) => entry?.concepts || [])
          .map((concept) => String(concept || '').trim())
          .filter(Boolean),
      ),
    );
  }

  isSelected(item: CatalogV2Item) {
    return this.selectedItems.some((selected) => selected.id === item.id);
  }

  cycleFilterMode() {
    const prevValue = this.filterMode;
    if (this.filterMode === 'all') {
      this.filterMode = 'unselected';
    } else if (this.filterMode === 'unselected') {
      this.filterMode = 'selected';
    } else {
      this.filterMode = 'all';
    }
    this.emitInteraction('change-filter-mode', { field: 'filter-mode' }, this.filterMode, prevValue);
  }

  get filterModeLabel() {
    if (this.filterMode === 'selected') {
      return 'Showing selected items';
    }
    if (this.filterMode === 'unselected') {
      return 'Showing available items';
    }
    return 'Showing all items';
  }

  get filterModeIcon() {
    if (this.filterMode === 'selected') {
      return 'fa fa-check-square-o';
    }
    if (this.filterMode === 'unselected') {
      return 'fa fa-eye-slash';
    }
    return 'fa fa-list';
  }

  get filterModeOutlined() {
    return this.filterMode === 'all';
  }

  toggleSortOrder() {
    const prevValue = this.sortOrder;
    if (this.sortOrder === 'none') {
      this.sortOrder = 'desc';
    } else if (this.sortOrder === 'desc') {
      this.sortOrder = 'asc';
    } else {
      this.sortOrder = 'none';
    }
    this.emitInteraction('toggle-sort-order', { field: 'sort-order' }, this.sortOrder, prevValue);
  }

  get sortOrderLabel() {
    if (this.sortOrder === 'desc') {
      return 'Sort: Relevance (High → Low)';
    }
    if (this.sortOrder === 'asc') {
      return 'Sort: Relevance (Low → High)';
    }
    return 'Sort: Relevance';
  }

  get sortOrderIcon() {
    if (this.sortOrder === 'desc') {
      return 'fa fa-sort-amount-desc';
    }
    if (this.sortOrder === 'asc') {
      return 'fa fa-sort-amount-asc';
    }
    return 'fa fa-sort';
  }

  onTablePage(event: any) {
    this.emitInteraction('catalog-page', { field: 'page' }, {
      page: event.page,
      rows: event.rows,
      first: event.first,
    }, null);
  }

  previewItem(item: CatalogV2Item) {
    this.emitInteraction('preview-item', { item: this.getItemSummary(item), field: 'preview' }, item.links?.demo_url || null, null);
  }

  emitInteraction(action: string, object: any, value: any, prev_value: any) {
    this.interaction.emit({ action, object, value, prev_value });
  }

  getItemSummary(item: CatalogV2Item) {
    return {
      id: item.identity?.id || item.paws_id,
      paws_id: item.paws_id,
      title: item.identity?.title || 'Untitled Item',
      provider: item.attribution?.provider || '',
      type: item.identity?.type || '',
      demo_url: item.links?.demo_url || '',
    };
  }
}
