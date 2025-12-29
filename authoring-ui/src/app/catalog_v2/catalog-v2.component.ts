import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CatalogV2Service } from './catalog-v2.service';
import { AppService } from '../app.service';
import { getNavLinks } from '../utils';

type FilterKV = { label: string; value: number };

@Component({
  selector: 'app-catalog-v2',
  templateUrl: './catalog-v2.component.html',
  styleUrls: ['./catalog-v2.component.less'],
})
export class CatalogV2Component implements OnInit {
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

  constructor(
    public router: Router,
    public app: AppService,
    public api: CatalogV2Service
  ) {}

  ngOnInit(): void {
    this.reload();
  }

  filter(table: any, $event: any) {
    table.filterGlobal($event.target.value, 'contains');
  }

  reload() {
    this.loading = true;
    this.api.list().subscribe({
      next: (items: any) => {
        this.items = items;
        this.flattenAuthors();
        this.reloadFilterKVs(this.items);
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
    table: any,
    field: string,
    facet: FilterKV,
    matchMode = 'contains'
  ) {
    if (this.selectedKVs[field]?.label == facet.label) {
      table.filter(null, field, matchMode);
      delete this.selectedKVs[field];
      this.selectedKVs['count']--;
    } else {
      table.filter(facet.label.trim(), field, matchMode);
      this.selectedKVs[field] = facet;
      this.selectedKVs['count'] = (this.selectedKVs['count'] || 0) + 1;
    }
  }

  clearQuickFilters(table: any) {
    table.reset();
    this.selectedKVs = {};
    this.selectedKVs['count'] = 0;
    this.reloadFilterKVs(this.items);
  }

  reloadFilterKVs(items: any) {
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
}
