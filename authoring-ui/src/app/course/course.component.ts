import { Component, OnInit } from '@angular/core';
import { getNavLinks } from '../utils';
import { AppService } from '../app.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CoursesService } from '../courses/courses.service';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import SortableTree, { SortableTreeNodeComponent, SortableTreeNodeData } from 'sortable-tree';
import { of } from 'rxjs';

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

  get filteredProvidersList() {
    const $ = this.editingProviders.map((p: any) => p.id);
    return this.providersList.filter((p: any) => !this.enabledOnlyProviders || $.includes(p.id));
  }
  get filteredActivitiesList() {
    const $ = this.editingActivities.map((a: any) => a.id);
    return this.activitiesList.filter((a: any) => !this.selectedOnlyActivities || $.includes(a.id));
  }

  enabledOnlyProviders: boolean = false;
  selectedOnlyActivities: boolean = false;

  activeIndex: number = 0;

  arrangingItems = '';
  newItemsArrangement: any;

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

  startRearrangement(order: string) {
    this.arrangingItems = order;
    this.newItemsArrangement = [];
    setTimeout(() => {
      if (this.arrangingItems == 'resources') this.prepResourcesRearrangement();
      else if (this.arrangingItems == 'units') this.prepUnitsRearrangement();
    }, 0);
  }

  applyUnitsArrangement() {
    let i = 0;
    const map: any = {};
    const mapIndices = (nodes: any[], level: number) => {
      if (!nodes) return;
      for (const node of nodes) {
        map[node.id] = [i++, level];
        mapIndices(node.children, level + 1);
      }
    }
    mapIndices(this.newItemsArrangement, 0);
    this.course.units.sort((u1: any, u2: any) => map[u1.id][0] - map[u2.id][0]);
    this.course.units.forEach((u: any) => u.level = map[u.id][1]);
  }

  applyResourcesArrangement() {
    const map: any = {};
    this.newItemsArrangement.forEach((o: any, i: number) => map[o.id] = i);
    this.course.resources.sort((r1: any, r2: any) => map[r1.id] - map[r2.id]);
  }

  prepUnitsRearrangement() {
    const nodes: any = [], stack: any = {};
    this.course.units.forEach(({ id, name, level }: any) => {
      const item = { data: { id: id, title: name || '[not defined]' }, nodes: [] };
      if (level == 0) nodes.push(item);
      else stack[level - 1].nodes.push(item);
      stack[level] = item;
    });

    new SortableTree({
      nodes: [{ data: { title: 'Units', root: true }, nodes }],
      element: document.querySelector('.units-tree') as HTMLElement,
      stateId: 'units-tree',
      initCollapseLevel: 5,
      onChange: ({ nodes, movedNode, srcParentNode, targetParentNode }) => {
        this.newItemsArrangement = this.mapToTreeNodes(nodes)[0].children;
        return Promise.resolve();
      }
    });
  }

  prepResourcesRearrangement() {
    const nodes = this.course.resources.map((u: any) =>
      ({ data: { id: u.id, title: u.name || '[not defined]' }, nodes: [] }));
    new SortableTree({
      nodes: [{ data: { title: 'Resources', root: true }, nodes }],
      initCollapseLevel: 5,
      element: document.querySelector('.resources-tree') as HTMLElement,
      stateId: 'resources-tree',
      confirm: (node: any, target: any) => {
        return Promise.resolve(target.data.root);
      },
      onChange: ({ nodes, movedNode, srcParentNode, targetParentNode }) => {
        this.newItemsArrangement = this.mapToTreeNodes(nodes)[0].children;
        return Promise.resolve();
      }
    });
  }

  mapToTreeNodes(nodes: any[]): any[] {
    return nodes ? nodes.map(node => ({
      ...node.element._data,
      children: this.mapToTreeNodes(node.subnodes),
    })) : [];
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

  any(v: any): any {
    return v;
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
}
