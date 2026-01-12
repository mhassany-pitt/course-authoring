import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { DomSanitizer, Title } from '@angular/platform-browser';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { AppService } from '../app.service';
import { getNavLinks } from '../utils';
import { ConfirmationService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';

type FilterKV = { label: string; value: number };

@Component({
  selector: 'app-hub',
  templateUrl: './hub.component.html',
  styleUrls: ['./hub.component.less'],
})
export class HubComponent implements OnInit {
  navLinks = getNavLinks(this.app);

  delayedTimeout: any;
  courses: any[] = [];

  selected: any = null;

  selectedKVs: { [key: string]: any } = {};
  domainKVs: FilterKV[] = [];
  institutionKVs: FilterKV[] = [];
  authorKVs: FilterKV[] = [];

  get isLoggedIn() {
    return !!this.app.user;
  }

  constructor(
    private http: HttpClient,
    public router: Router,
    private title: Title,
    public app: AppService,
    private confirm: ConfirmationService
  ) { }

  ngOnInit(): void {
    this.title.setTitle('Courses Hub');
    this.reload();
  }

  filter(table: any, $event: any) {
    table.filterGlobal($event.target.value, 'contains');
  }

  reload() {
    this.http.get(`${environment.apiUrl}/hub`).subscribe({
      next: (resp: any) => {
        this.courses = resp;
        this.selectedKVs = { count: 0 };
        this.reloadFilterKVs(this.courses);
      },
      error: (error: any) => console.log(error),
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
    this.selectedKVs = { count: 0 };
    this.reloadFilterKVs(this.courses);
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
}
