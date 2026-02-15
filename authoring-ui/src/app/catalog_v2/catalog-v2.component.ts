import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
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
  globalQuery = '';
  private readonly multiFilterSeparator = '||';
  private readonly quickFiltersOpenParam = 'qf';
  private availableFacetLabels: { [key: string]: Set<string> } = {};
  private allFacetLabels: { [key: string]: string[] } = {};
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
  private viewReady = false;
  private dataReady = false;
  private lastQueryParams: Params | null = null;
  private isApplyingRouteFilters = false;
  private readonly quickFilterFields = [
    'identity.type', // is a string
    'languages.programming_languages', // is an array of strings
    'attribution.authors', // attribution.authors is an array of objects with a "name" field, but we flatten it to an array of strings for filtering
    'attribution.provider', // is a string
    'rights.license', // is a string
    'tags', // is an array of strings
  ];

  get quickFiltersExpanded() {
    return this.lastQueryParams?.[this.quickFiltersOpenParam] != null;
  }

  constructor(
    public router: Router,
    private route: ActivatedRoute,
    public app: AppService,
    public api: CatalogV2Service,
    private filterService: FilterService,
  ) {}

  ngOnInit(): void {
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
    this.route.queryParams.subscribe((params) => {
      this.lastQueryParams = params;
      this.applyFiltersIfReady();
    });
    this.reload();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.applyFiltersIfReady();
  }

  filter(table: Table, $event: any) {
    const value = ($event.target.value || '').trim();
    this.globalQuery = value;
    table.filterGlobal(value, 'contains');
    this.syncQueryParams({ q: value || null });
  }

  reload() {
    this.loading = true;
    this.api.list().subscribe({
      next: (items: any) => {
        this.items = items;
        this.flattenAuthors();
        this.reloadFilterKVs(this.items);
        this.refreshAvailableFacetLabels();
        this.dataReady = true;
        this.applyFiltersIfReady();
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
    if (this.searchInputEl?.nativeElement) {
      this.searchInputEl.nativeElement.value = '';
    }
    this.selectedKVs = {};
    this.selectedKVs['count'] = 0;
    this.reloadFilterKVs(this.items);
    const clearedParams = this.quickFilterFields.reduce(
      (acc: Params, key) => ({ ...acc, [key]: null }),
      { q: null },
    );
    this.syncQueryParams(clearedParams);
  }

  reloadFilterKVs(items: any) {
    if (!items) {
      this.typeKVs = [];
      this.authorKVs = [];
      this.tagKVs = [];
      this.plKVs = [];
      this.providersKVs = [];
      this.licenseKVs = [];
      return;
    }

    const typeCounts = new Map<string, number>();
    const authorCounts = new Map<string, number>();
    const tagCounts = new Map<string, number>();
    const plCounts = new Map<string, number>();
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
    this.providersKVs = this.toKeyValue(providerCounts);
    this.licenseKVs = this.toKeyValue(licenseCounts);
    this.allFacetLabels = {
      'identity.type': this.typeKVs.map((kv) => kv.label),
      'languages.programming_languages': this.plKVs.map((kv) => kv.label),
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
    const itemValues = this.getItemFacetLabels(item, field).map((v) =>
      v.toLowerCase(),
    );
    if (!itemValues.length) return false;
    const selectedValues = selected.map((v) => v.toLowerCase());
    return selectedValues.some((value) => itemValues.includes(value));
  }

  private itemMatchesFacetLabel(item: any, field: string, label: string) {
    const itemValues = this.getItemFacetLabels(item, field).map((v) =>
      v.toLowerCase(),
    );
    const target = label.toLowerCase();
    return itemValues.includes(target);
  }

  private getItemFieldValue(item: any, field: string): any {
    return field.split('.').reduce((acc, key) => acc?.[key], item);
  }

  private getItemFacetLabels(item: any, field: string): string[] {
    switch (field) {
      case 'identity.type': {
        const label = (item.identity?.type || '').trim();
        return label ? [label] : [];
      }
      case 'languages.programming_languages':
        return (item.languages?.programming_languages || [])
          .map((pl: any) => (pl || '').trim())
          .filter(Boolean);
      case 'attribution.authors':
        return (item.attribution?.authors || [])
          .map((author: any) => (author?.name || '').trim())
          .filter(Boolean);
      case 'attribution.provider': {
        const label = (item.attribution?.provider || '').trim();
        return label ? [label] : [];
      }
      case 'rights.license': {
        const label = (item.rights?.license || '').trim();
        return label ? [label] : [];
      }
      case 'tags':
        return (item.tags || [])
          .map((tag: any) => (tag || '').trim())
          .filter(Boolean);
      default:
        return [];
    }
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

  private applyFiltersIfReady() {
    if (
      !this.viewReady ||
      !this.dataReady ||
      this.loading ||
      !this.table ||
      !this.lastQueryParams
    ) {
      return;
    }
    this.applyFiltersFromParams(this.lastQueryParams);
  }

  private applyFiltersFromParams(params: Params) {
    this.isApplyingRouteFilters = true;
    try {
      const global = (params['q'] || '').trim();
      this.globalQuery = global;
      if (this.searchInputEl?.nativeElement) {
        this.searchInputEl.nativeElement.value = global;
      }
      this.table.filterGlobal(global, 'contains');

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
          this.applyQuickFilter(this.table, field, values, facets);
        } else {
          this.table.filter(null, field, this.getTableMatchModeForField(field));
          delete this.selectedKVs[field];
        }
      });
      this.recountSelected();
      this.refreshAvailableFacetLabels();
    } finally {
      this.isApplyingRouteFilters = false;
    }
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
    if (this.isApplyingRouteFilters) return;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl: false,
    });
  }

  toggleQuickFiltersPanel() {
    this.syncQueryParams({
      [this.quickFiltersOpenParam]: this.quickFiltersExpanded ? null : '1',
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
    if (this.searchInputEl?.nativeElement) {
      this.searchInputEl.nativeElement.value = '';
    }
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
    return Object.keys(this.selectedKVs).filter((key) => key !== 'count');
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

  private getSelectedLabels(field: string) {
    return ((this.selectedKVs[field] || []) as FilterKV[]).map(
      (kv) => kv.label,
    );
  }

  private getTableMatchModeForField(field: string) {
    if (field === 'languages.programming_languages' || field === 'tags') {
      return 'arrayStringIn';
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
}
