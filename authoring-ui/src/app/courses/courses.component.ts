import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CoursesService } from './courses.service';
import { AppService } from '../app.service';

@Component({
  selector: 'app-courses',
  templateUrl: './courses.component.html',
  styleUrls: ['./courses.component.less']
})
export class CoursesComponent implements OnInit {

  _archived: boolean = localStorage.getItem('show-courses-archived') == 'true';
  get archived() { return this._archived; }
  set archived(bool) {
    this._archived = bool;
    localStorage.setItem('show-courses-archived', `${bool}`.toLowerCase());
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
    this.api.courses({ archived: this.archived }).subscribe({
      next: (courses: any) => this.courses = courses,
      error: (error: any) => console.log(error)
    })
  }

  create() {
    this.api.create().subscribe({
      next: (course: any) => this.router.navigate(['/editor', course.id]),
      error: (error: any) => console.log(error)
    });
  }

  toggleArchive(course: any) {
    course.archived = !course.archived;
    this.api.update(course).subscribe({
      next: (course: any) => this.reload(),
      error: (error: any) => console.log(error)
    });
  }
}
