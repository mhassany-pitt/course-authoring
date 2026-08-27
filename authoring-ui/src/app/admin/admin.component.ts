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
  downloadingBackup: boolean = false;

  apiTokens: any[] = [];
  tokensLoading: boolean = false;
  tokenDialog: boolean = false;
  tokenResultDialog: boolean = false;
  tokenModel: any = { name: '', expiryOption: '30', customDate: '', user_email: '' };
  createdTokenResult: { token: string; record: any } | null = null;
  tokenCopied: boolean = false;
  curlCopied: boolean = false;
  pythonCopied: boolean = false;
  backupCurlCopied: boolean = false;
  expiryOptions = [
    { label: '7 Days', value: '7' },
    { label: '30 Days (Recommended)', value: '30' },
    { label: '60 Days', value: '60' },
    { label: '90 Days', value: '90' },
    { label: '1 Year', value: '365' },
    { label: 'Custom Date', value: 'custom' },
  ];

  constructor(
    public router: Router,
    public route: ActivatedRoute,
    public app: AppService,
    private service: AdminService,
  ) { }

  downloadBackup() {
    this.downloadingBackup = true;
    this.service.downloadDatabaseBackup().subscribe({
      next: (blob: any) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateStr = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `course_authoring_db_backup_${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.downloadingBackup = false;
      },
      error: (err: any) => {
        console.error('Failed to download database backup', err);
        alert('Failed to download database backup. Check console for details.');
        this.downloadingBackup = false;
      },
    });
  }

  filter(table: any, $event: any) {
    table.filterGlobal($event.target.value, 'contains');
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab === 'courses') {
        this.activeTabIndex = 1;
      } else if (tab === 'tokens' || tab === 'api-tokens') {
        this.activeTabIndex = 2;
        this.reloadTokens();
      } else if (tab === 'backup' || tab === 'database') {
        this.activeTabIndex = 3;
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
    const tab = index === 3 ? 'backup' : index === 2 ? 'tokens' : index === 1 ? 'courses' : 'users';
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    if (index === 2 && this.apiTokens.length === 0) {
      this.reloadTokens();
    }
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

  reloadTokens() {
    this.tokensLoading = true;
    this.service.listApiTokens().subscribe({
      next: (tokens: any[]) => {
        this.apiTokens = tokens;
        this.tokensLoading = false;
      },
      error: (err: any) => {
        console.error('Failed to load API tokens', err);
        this.tokensLoading = false;
      },
    });
  }

  openCreateTokenDialog() {
    this.tokenModel = {
      name: '',
      expiryOption: '30',
      customDate: '',
      user_email: this.app.user?.email || '',
    };
    this.tokenDialog = true;
  }

  generateToken() {
    if (!this.tokenModel.name || !this.tokenModel.name.trim()) {
      alert('Please provide a name for this API token.');
      return;
    }
    const payload: any = {
      name: this.tokenModel.name.trim(),
      user_email: this.tokenModel.user_email?.trim() || undefined,
      roles: ['app-admin', 'author'],
    };
    if (this.tokenModel.expiryOption === 'custom') {
      if (!this.tokenModel.customDate) {
        alert('Please specify a custom expiration date.');
        return;
      }
      payload.expires_at = new Date(this.tokenModel.customDate).toISOString();
    } else {
      payload.expires_in_days = parseInt(this.tokenModel.expiryOption, 10) || 30;
    }

    this.service.createApiToken(payload).subscribe({
      next: (res: { token: string; record: any }) => {
        this.tokenDialog = false;
        this.createdTokenResult = res;
        this.tokenCopied = false;
        this.curlCopied = false;
        this.pythonCopied = false;
        this.tokenResultDialog = true;
        this.reloadTokens();
      },
      error: (err: any) => {
        console.error('Failed to generate token', err);
        alert(err?.error?.message || 'Failed to generate API token');
      },
    });
  }

  closeTokenResultDialog() {
    this.tokenResultDialog = false;
    this.createdTokenResult = null;
  }

  revokeToken(token: any) {
    if (!confirm(`Are you sure you want to revoke the token "${token.name}"? Any scripts using this token will stop working immediately.`)) {
      return;
    }
    this.service.revokeApiToken(token.id).subscribe({
      next: () => {
        this.reloadTokens();
      },
      error: (err: any) => {
        console.error('Failed to revoke token', err);
        alert('Failed to revoke API token.');
      },
    });
  }

  toggleTokenStatus(token: any, active: boolean) {
    this.service.toggleApiToken(token.id, active).subscribe({
      next: (updated: any) => {
        token.active = updated.active;
      },
      error: (err: any) => {
        console.error('Failed to update token status', err);
        alert('Failed to update token status.');
      },
    });
  }

  copyToClipboard(text: string, type: 'token' | 'curl' | 'python' | 'backup-curl') {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'token') {
        this.tokenCopied = true;
        setTimeout(() => this.tokenCopied = false, 2500);
      } else if (type === 'curl') {
        this.curlCopied = true;
        setTimeout(() => this.curlCopied = false, 2500);
      } else if (type === 'python') {
        this.pythonCopied = true;
        setTimeout(() => this.pythonCopied = false, 2500);
      } else if (type === 'backup-curl') {
        this.backupCurlCopied = true;
        setTimeout(() => this.backupCurlCopied = false, 2500);
      }
    });
  }

  getCurlSnippet(token: string): string {
    const origin = window.location.origin;
    const apiUrl = origin.includes(':4200') ? 'http://localhost:3000' : origin;
    return `curl -H "Authorization: Bearer ${token}" \\\n  ${apiUrl}/api/courses/admin/all`;
  }

  getPythonSnippet(token: string): string {
    const origin = window.location.origin;
    const apiUrl = origin.includes(':4200') ? 'http://localhost:3000' : origin;
    return `import requests

API_URL = "${apiUrl}/api/courses/admin/all"
TOKEN = "${token}"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

response = requests.get(API_URL, headers=headers)
print("Status:", response.status_code)
courses = response.json()
print(f"Retrieved {len(courses)} courses successfully!")`;
  }

  getBackupCurlSnippet(): string {
    const origin = window.location.origin;
    const apiUrl = origin.includes(':4200') ? 'http://localhost:3000' : origin;
    return `curl -H "Authorization: Bearer <YOUR_API_TOKEN>" \\\n  ${apiUrl}/api/user-admin/backup \\\n  -o "course_authoring_db_backup_$(date +%Y-%m-%d).json"`;
  }
}