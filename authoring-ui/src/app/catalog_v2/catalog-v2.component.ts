import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Table } from 'primeng/table';
import { FilterService } from 'primeng/api';
import { CatalogV2Service } from './catalog-v2.service';
import { AppService } from '../app.service';
import { getNavLinks } from '../utils';

type FilterKV = { label: string; value: number };

@Component({
  selector: 'app-catalog-v2',
  templateUrl: './catalog-v2.component.html',
  styleUrls: ['./catalog-v2.component.less'],
})
export class CatalogV2Component implements OnInit, AfterViewInit {
  @ViewChild('table') table!: Table;
  @ViewChild('searchInputEl') searchInputEl!: ElementRef<HTMLInputElement>;

  navLinks = getNavLinks(this.app);

  items: any = [];

  selectedKVs: { [key: string]: any } = {};
  typeKVs: FilterKV[] = [];
  providersKVs: FilterKV[] = [];
  authorKVs: FilterKV[] = [];
  tagKVs: FilterKV[] = [];
  plKVs: FilterKV[] = [];
  licenseKVs: FilterKV[] = [];
  deliveryFormatKVs: FilterKV[] = [];
  conceptKVs: FilterKV[] = [];
  authorsQuery = '';
  showAllAuthors = false;
  knowledgeComponentsQuery = '';
  showAllKnowledgeComponents = false;
  private readonly authorsDefaultLimit = 20;
  private readonly knowledgeComponentsDefaultLimit = 20;
  globalQuery = '';
  private readonly multiFilterSeparator = '||';
  private availableFacetLabels: { [key: string]: Set<string> } = {};
  private allFacetLabels: { [key: string]: string[] } = {};
  private itemFacetLabelsCache = new WeakMap<object, Map<string, string[]>>();
  private itemFacetLabelsLowerCache = new WeakMap<object, Map<string, string[]>>();
  private knowledgeConceptsCache = new WeakMap<object, string[]>();
  private knowledgeConceptsLowerCache = new WeakMap<object, string[]>();
  private lastAuthorKVsRef: FilterKV[] | null = null;
  private lastAuthorsQuery = '';
  private filteredAuthorKVsCache: FilterKV[] = [];
  private lastConceptKVsRef: FilterKV[] | null = null;
  private lastKnowledgeComponentsQuery = '';
  private filteredConceptKVsCache: FilterKV[] = [];
  private readonly globalFilterFields = [
    'id',
    'identity.title',
    'identity.id',
    'identity.type',
    'status',
    'content.prompt',
    'attribution._authors',
    'tags',
  ];

  loading = true;
  private latestQueryParams: Params = {};
  private dataLoaded = false;

  private readonly quickFilterFields = [
    'identity.type',
    'languages.programming_languages',
    'attribution.authors',
    'attribution.provider',
    'classification.knowledge_components',
    'rights.license',
    'delivery',
    'tags',
  ];

  get quickFiltersExpanded() {
    return this.route.snapshot.queryParams?.['qf'] == '1';
  }

  constructor(
    public router: Router,
    private route: ActivatedRoute,
    public app: AppService,
    public api: CatalogV2Service,
    private filterService: FilterService,
    private destroyRef: DestroyRef,
  ) {}

