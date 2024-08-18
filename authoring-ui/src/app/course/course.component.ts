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

  domains: any = [];

  providersList: any[] = [];
  providersMap: any = {};

  activitiesList: any[] = [];
  activitiesMap: any = {};

  activeTabIndex: number = 0;

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
    this.loadDomains();
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
    this.courses.read(params.id).subscribe((course: any) => {
      this.course = course;
      this.loadProviders();
    });
  }

  loadDomains() {
    this.courses.domains().subscribe((domains: any) => {
      this.domains = domains;
      this.loadProviders();
    });
  }

  loadProviders() {
    if (!this.course || this.domains.length < 1)
      return;
    this.courses.providers(this.course.domain).subscribe((providers: any) => {
      this.providersList = providers;
      this.providersMap = {};
      providers.forEach((p: any) => this.providersMap[p.id] = p);
    });
  }

  save() {
    // -->> remove non-existing unit resources and activities
    const resourceIds = this.course.resources.map((resource: any) => `${resource.id}`);
    this.course.units.forEach((unit: any) => Object.keys(unit.activities || {})
      .filter((resourceId: any) => !resourceIds.includes(resourceId))
      .forEach((resourceId: any) => delete unit.activities[resourceId]));
    // <<--

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

  editUnitActivities(unit: any, resource: any) {
    this.editingUnit = unit;
    if (!unit.activities)
      unit.activities = {};
    if (!unit.activities[resource.id])
      unit.activities[resource.id] = [];
    this.editingActivities = unit.activities[resource.id];
    this.editingResource = resource;
    this.loadActivitiesList();
  }

  loadActivitiesList() {
    this.activitiesList = [];
    this.editingResource.providers.forEach((provider: any) => {
      this.courses.activities(this.course.domain, provider.id)
        .subscribe((activities: any) => {
          activities.forEach((a: any) => {
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

  rearrange(event: any, list: any) {
    moveItemInArray(list, event.previousIndex, event.currentIndex);
  }

  forceUiRefresh(id: string) {
    this.tt[id] = true;
    setTimeout(() => delete this.tt[id], 0);
  }

  numOfLvl0Units() {
    return (this.course.units.filter((u: any) => u.level == 0) || []).length;
  }

  get allExpanded() {
    return this.course.units.every((u: any) => u._ui_expand);
  }

  expandTextarea(toggle: boolean) {
    this.course.units.forEach((u: any) => {
      u._ui_expand = !toggle;
      this.forceUiRefresh(`unitdesc-ref-tt:${u.id}`);
    });
  }

  getPreviewLink(activity: any) {
    return `${activity.url}&usr=${this.app.user.email}&grp=preview&sid=preview`;
  }
}
