import { HttpClient } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { DomSanitizer, Title } from '@angular/platform-browser';
import { environment } from '../../environments/environment';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { AppService } from '../app.service';
import { getNavLinks } from '../utils';
import { ConfirmationService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { Table } from 'primeng/table';

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
    private confirm: ConfirmationService
  ) { }

  ngOnInit(): void {
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
    table.filterGlobal(value, 'contains');
    this.syncQueryParams({ q: value || null });
  }

  reload() {
    this.http.get(`${environment.apiUrl}/hub`).subscribe({
      next: (resp: any) => {
        this.courses = resp;
        this.selectedKVs = { count: 0 };
        this.reloadFilterKVs(this.courses);
        this.dataReady = true;
        this.applyFiltersIfReady();
      },
      error: (error: any) => console.log(error),
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
    this.selectedKVs = { count: 0 };
    this.reloadFilterKVs(this.courses);
    const clearedParams = this.quickFilterFields.reduce(
      (acc: Params, key) => ({ ...acc, [key]: null }),
      { q: null }
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
    const authorCounts = new Map<string, number>();

    courses.forEach((course: any) => {
      const domain = (course.domain || '').trim();
      if (domain)
        domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);

      const institution = (course.institution || '').trim();
      if (institution)
        institutionCounts.set(
          institution,
          (institutionCounts.get(institution) || 0) + 1
        );

      const author = (course.author?.fullname || '').trim();
      if (author)
        authorCounts.set(author, (authorCounts.get(author) || 0) + 1);
    });

    this.domainKVs = this.toKeyValue(domainCounts);
    this.institutionKVs = this.toKeyValue(institutionCounts);
    this.authorKVs = this.toKeyValue(authorCounts);
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
            { withCredentials: true }
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
      this.http.get(`${environment.apiUrl}/hub/${course.id}`)
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

      this.selectedKVs = { count: 0 };
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
    if (field === 'author.fullname') return 'contains';
    return 'equals';
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
}