  ngOnInit(): void {
    this.filterService.register(
      'knowledgeConceptIn',
      (value: any, filters: string[] | null | undefined) => {
        if (!filters || !Array.isArray(filters) || !filters.length) return true;
        if (!value || typeof value !== 'object') return false;
        const selected = filters.map((v) => String(v).toLowerCase().trim());
        const current = this.getKnowledgeConceptsLower(value);
        return selected.some((s) => current.includes(s));
      },
    );
    this.filterService.register(
      'deliveryFormatIn',
      (value: any, filters: string[] | null | undefined) => {
        if (!filters || !Array.isArray(filters) || !filters.length) return true;
        if (!Array.isArray(value)) return false;
        const selected = filters.map((v) => String(v).toLowerCase().trim());
        const current = value
          .map((entry: any) =>
            String(entry?.format || '')
              .toLowerCase()
              .trim(),
          )
          .filter(Boolean);
        return selected.some((s) => current.includes(s));
      },
    );
    this.filterService.register(
      'arrayStringIn',
      (value: any, filters: string[] | null | undefined) => {
        if (!filters || !Array.isArray(filters) || !filters.length) return true;
        if (!Array.isArray(value)) return false;
        const selected = filters.map((v) => String(v).toLowerCase().trim());
        const current = value
          .map((v: any) => String(v).toLowerCase().trim())
          .filter(Boolean);
        return selected.some((s) => current.includes(s));
      },
    );
    this.filterService.register(
      'authorNameIn',
      (value: any, filters: string[] | null | undefined) => {
        if (!filters || !Array.isArray(filters) || !filters.length) return true;
        if (!Array.isArray(value)) return false;
        const selected = filters.map((v) => String(v).toLowerCase().trim());
        const names = value
          .map((author: any) =>
            String(author?.name || '')
              .toLowerCase()
              .trim(),
          )
          .filter(Boolean);
        return selected.some((s) => names.includes(s));
      },
    );
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.latestQueryParams = params;
        if (this.dataLoaded && this.table) {
          this.applyFiltersFromParams(params);
        }
      });
    this.reload();
  }

  ngAfterViewInit(): void {
    if (this.dataLoaded) {
      this.applyFiltersFromParams(this.latestQueryParams);
    }
  }

  filter(table: Table, $event: any, skip = false) {
    const value = ($event.target.value || '').trim();
    this.globalQuery = value;
    table.filterGlobal(value, 'contains');
    if (skip) return;
    this.syncQueryParams({ q: value || null });
  }

  reload() {
    this.loading = true;
    this.dataLoaded = false;
    this.api.list().subscribe({
      next: (items: any) => {
        this.items = items;
        this.flattenAuthors();
        this.reloadFilterKVs(this.items);
        this.dataLoaded = true;
        if (this.table) {
          this.applyFiltersFromParams(this.latestQueryParams);
        }
      },
      error: (error: any) => console.log(error),
      complete: () => (this.loading = false),
    });
  }

  flattenAuthors() {
    this.items.forEach((item: any) => {
      if (item.attribution?.authors?.length) {
        item.attribution._authors = item.attribution.authors
          .map((author: any) => author.name.trim())
          .join(', ');
      }
    });
  }

  toggleQuickFilter(table: Table, field: string, facet: FilterKV) {
    const selectedLabels = this.getSelectedLabels(field);
    const isActive = selectedLabels.includes(facet.label);
    const nextLabels = isActive
      ? selectedLabels.filter((label) => label !== facet.label)
      : [...selectedLabels, facet.label];
    const nextFacets = nextLabels.map(
      (label) =>
        this.getFacetForField(field).find((kv) => kv.label === label) || {
          label,
          value: 0,
        },
    );
    this.applyQuickFilter(table, field, nextLabels, nextFacets);
    this.syncQueryParams({ [field]: this.serializeFilterValues(nextLabels) });
  }

  clearQuickFilters(table: Table) {
    table.reset();
    this.globalQuery = '';
    this.selectedKVs = {};
    this.selectedKVs['count'] = 0;
    this.reloadFilterKVs(this.items);
    const clearedParams = this.quickFilterFields.reduce(
      (acc: Params, key) => ({ ...acc, [key]: null }),
      { q: null, qf: null },
    );
    this.syncQueryParams(clearedParams);
  }

  reloadFilterKVs(items: any) {
    this.itemFacetLabelsCache = new WeakMap<object, Map<string, string[]>>();
    this.itemFacetLabelsLowerCache = new WeakMap<
      object,
      Map<string, string[]>
    >();
    this.knowledgeConceptsCache = new WeakMap<object, string[]>();
    this.knowledgeConceptsLowerCache = new WeakMap<object, string[]>();

    if (!items) {
      this.typeKVs = [];
      this.authorKVs = [];
      this.tagKVs = [];
      this.plKVs = [];
      this.deliveryFormatKVs = [];
      this.conceptKVs = [];
      this.providersKVs = [];
      this.licenseKVs = [];
      return;
    }

    const typeCounts = new Map<string, number>();
    const authorCounts = new Map<string, number>();
    const tagCounts = new Map<string, number>();
    const plCounts = new Map<string, number>();
    const deliveryFormatCounts = new Map<string, number>();
    const conceptCounts = new Map<string, number>();
    const providerCounts = new Map<string, number>();
    const licenseCounts = new Map<string, number>();

    items.forEach((item: any) => {
      const type = (item.identity?.type || '').trim();
      if (type) {
        typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
      }

      const authorSet = new Set<string>();
      (item.attribution?.authors || []).forEach((author: any) => {
        const name = (author?.name || '').trim();
        if (!name) return;
        authorSet.add(name);
      });
      authorSet.forEach((label) => {
        authorCounts.set(label, (authorCounts.get(label) || 0) + 1);
      });

      const tagSet = new Set<string>();
      (item.tags || []).forEach((tag: any) => {
        const label = (tag || '').trim();
        if (label) tagSet.add(label);
      });
      tagSet.forEach((label) => {
        tagCounts.set(label, (tagCounts.get(label) || 0) + 1);
      });

      const plSet = new Set<string>();
      (item.languages?.programming_languages || []).forEach((pl: any) => {
        const label = (pl || '').trim();
        if (label) plSet.add(label);
      });
      plSet.forEach((label) => {
        plCounts.set(label, (plCounts.get(label) || 0) + 1);
      });

      const deliveryFormatSet = new Set<string>();
      (item.delivery || []).forEach((delivery: any) => {
        const label = (delivery?.format || '').trim();
        if (label) deliveryFormatSet.add(label);
      });
      deliveryFormatSet.forEach((label) => {
        deliveryFormatCounts.set(
          label,
          (deliveryFormatCounts.get(label) || 0) + 1,
        );
      });

      const knowledgeComponents =
        item.classification?.knowledge_components || {};
      const conceptSet = new Set<string>();
      this.getKnowledgeConcepts(knowledgeComponents).forEach((label) =>
        conceptSet.add(label),
      );
      conceptSet.forEach((label) => {
        conceptCounts.set(label, (conceptCounts.get(label) || 0) + 1);
      });

      const provider = (item.attribution?.provider || '').trim();
      if (provider)
        providerCounts.set(provider, (providerCounts.get(provider) || 0) + 1);

      const license = (item.rights?.license || '').trim();
      if (license)
        licenseCounts.set(license, (licenseCounts.get(license) || 0) + 1);
    });

    this.typeKVs = this.toKeyValue(typeCounts);
    this.authorKVs = this.toKeyValue(authorCounts);
    this.tagKVs = this.toKeyValue(tagCounts);
    this.plKVs = this.toKeyValue(plCounts);
    this.deliveryFormatKVs = this.toKeyValue(deliveryFormatCounts);
    this.conceptKVs = this.toKeyValue(conceptCounts);
    this.providersKVs = this.toKeyValue(providerCounts);
    this.licenseKVs = this.toKeyValue(licenseCounts);
    this.allFacetLabels = {
      'identity.type': this.typeKVs.map((kv) => kv.label),
      'languages.programming_languages': this.plKVs.map((kv) => kv.label),
      delivery: this.deliveryFormatKVs.map((kv) => kv.label),
      'classification.knowledge_components': this.conceptKVs.map(
        (kv) => kv.label,
      ),
      'attribution.authors': this.authorKVs.map((kv) => kv.label),
      'attribution.provider': this.providersKVs.map((kv) => kv.label),
      'rights.license': this.licenseKVs.map((kv) => kv.label),
      tags: this.tagKVs.map((kv) => kv.label),
    };
  }

  onTableFilter(filteredItems: any[] | null | undefined) {
    this.refreshAvailableFacetLabels();
  }

  private toKeyValue(source: Map<string, number>) {
    return Array.from(source.entries())
      .map(([value, count]) => ({ label: value, value: count }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  }

  private refreshAvailableFacetLabels() {
    const availability: { [key: string]: Set<string> } = {};
    this.quickFilterFields.forEach((targetField) => {
      const countMap = new Map<string, number>();
      const allLabels = this.getAllFacetLabels(targetField);
      allLabels.forEach((label) => countMap.set(label, 0));

      allLabels.forEach((label) => {
        let count = 0;
        this.items.forEach((item: any) => {
          if (!this.matchesActiveFiltersExcept(item, targetField)) return;
          if (!this.itemMatchesFacetLabel(item, targetField, label)) return;
          count += 1;
        });
        countMap.set(label, count);
      });

      const kvs = this.toKeyValue(countMap);
      this.setFacetForField(targetField, kvs);
      availability[targetField] = new Set(
        kvs.filter((kv) => kv.value > 0).map((kv) => kv.label),
      );
    });
    this.availableFacetLabels = availability;
  }

  private matchesActiveFiltersExcept(item: any, excludedField: string) {
    if (!this.matchesGlobalQuery(item)) return false;
    return this.quickFilterFields
      .filter((field) => field !== excludedField)
      .every((field) => this.matchesQuickFilterField(item, field));
  }

  private matchesGlobalQuery(item: any) {
    const query = this.globalQuery.trim().toLowerCase();
    if (!query) return true;
    return this.globalFilterFields.some((field) => {
      const value = this.getItemFieldValue(item, field);
      if (Array.isArray(value)) {
        return value.some((v) => String(v).toLowerCase().includes(query));
      }
      return String(value || '')
        .toLowerCase()
        .includes(query);
    });
  }

  private matchesQuickFilterField(item: any, field: string) {
    return this.matchesQuickFilterFieldWithLabels(
      item,
      field,
      this.getSelectedLabels(field),
    );
  }

  private matchesQuickFilterFieldWithLabels(
    item: any,
    field: string,
    selected: string[],
  ) {
    if (!selected.length) return true;
    const itemValues = this.getItemFacetLabelsLower(item, field);
    if (!itemValues.length) return false;
    const selectedValues = selected.map((v) => v.toLowerCase());
    return selectedValues.some((value) => itemValues.includes(value));
  }

  private itemMatchesFacetLabel(item: any, field: string, label: string) {
    const itemValues = this.getItemFacetLabelsLower(item, field);
    const target = label.toLowerCase();
    return itemValues.includes(target);
  }

  private getItemFieldValue(item: any, field: string): any {
    return field.split('.').reduce((acc, key) => acc?.[key], item);
  }

  private getItemFacetLabels(item: any, field: string): string[] {
    if (!item || typeof item !== 'object') return [];
    const cacheKey = item as object;
    const cachedMap = this.itemFacetLabelsCache.get(cacheKey);
    const cached = cachedMap?.get(field);
    if (cached) return cached;

    let labels: string[] = [];
    switch (field) {
      case 'identity.type': {
        const label = (item.identity?.type || '').trim();
        labels = label ? [label] : [];
        break;
      }
      case 'languages.programming_languages':
        labels = (item.languages?.programming_languages || [])
          .map((pl: any) => (pl || '').trim())
          .filter(Boolean);
        break;
      case 'attribution.authors':
        labels = (item.attribution?.authors || [])
          .map((author: any) => (author?.name || '').trim())
          .filter(Boolean);
        break;
      case 'delivery':
        labels = (item.delivery || [])
          .map((delivery: any) => (delivery?.format || '').trim())
          .filter(Boolean);
        break;
      case 'classification.knowledge_components': {
        const knowledgeComponents =
          item.classification?.knowledge_components || {};
        labels = this.getKnowledgeConcepts(knowledgeComponents);
        break;
      }
      case 'attribution.provider': {
        const label = (item.attribution?.provider || '').trim();
        labels = label ? [label] : [];
        break;
      }
      case 'rights.license': {
        const label = (item.rights?.license || '').trim();
        labels = label ? [label] : [];
        break;
      }
      case 'tags':
        labels = (item.tags || [])
          .map((tag: any) => (tag || '').trim())
          .filter(Boolean);
        break;
      default:
        labels = [];
        break;
    }

    const nextMap = cachedMap || new Map<string, string[]>();
    nextMap.set(field, labels);
    this.itemFacetLabelsCache.set(cacheKey, nextMap);
    return labels;
  }

  private getItemFacetLabelsLower(item: any, field: string): string[] {
    if (!item || typeof item !== 'object') return [];
    const cacheKey = item as object;
    const cachedMap = this.itemFacetLabelsLowerCache.get(cacheKey);
    const cached = cachedMap?.get(field);
    if (cached) return cached;
    const lowered = this.getItemFacetLabels(item, field).map((v) =>
      v.toLowerCase(),
    );
    const nextMap = cachedMap || new Map<string, string[]>();
    nextMap.set(field, lowered);
    this.itemFacetLabelsLowerCache.set(cacheKey, nextMap);
    return lowered;
  }

  private getAllFacetLabels(field: string) {
    return (
      this.allFacetLabels[field] ||
      this.getFacetForField(field).map((kv) => kv.label)
    );
  }

  private setFacetForField(field: string, kvs: FilterKV[]) {
    switch (field) {
      case 'identity.type':
        this.typeKVs = kvs;
        return;
      case 'languages.programming_languages':
        this.plKVs = kvs;
        return;
      case 'attribution.authors':
        this.authorKVs = kvs;
        return;
      case 'delivery':
        this.deliveryFormatKVs = kvs;
        return;
      case 'classification.knowledge_components':
        this.conceptKVs = kvs;
        return;
      case 'attribution.provider':
        this.providersKVs = kvs;
        return;
      case 'rights.license':
        this.licenseKVs = kvs;
        return;
      case 'tags':
        this.tagKVs = kvs;
        return;
      default:
        return;
    }
  }

  private applyFiltersFromParams(params: Params) {
    this.globalQuery = (params['q'] || '').trim();
    if (this.table) this.table.filterGlobal(this.globalQuery, 'contains');

    this.selectedKVs = {};
    this.quickFilterFields.forEach((field) => {
      const values = this.parseFilterValues(params[field]);
      if (values.length) {
        const facets = values.map(
          (label) =>
            this.getFacetForField(field).find((kv) => kv.label === label) || {
              label,
              value: 0,
            },
        );
        if (this.table) {
          this.applyQuickFilter(this.table, field, values, facets);
        } else {
          this.selectedKVs[field] = facets;
        }
      } else {
        if (this.table) {
          this.table.filter(null, field, this.getTableMatchModeForField(field));
        }
        delete this.selectedKVs[field];
      }
    });
    this.recountSelected();
    this.refreshAvailableFacetLabels();
  }

  private applyQuickFilter(
    table: Table,
    field: string,
    values: string[],
    facets?: FilterKV[],
  ) {
    if (values.length) {
      table.filter(values, field, this.getTableMatchModeForField(field));
      this.selectedKVs[field] =
        facets ||
        values.map((label) => ({
          label,
          value: 0,
        }));
    } else {
      table.filter(null, field, this.getTableMatchModeForField(field));
      delete this.selectedKVs[field];
    }
    this.recountSelected();
  }

  private recountSelected() {
    this.selectedKVs['count'] = this.quickFilterFields.reduce(
      (count, field) => count + this.getSelectedLabels(field).length,
      0,
    );
  }

  private syncQueryParams(params: Params) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl: false,
    });
  }

  toggleQuickFiltersPanel() {
    this.syncQueryParams({
      ['qf']: this.quickFiltersExpanded ? null : '1',
    });
  }

  private getFacetForField(field: string) {
    switch (field) {
      case 'identity.type':
        return this.typeKVs;
      case 'languages.programming_languages':
        return this.plKVs;
      case 'attribution.authors':
        return this.authorKVs;
      case 'delivery':
        return this.deliveryFormatKVs;
      case 'classification.knowledge_components':
        return this.conceptKVs;
      case 'attribution.provider':
        return this.providersKVs;
      case 'rights.license':
        return this.licenseKVs;
      case 'tags':
        return this.tagKVs;
      default:
        return [];
    }
  }

  clearGlobalFilter(table: Table) {
    this.globalQuery = '';
    table.filterGlobal('', 'contains');
    this.syncQueryParams({ q: null });
  }

  clearQuickFilter(table: Table, field: string) {
    this.applyQuickFilter(table, field, []);
    this.syncQueryParams({ [field]: null });
  }

  toggleActiveQuickFilter(table: Table, field: string, label: string) {
    const facet = this.getFacetForField(field).find(
      (kv) => kv.label === label,
    ) || {
      label,
      value: 0,
    };
    this.toggleQuickFilter(table, field, facet);
  }

  get activeQuickFilterKeys() {
    return this.quickFilterFields.filter(
      (field) => this.getSelectedLabels(field).length > 0,
    );
  }

  get activeQuickFilters() {
    return this.activeQuickFilterKeys.flatMap((field) =>
      this.getSelectedLabels(field).map((label) => ({ field, label })),
    );
  }

  isQuickFilterSelected(field: string, label: string) {
    return this.getSelectedLabels(field).includes(label);
  }

  isQuickFilterAvailable(field: string, label: string) {
    return !!this.availableFacetLabels[field]?.has(label);
  }

  selectedCount(field: string) {
    return this.getSelectedLabels(field).length;
  }

  quickFilterFieldLabel(field: string) {
    switch (field) {
      case 'identity.type':
        return 'Types';
      case 'languages.programming_languages':
        return 'Programming Languages';
      case 'attribution.authors':
        return 'Authors';
      case 'attribution.provider':
        return 'Providers';
      case 'classification.knowledge_components':
        return 'Knowledge Components';
      case 'rights.license':
        return 'Licenses';
      case 'delivery':
        return 'Delivery Format';
      case 'tags':
        return 'Tags';
      default:
        return field;
    }
  }

  onKnowledgeComponentsQueryChange(value: string) {
    this.knowledgeComponentsQuery = value || '';
    this.showAllKnowledgeComponents = false;
  }

  onAuthorsQueryChange(value: string) {
    this.authorsQuery = value || '';
    this.showAllAuthors = false;
  }

  toggleAuthorsView() {
    this.showAllAuthors = !this.showAllAuthors;
  }

  toggleKnowledgeComponentsView() {
    this.showAllKnowledgeComponents = !this.showAllKnowledgeComponents;
  }

  get filteredAuthorKVs() {
    const query = this.authorsQuery.trim().toLowerCase();
    if (this.lastAuthorKVsRef === this.authorKVs && this.lastAuthorsQuery === query) {
      return this.filteredAuthorKVsCache;
    }
    this.lastAuthorKVsRef = this.authorKVs;
    this.lastAuthorsQuery = query;
    this.filteredAuthorKVsCache = !query
      ? this.authorKVs
      : this.authorKVs.filter((kv) => kv.label.toLowerCase().includes(query));
    return this.filteredAuthorKVsCache;
  }

  get visibleAuthorKVs() {
    if (this.showAllAuthors) return this.filteredAuthorKVs;
    return this.filteredAuthorKVs.slice(0, this.authorsDefaultLimit);
  }

  get hasMoreAuthors() {
    return this.filteredAuthorKVs.length > this.authorsDefaultLimit;
  }

  get filteredConceptKVs() {
    const query = this.knowledgeComponentsQuery.trim().toLowerCase();
    if (
      this.lastConceptKVsRef === this.conceptKVs &&
      this.lastKnowledgeComponentsQuery === query
    ) {
      return this.filteredConceptKVsCache;
    }
    this.lastConceptKVsRef = this.conceptKVs;
    this.lastKnowledgeComponentsQuery = query;
    this.filteredConceptKVsCache = !query
      ? this.conceptKVs
      : this.conceptKVs.filter((kv) => kv.label.toLowerCase().includes(query));
    return this.filteredConceptKVsCache;
  }

  get visibleConceptKVs() {
    if (this.showAllKnowledgeComponents) return this.filteredConceptKVs;
    return this.filteredConceptKVs.slice(
      0,
      this.knowledgeComponentsDefaultLimit,
    );
  }

  get hasMoreKnowledgeComponents() {
    return (
      this.filteredConceptKVs.length > this.knowledgeComponentsDefaultLimit
    );
  }

  private getSelectedLabels(field: string) {
    return ((this.selectedKVs[field] || []) as FilterKV[]).map(
      (kv) => kv.label,
    );
  }

  private getTableMatchModeForField(field: string) {
    if (field === 'languages.programming_languages' || field === 'tags') {
      return 'arrayStringIn';
    }
    if (field === 'delivery') {
      return 'deliveryFormatIn';
    }
    if (field === 'classification.knowledge_components') {
      return 'knowledgeConceptIn';
    }
    if (field === 'attribution.authors') {
      return 'authorNameIn';
    }
    return 'in';
  }

  private parseFilterValues(value: any): string[] {
    const raw = String(value || '').trim();
    if (!raw) return [];
    return raw
      .split(this.multiFilterSeparator)
      .map((v) => v.trim())
      .filter(Boolean);
  }

  private serializeFilterValues(values: string[]): string | null {
    if (!values.length) return null;
    return values.join(this.multiFilterSeparator);
  }

  private getKnowledgeConcepts(knowledgeComponents: any): string[] {
    if (!knowledgeComponents || typeof knowledgeComponents !== 'object') {
      return [];
    }
    const key = knowledgeComponents as object;
    const cached = this.knowledgeConceptsCache.get(key);
    if (cached) return cached;
    const concepts = Array.from(
      new Set(
        Object.values(knowledgeComponents as Record<string, any>)
          .flatMap((entry) => (entry?.concepts || []) as any[])
          .map((concept) => String(concept || '').trim())
          .filter(Boolean),
      ),
    );
    this.knowledgeConceptsCache.set(key, concepts);
    return concepts;
  }

  private getKnowledgeConceptsLower(knowledgeComponents: any): string[] {
    if (!knowledgeComponents || typeof knowledgeComponents !== 'object') {
      return [];
    }
    const key = knowledgeComponents as object;
    const cached = this.knowledgeConceptsLowerCache.get(key);
    if (cached) return cached;
    const concepts = this.getKnowledgeConcepts(knowledgeComponents).map((v) =>
      v.toLowerCase(),
    );
    this.knowledgeConceptsLowerCache.set(key, concepts);
    return concepts;
  }
}
