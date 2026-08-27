import { Component } from '@angular/core';
import { AdminService } from './admin.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AppService } from '../app.service';
import { getNavLinks } from '../utils';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.less']
})
export class AdminComponent {

  navLinks = getNavLinks(this.app);

  private __areyousure = 'Are you sure that you want to proceed?';
  actions = [
    { label: 'Update Roles', icon: 'fa fa-shield', command: () => this.dialog = 'update-role' },
    {
      label: 'Generate Password Update Tokens', icon: 'pi pi-envelope',
      command: () => { if (confirm(this.__areyousure)) this.genUpdatePassTokens() }
    },
    { separator: true },
    {
      label: 'Activate', icon: 'pi pi-check',
      command: () => { if (confirm(this.__areyousure)) this.toggle(true); }
    },
    {
      label: 'Deactive', icon: 'pi pi-ban',
      command: () => { if (confirm(this.__areyousure)) this.toggle(false); }
    },
    {
      label: 'Delete', icon: 'pi pi-trash',
      command: () => { if (confirm(this.__areyousure)) this.removeUsers(); }
    },
  ];

  dialog: 'create' | 'update-role' | boolean = false;
  model: any = {};

  users = [];
  selected: any[] = [];

  adminCourses: any[] = [];
  coursesLoading: boolean = false;
  coursesTrashCan: boolean = false;
  editingCourse: any = null;
  editingCourseJsonText: string = '';
  originalCourseJsonText: string = '';
  expandedRowKeys: Record<string, boolean> = {};
  loadingCourseJsonId: string | null = null;
  importCourseDialog: boolean = false;
  jsonValidationStatus: { valid: boolean; message: string } = { valid: true, message: '' };
  savingJson: boolean = false;
  activeTabIndex: number = 0;

  constructor(
    public router: Router,
    public route: ActivatedRoute,
    public app: AppService,
    private service: AdminService,
  ) { }

