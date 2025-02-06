import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { DomSanitizer, Title } from '@angular/platform-browser';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { AppService } from '../app.service';
import { getNavLinks } from '../utils';
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-hub',
  templateUrl: './hub.component.html',
  styleUrls: ['./hub.component.less']
})
export class HubComponent implements OnInit {

  navLinks = getNavLinks(this.app);

  delayedTimeout: any;
  courses: any[] = [];

  selected: any = null;

  get isLoggedIn() { return !!this.app.user; }

  constructor(
    private http: HttpClient,
    public router: Router,
    private title: Title,
    public app: AppService,
    private confirm: ConfirmationService,
  ) { }

  ngOnInit(): void {
    this.title.setTitle('Courses Hub');
    this.search('');
  }

  search(value: string) {
    if (this.delayedTimeout)
      clearTimeout(this.delayedTimeout);

    this.delayedTimeout = setTimeout(() => {
      this.http.get(`${environment.apiUrl}/hub?key=${value}`).subscribe(
        (resp: any) => this.courses = resp,
        (error: any) => console.log(error),
      );
    }, 300);
  }

  toggleLoad(course: any) {
    if (this.selected && this.selected.id === course.id)
      this.selected = null;
    else this.http.get(`${environment.apiUrl}/hub/${course.id}`).subscribe({
      next: (resp: any) => {
        const resrouces = resp.resources;
        resp.resources = {};
        for (const r of resrouces)
          resp.resources[r.id] = r;
        this.selected = resp;
      },
      error: (error: any) => console.log(error),
    });
  }

  clone(course: any) {
    this.confirm.confirm({
      header: "Cloning Course",
      message: `Are you sure you want to clone the course "${course.name}"?`,
      acceptButtonStyleClass: 'p-button-outlined',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.http.post(`${environment.apiUrl}/courses/${course.id}/clone`, {}, { withCredentials: true }).subscribe({
          next: (resp: any) => this.router.navigate(['/courses', resp.id]),
          error: (error: any) => console.log(error),
        });
      }
    });
  }

  keys(obj: any) {
    return obj ? Object.keys(obj) : [];
  }
}
