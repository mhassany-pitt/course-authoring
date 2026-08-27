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
import { getLegacyCid, getLegacyCourseByCid } from '../legacy-courses';
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
  globalQuery = '';
  currentCid: number | null = null;
  loading = true;
  highlightedUnit: string | null = null;
  highlightedItem: string | null = null;
  expandedUnitIds = new Set<string | number>();

  quickFilterSections: {
    domains: boolean;
    institutions: boolean;
    authors: boolean;
    [key: string]: boolean;
  } = {
    domains: true,
    institutions: true,
    authors: true,
  };

  authorFilterQuery = '';
  institutionFilterQuery = '';
  domainFilterQuery = '';
  showAllAuthors = false;
  showAllInstitutions = false;

  private readonly multiFilterSeparator = '||';
  private availableFacetLabels: { [key: string]: Set<string> } = {};
  private allFacetLabels: { [key: string]: string[] } = {};

  private readonly quickFilterFields = [
    'domain',
    'institution',
    'author.fullname',
  ];

  get quickFiltersExpanded() {
    return true;
  }

  toggleQuickFilterSection(section: string) {
    this.quickFilterSections[section] = !this.quickFilterSections[section];
  }

  get filteredDomainKVs(): FilterKV[] {
    if (!this.domainFilterQuery.trim()) return this.domainKVs;
    const q = this.domainFilterQuery.trim().toLowerCase();
    return this.domainKVs.filter((kv) => kv.label.toLowerCase().includes(q));
  }

  get filteredInstitutionKVs(): FilterKV[] {
    let list = this.institutionKVs;
    if (this.institutionFilterQuery.trim()) {
      const q = this.institutionFilterQuery.trim().toLowerCase();
      list = list.filter((kv) => kv.label.toLowerCase().includes(q));
    }
    if (!this.showAllInstitutions && !this.institutionFilterQuery.trim()) {
      return list.slice(0, 6);
    }
    return list;
  }

  get filteredAuthorKVs(): FilterKV[] {
    let list = this.authorKVs;
    if (this.authorFilterQuery.trim()) {
      const q = this.authorFilterQuery.trim().toLowerCase();
      list = list.filter((kv) => kv.label.toLowerCase().includes(q));
    }
    if (!this.showAllAuthors && !this.authorFilterQuery.trim()) {
      return list.slice(0, 6);
    }
    return list;
  }

  get activeFilterChips(): { field: string; label: string; displayField: string }[] {
    const chips: { field: string; label: string; displayField: string }[] = [];
    if (this.globalQuery) {
      chips.push({ field: 'q', label: `"${this.globalQuery}"`, displayField: 'Query' });
    }
    if (this.highlightedUnit) {
      chips.push({ field: 'unit', label: this.highlightedUnit, displayField: 'Unit' });
    }
    if (this.highlightedItem) {
      chips.push({ field: 'item', label: this.highlightedItem, displayField: 'Item' });
    }
    this.activeQuickFilterKeys.forEach((field) => {
      const fieldName =
        field === 'domain'
          ? 'Domain'
          : field === 'institution'
            ? 'Institution'
            : field === 'author.fullname'
              ? 'Author'
              : field;
      this.getSelectedLabels(field).forEach((label) => {
        chips.push({ field, label, displayField: fieldName });
      });
    });
    return chips;
  }

  removeFilterChip(table: Table, chip: { field: string; label: string; displayField: string }) {
    if (chip.field === 'q') {
      this.clearGlobalFilter(table);
    } else if (chip.field === 'unit') {
      this.highlightedUnit = null;
      this.syncQueryParams({ unit: null });
    } else if (chip.field === 'item') {
      this.highlightedItem = null;
      this.syncQueryParams({ item: null, act: null, activity: null });
    } else {
      const facet = this.findFacetByLabel(chip.field, chip.label) || {
        label: chip.label,
        value: 0,
      };
      this.toggleQuickFilter(table, chip.field, facet);
    }
  }

  getDomainBadgeClass(domain: string): string {
    const d = (domain || '').toLowerCase().trim();
    if (d === 'py' || d === 'python') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (d === 'java') return 'bg-orange-50 text-orange-700 border-orange-200';
    if (d === 'cpp' || d === 'c++' || d === 'c') return 'bg-sky-50 text-sky-700 border-sky-200';
    if (d === 'sql') return 'bg-purple-50 text-purple-700 border-purple-200';
    if (d === 'js' || d === 'javascript') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  }

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
    this.route.queryParams.subscribe((params) =>
      this.applyFiltersFromParams(params),
    );
    this.reload();
  }

  ngAfterViewInit(): void {}

  filter(table: Table, $event: any, skip = false) {
    const value = ($event.target.value || '').trim();
    this.globalQuery = value;
    this.currentCid = null;
    if (table) {
      table.filter(null, 'cid', 'equals');
      table.filterGlobal(value, 'contains');
    }
    if (skip) return;
    this.syncQueryParams({
      q: value || null,
      cid: null,
      unit: null,
      item: null,
      act: null,
      activity: null,
    });
  }

  reload() {
    this.loading = true;
    this.http.get(`${environment.apiUrl}/hub`).subscribe({
      next: (resp: any) => {
        this.courses = (resp || []).map((c: any) => {
          let cid = c.cid != null ? Number(c.cid) : null;
          if (cid == null && c.id && !isNaN(Number(c.id))) {
            cid = Number(c.id);
          }
          if (cid == null) {
            cid = getLegacyCid(c.code, c.name) ?? null;
          }
          return {
            ...c,
            cid,
          };
        });
        this.selectedKVs = { count: 0 };
        this.reloadFilterKVs(this.courses);
        this.refreshAvailableFacetLabels();
        setTimeout(
          () => this.applyFiltersFromParams(this.route.snapshot.queryParams),
          0,
        );
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
    if (table) {
      table.reset();
      table.filter(null, 'cid', 'equals');
      table.filterGlobal('', 'contains');
    }
    this.currentCid = null;
    this.globalQuery = '';
    this.selectedKVs = { count: 0 };
    this.highlightedUnit = null;
    this.highlightedItem = null;
    this.selected = null;
    this.expandedUnitIds.clear();
    this.reloadFilterKVs(this.courses);
    const clearedParams = this.quickFilterFields.reduce(
      (acc: Params, key) => ({ ...acc, [key]: null }),
      {
        q: null,
        qf: null,
        cid: null,
        unit: null,
        item: null,
        act: null,
        activity: null,
      },
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

    this.domainKVs = this.toKeyValue(domainCounts);

    this.institutionKVs = Array.from(institutionCounts.entries())
      .map(([key, count]) => ({
        label: institutionDisplay.get(key) || key,
        value: count,
      }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));

    this.authorKVs = this.toKeyValue(authorCounts);

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
    this.currentCid = null;
    if (table) {
      table.filter(null, 'cid', 'equals');
      table.filterGlobal('', 'contains');
    }
    this.highlightedUnit = null;
    this.highlightedItem = null;
    this.selected = null;
    this.expandedUnitIds.clear();
    this.syncQueryParams({
      q: null,
      cid: null,
      unit: null,
      item: null,
      act: null,
      activity: null,
    });
  }

  toggleActiveQuickFilter(table: Table, field: string, label: string) {
    const facet = this.findFacetByLabel(field, label) || {
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

          // When a target unit is specified, expand only that unit and collapse others.
          // Otherwise, expand all units by default.
          if (this.highlightedUnit) {
            this.expandedUnitIds.clear();
            const targetUnit = (this.selected.units || []).find((u: any) =>
              this.isUnitHighlighted(u),
            );
            if (targetUnit) {
              this.expandedUnitIds.add(targetUnit.id || targetUnit.name);
            }
          } else {
            this.expandedUnitIds = new Set(
              (this.selected.units || []).map((u: any) => u.id || u.name),
            );
          }

          if (this.highlightedUnit || this.highlightedItem) {
            setTimeout(() => {
              const el = document.querySelector(
                '.hub-highlighted-item, .hub-highlighted-unit',
              );
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 150);
          }
        },
        error: (error: any) => console.log(error),
      });
  }

  toggleUnit(unit: any) {
    const key = unit.id || unit.name;
    if (this.expandedUnitIds.has(key)) {
      this.expandedUnitIds.delete(key);
    } else {
      this.expandedUnitIds.add(key);
    }
  }

  isUnitExpanded(unit: any): boolean {
    const key = unit.id || unit.name;
    return this.expandedUnitIds.has(key);
  }

  get areAllUnitsExpanded(): boolean {
    const total = this.selected?.units?.length || 0;
    return total > 0 && this.expandedUnitIds.size >= total;
  }

  toggleAllUnits(): void {
    if (this.areAllUnitsExpanded) {
      this.collapseAllUnits();
    } else {
      this.expandAllUnits();
    }
  }

  expandAllUnits() {
    this.expandedUnitIds = new Set(
      (this.selected?.units || []).map((u: any) => u.id || u.name),
    );
  }

  collapseAllUnits() {
    this.expandedUnitIds.clear();
  }

  countUnitActivities(unit: any): number {
    if (!unit?.activities) return 0;
    let count = 0;
    for (const key of Object.keys(unit.activities)) {
      if (Array.isArray(unit.activities[key])) {
        count += unit.activities[key].length;
      }
    }
    return count;
  }

  isUnitHighlighted(unit: any): boolean {
    if (!this.highlightedUnit || !unit?.name) return false;
    const target = this.highlightedUnit.trim().toLowerCase();
    const unitName = unit.name.trim().toLowerCase();
    if (unitName === target) return true;
    const normTarget = target.replace(/\s*-\s*/g, '-').replace(/\s+/g, ' ');
    const normUnit = unitName.replace(/\s*-\s*/g, '-').replace(/\s+/g, ' ');
    return normUnit === normTarget;
  }

  isActivityHighlighted(a: any): boolean {
    if (!this.highlightedItem || !a) return false;
    const target = this.highlightedItem.trim().toLowerCase();

    // 1. Exact ID match (numeric or string)
    if (a.id != null && String(a.id).trim().toLowerCase() === target) {
      return true;
    }

    // 2. Exact Title / Name match
    const actName = (a.name || '').trim().toLowerCase();
    if (actName && actName === target) {
      return true;
    }

    // 3. Exact URL parameter match (e.g. ch=target or sub=target or rdfID=target)
    if (a.url) {
      let matchedParam = false;
      try {
        const urlObj = new URL(a.url, 'https://adapt2.sis.pitt.edu');
        urlObj.searchParams.forEach((val) => {
          if (val.trim().toLowerCase() === target) {
            matchedParam = true;
          }
        });
      } catch {
        const paramRegex = new RegExp(`[?&=]${target}(?:&|$)`, 'i');
        matchedParam = paramRegex.test(a.url);
      }
      if (matchedParam) return true;
    }

    return false;
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

  private applyFiltersFromParams(params: Params) {
    const rawCid =
      params['cid'] ||
      (params['q'] && String(params['q']).startsWith('cid=')
        ? String(params['q']).replace('cid=', '')
        : null);
    const targetCid = rawCid ? parseInt(String(rawCid).trim(), 10) : null;
    this.currentCid = targetCid;

    this.highlightedUnit = params['unit'] ? String(params['unit']).trim() : null;
    this.highlightedItem =
      params['item'] || params['act'] || params['activity']
        ? String(params['item'] || params['act'] || params['activity']).trim()
        : null;

    let matchedCourse: any = null;
    if (targetCid && this.courses?.length) {
      matchedCourse = this.courses.find(
        (c: any) =>
          Number(c.cid) === targetCid ||
          String(c.cid) === String(targetCid) ||
          c.id === String(targetCid),
      );
      if (matchedCourse && matchedCourse.cid == null) {
        matchedCourse.cid = targetCid;
      }
    }

    if (params['q']) {
      this.globalQuery = String(params['q']).trim();
      if (this.table) {
        this.table.filterGlobal(this.globalQuery, 'contains');
      }
    } else {
      this.globalQuery = '';
      if (this.table) {
        this.table.filterGlobal('', 'contains');
      }
    }

    if (targetCid) {
      if (this.table) {
        this.table.filter(targetCid, 'cid', 'equals');
      }
    } else {
      if (this.table) {
        this.table.filter(null, 'cid', 'equals');
      }
    }

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
        if (this.table) {
          this.applyQuickFilter(this.table, field, values, facets);
        } else {
          this.selectedKVs[field] = facets;
        }
      } else {
        if (this.table) {
          this.table.filter(null, field, 'inCaseInsensitive');
        }
        delete this.selectedKVs[field];
      }
    });
    this.recountSelected();
    this.refreshAvailableFacetLabels();

    if (matchedCourse) {
      this.selected = null;
      this.toggleLoad(matchedCourse);
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
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl: false,
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
    if (this.currentCid && Number(course.cid) !== this.currentCid) return false;
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
      'cid',
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

  getSelectedLabels(field: string) {
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
