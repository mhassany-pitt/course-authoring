import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CoursesService } from './courses.service';
import { AppService } from '../app.service';
import { getNavLinks } from '../utils';

@Component({
  selector: 'app-courses',
  templateUrl: './courses.component.html',
  styleUrls: ['./courses.component.less']
})
export class CoursesComponent implements OnInit {

  navLinks = getNavLinks(this.app);

  _trash_can: boolean = localStorage.getItem('show-trash-can') == 'true';
  get trash_can() { return this._trash_can; }
  set trash_can(bool) {
    this._trash_can = bool;
    localStorage.setItem('show-trash-can', `${bool}`.toLowerCase());
  }

  courses: any = [];

  constructor(
    public router: Router,
    public app: AppService,
    public api: CoursesService,
  ) { }

  ngOnInit(): void {
    this.reload();
  }

  filter(table: any, $event: any) {
    table.filterGlobal($event.target.value, 'contains');
  }

  reload() {
    this.api.courses({ trash_can: this.trash_can }).subscribe({
      next: (courses: any) => {
        for (const course of courses)
          if (course.collaborator_emails?.length && course.collaborator_emails.includes(course.user_email)) {
            course.collaborator_emails = course.collaborator_emails.filter((email: string) => email != course.user_email);
          }
        this.courses = courses;
      },
      error: (error: any) => console.log(error)
    })
  }

  create() {
    this.api.create().subscribe({
      next: (course: any) => this.router.navigate(['/courses', course.id]),
      error: (error: any) => console.log(error)
    });
  }

  countUnits(units: any[]) {
    return (units.filter(u => u.level == 0) || []).length;
  }
}
