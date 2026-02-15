import { HttpClient } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { environment } from '../../environments/environment';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { AppService } from '../app.service';
import { getNavLinks } from '../utils';
import { ConfirmationService, FilterService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { Table } from 'primeng/table';
import { Title } from '@angular/platform-browser';

type FilterKV = { label: string; value: number };

@Component({
  selector: 'app-hub',
  templateUrl: './hub.component.html',
  styleUrls: ['./hub.component.less'],
})
export class HubComponent implements OnInit, AfterViewInit {
  @ViewChild('table') table!: Table;
  @ViewChild('searchInputEl') searchInputEl!: ElementRef<HTMLInputElement>;

  navLinks = getNavLinks(this.app);

  delayedTimeout: any;
  courses: any[] = [];

  selected: any = null;

  selectedKVs: { [key: string]: any } = {};
  domainKVs: FilterKV[] = [];
  institutionKVs: FilterKV[] = [];
  authorKVs: FilterKV[] = [];
  quickFiltersExpanded = false;
  globalQuery = '';
  loading = true;

  private readonly multiFilterSeparator = '||';
  private readonly quickFiltersOpenParam = 'qf';
  private availableFacetLabels: { [key: string]: Set<string> } = {};
  private allFacetLabels: { [key: string]: string[] } = {};

  private viewReady = false;
  private dataReady = false;
  private lastQueryParams: Params | null = null;
  private isApplyingRouteFilters = false;
  private readonly quickFilterFields = [
    'domain',
    'institution',
    'author.fullname',
  ];

  get isLoggedIn() {
    return !!this.app.user;
  }

  constructor(
    private http: HttpClient,
    public router: Router,
    private route: ActivatedRoute,
    private title: Title,
    public app: AppService,
    private confirm: ConfirmationService,
    private filterService: FilterService,
  ) {}

  ngOnInit(): void {
    this.filterService.register(
      'inCaseInsensitive',
      (value: any, filters: string[] | null | undefined) => {
        if (!filters || !Array.isArray(filters) || !filters.length) return true;
        const target = String(value ?? '').toLowerCase().trim();
        return filters
          .map((v) => String(v ?? '').toLowerCase().trim())
          .includes(target);
      },
    );

    this.title.setTitle('Courses Hub');
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
    this.http.get(`${environment.apiUrl}/hub`).subscribe({
      next: (resp: any) => {
        this.courses = resp;
        this.selectedKVs = { count: 0 };
        this.reloadFilterKVs(this.courses);
        this.dataReady = true;
        this.applyFiltersIfReady();
      },
      error: (error: any) => console.log(error),
      complete: () => (this.loading = false),
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
        this.findFacetByLabel(field, label) || {
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
    this.selectedKVs = { count: 0 };
    this.reloadFilterKVs(this.courses);
    const clearedParams = this.quickFilterFields.reduce(
      (acc: Params, key) => ({ ...acc, [key]: null }),
      { q: null },
    );
    this.syncQueryParams(clearedParams);
  }

  reloadFilterKVs(courses: any[] | null | undefined) {
    if (!courses) {
      this.domainKVs = [];
      this.institutionKVs = [];
      this.authorKVs = [];
      return;
    }

    const domainCounts = new Map<string, number>();
    const institutionCounts = new Map<string, number>();
    const institutionDisplay = new Map<string, string>();
    const authorCounts = new Map<string, number>();

    courses.forEach((course: any) => {
      const domain = (course.domain || '').trim();
      if (domain) {
        const key = domain.toLowerCase();
        domainCounts.set(key, (domainCounts.get(key) || 0) + 1);
      }

      const institution = (course.institution || '').trim();
      if (institution) {
        const key = institution.toLowerCase();
        institutionCounts.set(key, (institutionCounts.get(key) || 0) + 1);
        if (!institutionDisplay.has(key)) institutionDisplay.set(key, institution);
      }

      const author = (course.author?.fullname || '').trim();
      if (author) {
        const key = author.toLowerCase();
        authorCounts.set(key, (authorCounts.get(key) || 0) + 1);
      }
    });

    this.domainKVs = Array.from(domainCounts.entries())
      .map(([value, count]) => ({ label: value, value: count }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));

    this.institutionKVs = Array.from(institutionCounts.entries())
      .map(([key, count]) => ({
        label: institutionDisplay.get(key) || key,
        value: count,
      }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));

    this.authorKVs = Array.from(authorCounts.entries())
      .map(([value, count]) => ({ label: value, value: count }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));

    this.allFacetLabels = {
      domain: this.domainKVs.map((kv) => kv.label),
      institution: this.institutionKVs.map((kv) => kv.label),
      'author.fullname': this.authorKVs.map((kv) => kv.label),
    };
  }

  onTableFilter(filteredCourses: any[] | null | undefined) {
    this.refreshAvailableFacetLabels();
  }

  isQuickFilterSelected(field: string, label: string) {
    return this.getSelectedLabels(field).includes(label);
  }

  isQuickFilterAvailable(field: string, label: string) {
    return !!this.availableFacetLabels[field]?.has(label.toLowerCase());
  }

  clearGlobalFilter(table: Table) {
    this.globalQuery = '';
    if (this.searchInputEl?.nativeElement) {
      this.searchInputEl.nativeElement.value = '';
    }
    table.filterGlobal('', 'contains');
    this.syncQueryParams({ q: null });
  }

  toggleActiveQuickFilter(table: Table, field: string, label: string) {
    const facet =
      this.findFacetByLabel(field, label) || {
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

  toggleLoad(course: any) {
    if (this.selected && this.selected.id === course.id) this.selected = null;
    else
      this.http.get(`${environment.apiUrl}/hub/${course.id}`).subscribe({
        next: (resp: any) => {
          const resources = resp.resources;
          resp.resources = {};
          for (const r of resources) resp.resources[r.id] = r;
          this.selected = resp;
        },
        error: (error: any) => console.log(error),
      });
  }

  clone(course: any) {
    this.confirm.confirm({
      header: 'Cloning Course',
      message: `Are you sure you want to clone the course "${course.name}"?`,
      acceptButtonStyleClass: 'p-button-outlined',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.http
          .post(
            `${environment.apiUrl}/courses/${course.id}/clone`,
            {},
            { withCredentials: true },
          )
          .subscribe({
            next: (resp: any) => this.router.navigate(['/courses', resp.id]),
            error: (error: any) => console.log(error),
          });
      },
    });
  }

  async export(course: any) {
    course = await firstValueFrom(
      this.http.get(`${environment.apiUrl}/hub/${course.id}`),
    );
    delete course.user_email;
    const blob = new Blob([JSON.stringify(course, null, 2)], {
      type: 'application/json',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `paws-catalog_course-export_${Date.now()}.json`;
    link.click();
    link.remove();
  }

  keys(obj: any) {
    return obj ? Object.keys(obj) : [];
  }

  private applyFiltersIfReady() {
    if (
      !this.viewReady ||
      !this.dataReady ||
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
      this.quickFiltersExpanded =
        String(params[this.quickFiltersOpenParam] || '') === '1';

      const global = (params['q'] || '').trim();
      this.globalQuery = global;
      if (this.searchInputEl?.nativeElement) {
        this.searchInputEl.nativeElement.value = global;
      }
      this.table.filterGlobal(global, 'contains');

      this.selectedKVs = { count: 0 };
      this.quickFilterFields.forEach((field) => {
        const values = this.parseFilterValues(params[field]);
        if (values.length) {
          const facets = values.map(
            (label) =>
              this.findFacetByLabel(field, label) || {
                label,
                value: 0,
              },
          );
          this.applyQuickFilter(this.table, field, values, facets);
        } else {
          this.table.filter(null, field, 'inCaseInsensitive');
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
      table.filter(values, field, 'inCaseInsensitive');
      this.selectedKVs[field] =
        facets ||
        values.map((label) => ({
          label,
          value: 0,
        }));
    } else {
      table.filter(null, field, 'inCaseInsensitive');
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
    this.quickFiltersExpanded = !this.quickFiltersExpanded;
    this.syncQueryParams({
      [this.quickFiltersOpenParam]: this.quickFiltersExpanded ? '1' : null,
    });
  }

  private getFacetForField(field: string) {
    switch (field) {
      case 'domain':
        return this.domainKVs;
      case 'institution':
        return this.institutionKVs;
      case 'author.fullname':
        return this.authorKVs;
      default:
        return [];
    }
  }

  private findFacetByLabel(field: string, label: string) {
    const target = label.toLowerCase().trim();
    return this.getFacetForField(field).find(
      (kv) => kv.label.toLowerCase().trim() === target,
    );
  }

  private refreshAvailableFacetLabels() {
    const availability: { [key: string]: Set<string> } = {};
    this.quickFilterFields.forEach((targetField) => {
      const countMap = new Map<string, number>();
      const allLabels = this.getAllFacetLabels(targetField);
      allLabels.forEach((label) => countMap.set(label, 0));

      allLabels.forEach((label) => {
        let count = 0;
        this.courses.forEach((course: any) => {
          if (!this.matchesActiveFiltersExcept(course, targetField)) return;
          if (!this.itemMatchesFacetLabel(course, targetField, label)) return;
          count += 1;
        });
        countMap.set(label, count);
      });

      const kvs = this.toKeyValue(countMap);
      this.setFacetForField(targetField, kvs);
      availability[targetField] = new Set(
        kvs.filter((kv) => kv.value > 0).map((kv) => kv.label.toLowerCase()),
      );
    });
    this.availableFacetLabels = availability;
  }

  private matchesActiveFiltersExcept(course: any, excludedField: string) {
    if (!this.matchesGlobalQuery(course)) return false;
    return this.quickFilterFields
      .filter((field) => field !== excludedField)
      .every((field) =>
        this.matchesQuickFilterFieldWithLabels(
          course,
          field,
          this.getSelectedLabels(field),
        ),
      );
  }

  private matchesGlobalQuery(course: any) {
    const query = this.globalQuery.trim().toLowerCase();
    if (!query) return true;
    const fields = [
      'id',
      'user_email',
      'code',
      'name',
      'description',
      'domain',
      'institution',
      'author.fullname',
      'author.email',
      'units_ct',
      'resources_ct',
      'created_at',
    ];
    return fields.some((field) =>
      String(this.getFieldValue(course, field) || '')
        .toLowerCase()
        .includes(query),
    );
  }

  private matchesQuickFilterFieldWithLabels(
    course: any,
    field: string,
    selected: string[],
  ) {
    if (!selected.length) return true;
    const value = String(this.getFieldValue(course, field) || '').toLowerCase();
    const selectedValues = selected.map((v) => v.toLowerCase());
    return selectedValues.includes(value);
  }

  private itemMatchesFacetLabel(course: any, field: string, label: string) {
    const value = String(this.getFieldValue(course, field) || '').toLowerCase();
    return value === label.toLowerCase();
  }

  private getFieldValue(course: any, field: string): any {
    return field.split('.').reduce((acc, key) => acc?.[key], course);
  }

  private getAllFacetLabels(field: string) {
    return (
      this.allFacetLabels[field] || this.getFacetForField(field).map((kv) => kv.label)
    );
  }

  private setFacetForField(field: string, kvs: FilterKV[]) {
    switch (field) {
      case 'domain':
        this.domainKVs = kvs;
        return;
      case 'institution':
        this.institutionKVs = kvs;
        return;
      case 'author.fullname':
        this.authorKVs = kvs;
        return;
      default:
        return;
    }
  }

  private getSelectedLabels(field: string) {
    return ((this.selectedKVs[field] || []) as FilterKV[]).map((kv) => kv.label);
  }

  private toKeyValue(source: Map<string, number>) {
    return Array.from(source.entries())
      .map(([value, count]) => ({ label: value, value: count }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
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
