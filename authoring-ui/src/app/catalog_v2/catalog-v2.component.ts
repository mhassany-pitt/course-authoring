import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Table } from 'primeng/table';
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

  loading = true;
  private viewReady = false;
  private dataReady = false;
  private lastQueryParams: Params | null = null;
  private isApplyingRouteFilters = false;
  private readonly quickFilterFields = [
    'identity.type',
    'languages.programming_languages',
    'attribution._authors',
    'attribution.provider',
    'rights.license',
    'tags',
  ];

  constructor(
    public router: Router,
    private route: ActivatedRoute,
    public app: AppService,
    public api: CatalogV2Service
  ) { }

  ngOnInit(): void {
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
          .map(
            (author: any) =>
              `${author.name}` +
              (author.affiliation ? ` (${author.affiliation})` : '')
          )
          .join(', ');
      }
    });
  }

  toggleQuickFilter(
    table: Table,
    field: string,
    facet: FilterKV,
    matchMode = 'contains'
  ) {
    const isActive = this.selectedKVs[field]?.label == facet.label;
    this.applyQuickFilter(table, field, isActive ? null : facet.label.trim(), matchMode, facet);
    this.syncQueryParams({ [field]: isActive ? null : facet.label.trim() });
  }

  clearQuickFilters(table: Table) {
    table.reset();
    if (this.searchInputEl?.nativeElement) {
      this.searchInputEl.nativeElement.value = '';
    }
    this.selectedKVs = {};
    this.selectedKVs['count'] = 0;
    this.reloadFilterKVs(this.items);
    const clearedParams = this.quickFilterFields.reduce(
      (acc: Params, key) => ({ ...acc, [key]: null }),
      { q: null }
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
        const label = author.affiliation
          ? `${name} (${author.affiliation})`
          : name;
        authorSet.add(label);
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
  }

  private toKeyValue(source: Map<string, number>) {
    return Array.from(source.entries())
      .map(([value, count]) => ({ label: value, value: count }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  }

  private applyFiltersIfReady() {
    if (!this.viewReady || !this.dataReady || !this.table || !this.lastQueryParams) {
      return;
    }
    this.applyFiltersFromParams(this.lastQueryParams);
  }

  private applyFiltersFromParams(params: Params) {
    this.isApplyingRouteFilters = true;
    try {
      const global = (params['q'] || '').trim();
      if (this.searchInputEl?.nativeElement) {
        this.searchInputEl.nativeElement.value = global;
      }
      this.table.filterGlobal(global, 'contains');

      this.selectedKVs = {};
      this.quickFilterFields.forEach((field) => {
        const value = (params[field] || '').trim();
        const matchMode = this.getMatchModeForField(field);
        if (value) {
          this.table.filter(value, field, matchMode);
          const facet = this.getFacetForField(field).find((kv) => kv.label === value);
          this.selectedKVs[field] = facet || { label: value, value: 0 };
        } else {
          this.table.filter(null, field, matchMode);
        }
      });
      this.recountSelected();
    } finally {
      this.isApplyingRouteFilters = false;
    }
  }

  private applyQuickFilter(
    table: Table,
    field: string,
    value: string | null,
    matchMode: string,
    facet?: FilterKV
  ) {
    if (value) {
      table.filter(value, field, matchMode);
      this.selectedKVs[field] = facet || { label: value, value: 0 };
    } else {
      table.filter(null, field, matchMode);
      delete this.selectedKVs[field];
    }
    this.recountSelected();
  }

  private recountSelected() {
    this.selectedKVs['count'] = Object.keys(this.selectedKVs).filter(
      (key) => key !== 'count'
    ).length;
  }

  private syncQueryParams(params: Params) {
    if (this.isApplyingRouteFilters) return;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private getMatchModeForField(field: string) {
    if (
      field === 'identity.type' ||
      field === 'languages.programming_languages' ||
      field === 'attribution.provider' ||
      field === 'rights.license'
    ) {
      return 'equals';
    }
    return 'contains';
  }

  private getFacetForField(field: string) {
    switch (field) {
      case 'identity.type':
        return this.typeKVs;
      case 'languages.programming_languages':
        return this.plKVs;
      case 'attribution._authors':
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
}
