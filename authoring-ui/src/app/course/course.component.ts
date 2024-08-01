import { Component, OnInit } from '@angular/core';
import { getNavLinks } from '../utils';
import { AppService } from '../app.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CoursesService } from '../courses/courses.service';

@Component({
  selector: 'app-course',
  templateUrl: './course.component.html',
  styleUrl: './course.component.less'
})
export class CourseComponent implements OnInit {

  navLinks = getNavLinks(this.app);

  course: any;
  resource: any;
  providers: any;
  unit: any;
  activities: any;

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

  get filteredProvidersList() {
    const tmp = this.providers.map((p: any) => p.id);
    return this.providersList.filter((p: any) => !this.enabledOnlyProviders || tmp.includes(p.id));
  }
  get filteredActivitiesList() {
    const tmp = this.activities.map((a: any) => a.id);
    return this.activitiesList.filter((a: any) => !this.selectedOnlyActivities || tmp.includes(a.id));
  }

  enabledOnlyProviders: boolean = false;
  selectedOnlyActivities: boolean = false;

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
    this.unit = $unit;
    if (!$unit.activities)
      $unit.activities = {};
    if (!$unit.activities[$resource.id])
      $unit.activities[$resource.id] = [];
    this.activities = $unit.activities[$resource.id];
    this.resource = $resource;
    this.loadActivitiesList();
  }

  loadActivitiesList() {
    this.activitiesList = [];
    this.resource.providers.map((p: any) => {
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

  any(v: any): any {
    return v;
  }
}
