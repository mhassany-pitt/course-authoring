import { Component, OnInit } from '@angular/core';
import { getNavLinks } from '../utils';
import { AppService } from '../app.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CoursesService } from '../courses/courses.service';
import { moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-course',
  templateUrl: './course.component.html',
  styleUrl: './course.component.less'
})
export class CourseComponent implements OnInit {

  navLinks = getNavLinks(this.app);

  course: any;
  UNIT_MAX_LEVEL = 3;

  editingProviders: any;
  editingResource: any;
  editingUnit: any;
  editingActivities: any;

  domains: any = [
    { value: "java", label: "Java" },
    { value: "sql", label: "SQL" },
    { value: "c", label: "C" },
    { value: "cpp", label: "C++" },
    { value: "telcom", label: "Telcom" },
    { value: "py", label: "Python" },
  ];

  providersList: any[] = [];
  providersMap: any = {};

  activitiesList: any[] = [];
  activitiesMap: any = {};

  activeIndex: number = 0;

  arrangingItems = '';

  tt: any = {};

  constructor(
    public router: Router,
    public app: AppService,
    private route: ActivatedRoute,
    private courses: CoursesService,
  ) { }

  ngOnInit() {
    this.load();
    this.loadProviders();
  }

  applyResourcesArrangement(map: any) {
    this.course.resources.sort((r1: any, r2: any) => map[r1.id] - map[r2.id]);
  }

  applyUnitsArrangement(map: any) {
    this.course.units.sort((u1: any, u2: any) => map[u1.id][0] - map[u2.id][0]);
    this.course.units.forEach((u: any) => u.level = map[u.id][1]);
  }

  load() {
    const params: any = this.route.snapshot.params;
    this.courses.read(params.id).subscribe((course: any) => this.course = course);
  }

  loadProviders() {
    this.courses.providers().subscribe((providers: any) => {
      this.providersList = providers;
      this.providersMap = {};
      providers.forEach((p: any) => this.providersMap[p.id] = p);
    });
  }

  save() {
    this.courses.update(this.course).subscribe(() => {
      this.router.navigate(['/courses']);
    });
  }

  deleteCourse() {
    if (confirm('Are you sure about deleting this course?')) {
      this.courses.delete(this.course.id, !!this.course.deleted_at).subscribe(() => {
        this.router.navigate(['/courses']);
      });
    }
  }

  editUnitActivities($unit: any, $resource: any) {
    this.editingUnit = $unit;
    if (!$unit.activities)
      $unit.activities = {};
    if (!$unit.activities[$resource.id])
      $unit.activities[$resource.id] = [];
    this.editingActivities = $unit.activities[$resource.id];
    this.editingResource = $resource;
    this.loadActivitiesList();
  }

  loadActivitiesList() {
    this.activitiesList = [];
    this.editingResource.providers.map((p: any) => {
      const indexUrl = this.providersMap[p.id].index_url;
      this.courses.activities(indexUrl).subscribe((as: any) => {
        as.filter((a: any) => a.domain == this.course.domain).forEach((a: any) => {
          this.activitiesList.push(a);
          this.activitiesMap[a.id] = a;
        });
      });
    });
  }

  removeResource(resource: any) {
    if (confirm('Are you sure about removing this resource?')) {
      this.course.resources = this.course.resources.filter((r: any) => r.id != resource.id);
    }
  }

  removeUnit(unit: any) {
    if (confirm('Are you sure about removing this unit?')) {
      this.course.units = this.course.units.filter((u: any) => u.id != unit.id);
    }
  }

  nextResourceId() {
    return Date.now();
  }

  filter(l: any[], b: boolean) {
    return l.filter((i: any) => i.selected == b);
  }

  rearrange(event: any, list: any) {
    moveItemInArray(list, event.previousIndex, event.currentIndex);
  }

  rand() {
    return Math.random() + 0.01
  }

  refreshUnitDescEl(id: string) {
    this.tt[id] = true;
    setTimeout(() => delete this.tt[id], 0);
  }

  countUnits() {
    return (this.course.units.filter((u: any) => u.level == 0) || []).length;
  }

  get allExpanded() {
    return this.course.units.every((u: any) => u._ui_expand);
  }

  collapse(toggle: boolean) {
    this.course.units.forEach((u: any) => {
      u._ui_expand = !toggle;
      this.refreshUnitDescEl(`unitdesc-ref-tt:${u.id}`);
    });
  }

  getPreviewLink(activity: any) {
    return `${activity.url}&usr=${this.app.user.email}&grp=preview&sid=preview`;
  }
}

// ask kamil how to link to mastry grid
