import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { DomSanitizer, Title } from '@angular/platform-browser';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { AppService } from '../app.service';
import { getNavLinks } from '../utils';
import { ConfirmationService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';

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

  get isLoggedIn() {
    return !!this.app.user;
  }

  constructor(
    private http: HttpClient,
    public router: Router,
    private title: Title,
    public app: AppService,
    private confirm: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.title.setTitle('Courses Hub');
    this.reload();
  }

  filter(table: any, $event: any) {
    table.filterGlobal($event.target.value, 'contains');
  }

  reload() {
    this.http.get(`${environment.apiUrl}/hub`).subscribe({
      next: (resp: any) => (this.courses = resp),
      error: (error: any) => console.log(error),
    });
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
}