  filter(table: any, $event: any) {
    table.filterGlobal($event.target.value, 'contains');
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab === 'courses') {
        this.activeTabIndex = 1;
      } else if (tab === 'users') {
        this.activeTabIndex = 0;
      }
    });
    this.reload();
    this.reloadCourses();
  }

  onTabChange(e: any) {
    const index = e.index !== undefined ? e.index : e;
    this.activeTabIndex = index;
    const tab = index === 1 ? 'courses' : 'users';
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  reload() {
    this.selected = [];
    this.service.list().subscribe({
      next: (users: any) => this.users = users
    });
  }

  reloadCourses() {
    this.coursesLoading = true;
    this.service.listAdminCourses(this.coursesTrashCan).subscribe({
      next: (courses: any) => {
        this.adminCourses = courses;
        this.coursesLoading = false;
      },
      error: (err: any) => {
        console.error(err);
        this.coursesLoading = false;
      }
    });
  }

  countUnits(units: any[]): number {
    return (units || []).length;
  }

  countResources(resources: any[]): number {
    return (resources || []).length;
  }

  countActivities(units: any[]): number {
    if (!units || !Array.isArray(units)) return 0;
    let count = 0;
    for (const unit of units) {
      if (unit?.activities && typeof unit.activities === 'object') {
        for (const list of Object.values(unit.activities)) {
          if (Array.isArray(list)) count += list.length;
        }
      }
    }
    return count;
  }

  toggleCourseJson(course: any) {
    if (this.expandedRowKeys[course.id]) {
      this.expandedRowKeys = {};
      this.editingCourse = null;
      return;
    }

    this.expandedRowKeys = { [course.id]: true };
    this.loadingCourseJsonId = course.id;
    this.service.getAdminCourse(course.id).subscribe({
      next: (fullCourse: any) => {
        this.editingCourse = fullCourse;
        this.originalCourseJsonText = JSON.stringify(fullCourse, null, 2);
        this.editingCourseJsonText = this.originalCourseJsonText;
        this.validateEditingJson();
        this.loadingCourseJsonId = null;
      },
      error: (err: any) => {
        console.error(err);
        this.loadingCourseJsonId = null;
        alert('Failed to load course details!');
      }
    });
  }

  closeCourseJson() {
    this.expandedRowKeys = {};
    this.editingCourse = null;
  }

  onJsonTextChange() {
    this.validateEditingJson();
  }

  validateEditingJson(): boolean {
    try {
      JSON.parse(this.editingCourseJsonText);
      this.jsonValidationStatus = { valid: true, message: 'Valid JSON' };
      return true;
    } catch (e: any) {
      this.jsonValidationStatus = { valid: false, message: e.message || 'Invalid JSON syntax' };
      return false;
    }
  }

  formatEditingJson() {
    try {
      const obj = JSON.parse(this.editingCourseJsonText);
      this.editingCourseJsonText = JSON.stringify(obj, null, 2);
      this.validateEditingJson();
    } catch (e: any) {
      alert('Cannot format: JSON is invalid! ' + e.message);
    }
  }

  resetEditingJson() {
    this.editingCourseJsonText = this.originalCourseJsonText;
    this.validateEditingJson();
  }

  getJsonStats(): { lines: number; chars: number } {
    const text = this.editingCourseJsonText || '';
    return {
      lines: text ? text.split('\n').length : 0,
      chars: text.length
    };
  }

  copyJsonToClipboard() {
    navigator.clipboard.writeText(this.editingCourseJsonText).then(
      () => alert('Copied JSON to clipboard!'),
      (err) => console.error(err)
    );
  }

  saveCourseJson() {
    if (!this.validateEditingJson()) {
      alert('Cannot save: JSON has syntax errors!');
      return;
    }
    const courseData = JSON.parse(this.editingCourseJsonText);
    this.savingJson = true;
    this.service.updateAdminCourse(this.editingCourse.id, courseData).subscribe({
      next: (updated: any) => {
        this.savingJson = false;
        this.expandedRowKeys = {};
        this.editingCourse = null;
        this.reloadCourses();
      },
      error: (err: any) => {
        this.savingJson = false;
        console.error(err);
        alert('Failed to update course JSON: ' + (err.error?.message || err.message));
      }
    });
  }

  deleteCourse(course: any, undo: boolean = false) {
    const action = undo ? 'unarchive' : 'archive';
    if (!confirm(`Are you sure you want to ${action} "${course.name || 'Untitled Course'}"?`)) return;
    this.service.deleteAdminCourse(course.id, undo).subscribe({
      next: () => this.reloadCourses(),
      error: (err: any) => console.error(err)
    });
  }

  createUsers() {
    this.service.create(this.model).subscribe({
      next: (resp: any) => {
        this.dialog = false;
        this.model = {};
        this.reload();
      },
      error: (error: any) => { console.log(error) },
    })
  }

  getSelecteds() { return this.selected.filter(obj => !obj.itIsMe); }

  updateRoles() {
    const data = this.getSelecteds().map(obj => ({ ...obj, roles: this.model.roles }));
    this.service.update({ action: 'update', data }).subscribe({
      next: (resp: any) => {
        this.dialog = false;
        this.model = {};
        this.reload();
      },
      error: (error: any) => { console.log(error) },
    });
  }

  toggle(active: boolean) {
    const data = this.getSelecteds().map(obj => ({ ...obj, active }));
    this.service.update({ action: 'update', data }).subscribe({
      next: (resp: any) => {
        this.dialog = false;
        this.model = {};
        this.reload();
      },
      error: (error: any) => { console.log(error) },
    });
  }

  removeUsers() {
    const data = this.getSelecteds().map(obj => obj.email);
    this.service.update({ action: 'delete', data }).subscribe({
      next: (resp: any) => this.reload(),
      error: (error: any) => { console.log(error) },
    });
  }

  genUpdatePassTokens() {
    const data = this.getSelecteds().map(obj => obj.email);
    this.service.genUpdatePassTokens(data).subscribe({
      next: (resp: any) => {
        const baseHref = document.querySelector('base')?.href;
        resp.forEach((each: any) => each.link = `${baseHref}#/update-password?token=${each.token}&expires=${each.expires}`);
        const blob = new Blob([JSON.stringify(resp)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'update-password-tokens.json';
        anchor.style.display = 'none';

        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);

        URL.revokeObjectURL(url);
      },
      error: (error: any) => { console.log(error) },
    });
  }

  updateFullname(user: any) {
    const fullname = prompt('Enter new fullname:', user.fullname);
    if (fullname || fullname != user.fullname)
      this.service.update({ action: 'update-fullname', data: [{ ...user, fullname }] }).subscribe({
        next: (resp: any) => this.reload(),
        error: (error: any) => { console.log(error) },
      });
  }

  sampleCourseJson = JSON.stringify([
    {
      "name": "Introduction to Programming",
      "code": "CS 0401",
      "institution": "University of Pittsburgh",
      "domain": "java",
      "user_email": "instructor@pitt.edu",
      "description": "Introductory programming course",
      "published": true,
      "collaborator_emails": [],
      "tags": ["intro", "java"],
      "resources": [
        {
          "id": 1790000000001,
          "name": "Examples",
          "providers": [
            {
              "id": "webex",
              "name": "WebEx",
              "domain": "java"
            }
          ]
        }
      ],
      "units": [
        {
          "id": 1790000000002,
          "name": "Unit 1: Getting Started",
          "description": "Basic syntax and variables",
          "level": 0,
          "published": true,
          "activities": {
            "1790000000001": [
              {
                "id": 779,
                "name": "Hello World Example",
                "url": "https://adapt2.sis.pitt.edu/web_ex_NV0FGdaHzy/Dissection2?act=helloworld.java&svc=progvis",
                "domain": "java",
                "provider_id": "webex",
                "author_id": "admin",
                "tags": []
              }
            ]
          }
        }
      ]
    }
  ], null, 2);

  fillSampleJson(courseEl: any) {
    courseEl.value = this.sampleCourseJson;
  }

  createCustomCourse(courseEl: any) {
    const course_json = courseEl.value;
    let course = null;
    try {
      course = JSON.parse(course_json);
    } catch (e) {
      alert('Invalid Course JSON Format! -- Course JSON or JSON Array Expected!');
      return;
    }

    this.service.createCustomCourse(course).subscribe({
      next: (resp: any) => {
        courseEl.value = '';
        this.importCourseDialog = false;
        alert('Course(s) Created Successfully!');
        this.reloadCourses();
      },
      error: (err: any) => {
        console.log(err);
      },
    });
  }
}