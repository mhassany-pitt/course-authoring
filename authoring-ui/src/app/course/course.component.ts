import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { any, getNavLinks, getPreviewLink } from '../utils';
import { AppService } from '../app.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CoursesService } from '../courses/courses.service';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CatalogV2Service } from '../catalog_v2/catalog-v2.service';
import { CatalogV2Item } from '../catalog_v2/catalog-v2.types';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-course',
  templateUrl: './course.component.html',
  styleUrl: './course.component.less'
})
export class CourseComponent implements OnInit {
  private catalogBrowserRowObserver?: ResizeObserver;
  private catalogBrowserAnchorObserver?: ResizeObserver;
  private catalogBrowserPositionRafId: number | null = null;

  getPreviewLink = getPreviewLink;
  navLinks = getNavLinks(this.app);
  max = Math.max;
  any = any;

  course: any;
  UNIT_MAX_LEVEL = 3;

  editingProviders: any;
  editingResource: any;
  editingUnit: any;
  editingActivities: any;

  domains: any = [];
  catalogItems: CatalogV2Item[] = [];
  years = [
    { id: 2021, name: '2021' },
    { id: 2022, name: '2022' },
    { id: 2023, name: '2023' },
    { id: 2024, name: '2024' },
    { id: 2025, name: '2025' },
    { id: 2026, name: '2026' },
    { id: 2027, name: '2027' },
    { id: 2028, name: '2028' },
    { id: 2029, name: '2029' },
    { id: 2030, name: '2030' },
  ];
  terms = [
    { id: 'spring', name: 'Spring' },
    { id: 'summer', name: 'Summer' },
    { id: 'fall', name: 'Fall' },
  ];

  providersList: any[] = [];
  providersMap: any = {};

  activitiesList: any[] = [];
  activitiesMap: any = {};

  activeTabIndex: number = 0;
  activeCatalogBrowser: { unitId: any, resourceId: any } | null = null;
  catalogBrowserPopupStyle: Record<string, string> = {};
  catalogBrowserPopupAnchorStyle: Record<string, string> = {};

  arrangingItems = '';

  collaborators = false;
  get isMyCourse() {
    return this.course.user_email == this.app.user.email;
  }

  tt: any = {};

  constructor(
    public router: Router,
    public app: AppService,
    private route: ActivatedRoute,
    private courses: CoursesService,
    private catalogV2: CatalogV2Service,
    private messages: MessageService,
    private confirm: ConfirmationService,
  ) { }

  ngOnInit() {
    this.activeTabIndex = this.getTabIndexFromQueryParam();
    this.loadInitialData();
  }

  ngOnDestroy() {
    this.disconnectCatalogBrowserObservers();
    if (this.catalogBrowserPositionRafId !== null) {
      cancelAnimationFrame(this.catalogBrowserPositionRafId);
      this.catalogBrowserPositionRafId = null;
    }
  }

  getTabIndexFromQueryParam() {
    const tab = Number(this.route.snapshot.queryParamMap.get('tab'));
    return Number.isInteger(tab) && tab >= 0 ? tab : 0;
  }

  onTabChange(index: number) {
    this.activeTabIndex = index;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: index },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.forceUiRefresh('textarea-ref-tt');
  }

  toggleCatalogBrowser(unit: any, resource: any) {
    const isActive = this.isCatalogBrowserOpen(unit, resource);
    if (!isActive) {
      unit.activities ||= {};
      unit.activities[resource.id] ||= [];
    }
    this.activeCatalogBrowser = isActive ? null : {
      unitId: unit.id,
      resourceId: resource.id,
    };

    if (this.activeCatalogBrowser) {
      setTimeout(() => {
        this.attachCatalogBrowserObservers();
        this.refreshCatalogBrowserPosition();
      });
    } else {
      this.disconnectCatalogBrowserObservers();
      this.catalogBrowserPopupStyle = {};
      this.catalogBrowserPopupAnchorStyle = {};
    }
  }

  closeCatalogBrowser() {
    this.activeCatalogBrowser = null;
    this.disconnectCatalogBrowserObservers();
    this.catalogBrowserPopupStyle = {};
    this.catalogBrowserPopupAnchorStyle = {};
  }

  isCatalogBrowserOpen(unit: any, resource: any) {
    return this.activeCatalogBrowser?.unitId == unit.id
      && this.activeCatalogBrowser?.resourceId == resource.id;
  }

  isCatalogBrowserOpenForUnit(unit: any) {
    return this.activeCatalogBrowser?.unitId == unit.id;
  }

  get extraTableRows() {
    return this.activeCatalogBrowser ? 1 : 0;
  }

  get activeCatalogBrowserResourceName() {
    if (!this.activeCatalogBrowser || !this.course?.resources?.length)
      return '';

    return this.course.resources
      .find((resource: any) => resource.id == this.activeCatalogBrowser?.resourceId)?.name || '';
  }

  get activeCatalogBrowserProviderIds() {
    if (!this.activeCatalogBrowser || !this.course?.resources?.length)
      return [];

    const resource = this.course.resources
      .find((item: any) => item.id == this.activeCatalogBrowser?.resourceId);
    return (resource?.providers || []).map((provider: any) => provider.id);
  }

  get activeCatalogBrowserActivities() {
    if (!this.activeCatalogBrowser || !this.course?.units?.length)
      return [];

    const unit = this.course.units
      .find((item: any) => item.id == this.activeCatalogBrowser?.unitId);
    return unit?.activities?.[this.activeCatalogBrowser.resourceId] || [];
  }

  get activeCatalogBrowserAnchorId() {
    if (!this.activeCatalogBrowser)
      return '';

    return `catalog-browser-anchor-${this.activeCatalogBrowser.unitId}-${this.activeCatalogBrowser.resourceId}`;
  }

  updateCatalogBrowserActivities(activities: any[]) {
    if (!this.activeCatalogBrowser)
      return;

    const unit = this.course.units
      .find((item: any) => item.id == this.activeCatalogBrowser?.unitId);
    if (!unit)
      return;

    unit.activities ||= {};
    unit.activities[this.activeCatalogBrowser.resourceId] = activities;
    this.scheduleCatalogBrowserPositionRefresh();
  }

  attachCatalogBrowserObservers() {
    this.disconnectCatalogBrowserObservers();

    if (typeof ResizeObserver === 'undefined' || !this.activeCatalogBrowser)
      return;

    const anchorEl = document.getElementById(this.activeCatalogBrowserAnchorId);
    const rowEl = document.getElementById('catalog-browser-row');
    if (!anchorEl || !rowEl)
      return;

    this.catalogBrowserAnchorObserver = new ResizeObserver(() => {
      this.scheduleCatalogBrowserPositionRefresh();
    });
    this.catalogBrowserAnchorObserver.observe(anchorEl);

    this.catalogBrowserRowObserver = new ResizeObserver(() => {
      this.scheduleCatalogBrowserPositionRefresh();
    });
    this.catalogBrowserRowObserver.observe(rowEl);
  }

  disconnectCatalogBrowserObservers() {
    this.catalogBrowserRowObserver?.disconnect();
    this.catalogBrowserAnchorObserver?.disconnect();
    this.catalogBrowserRowObserver = undefined;
    this.catalogBrowserAnchorObserver = undefined;
  }

  scheduleCatalogBrowserPositionRefresh() {
    if (this.catalogBrowserPositionRafId !== null)
      cancelAnimationFrame(this.catalogBrowserPositionRafId);

    this.catalogBrowserPositionRafId = requestAnimationFrame(() => {
      this.catalogBrowserPositionRafId = null;
      this.refreshCatalogBrowserPosition();
    });
  }

  refreshCatalogBrowserPosition() {
    if (!this.activeCatalogBrowser)
      return;

    const anchorEl = document.getElementById(this.activeCatalogBrowserAnchorId);
    const rowEl = document.getElementById('catalog-browser-row');
    if (!anchorEl || !rowEl) {
      this.catalogBrowserPopupStyle = {};
      this.catalogBrowserPopupAnchorStyle = {};
      return;
    }

    const anchorRect = anchorEl.getBoundingClientRect();
    const rowRect = rowEl.getBoundingClientRect();
    const viewportPadding = 16;
    const width = Math.max(window.innerWidth - (viewportPadding * 2), 320);
    const left = viewportPadding;
    const top = rowRect.top;
    const anchorLeft = Math.min(
      Math.max((anchorRect.left + (anchorRect.width / 2)) - left, 24),
      width - 24,
    );

    this.catalogBrowserPopupStyle = {
      position: 'fixed',
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      zIndex: '30',
      marginTop: '1rem',
    };

    this.catalogBrowserPopupAnchorStyle = {
      left: `${anchorLeft}px`,
    };
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  onCatalogBrowserViewportChange() {
    this.scheduleCatalogBrowserPositionRefresh();
  }

  applyResourcesArrangement(map: any) {
    this.course.resources.sort((r1: any, r2: any) => map[r1.id] - map[r2.id]);
  }

  applyUnitsArrangement(map: any) {
    this.course.units.sort((u1: any, u2: any) => map[u1.id][0] - map[u2.id][0]);
    this.course.units.forEach((u: any) => u.level = map[u.id][1]);
  }

  async loadInitialData() {
    const params: any = this.route.snapshot.params;
    const [course, items]: any = await Promise.all([
      firstValueFrom(this.courses.read(params.id)),
      firstValueFrom(this.catalogV2.list()),
    ]);
    course.domain = this.domainLegacyToCatalog(course.domain);
    this.course = course;
    this.catalogItems = items || [];
    this.loadDomains();
    this.loadProviders(this.course.domain);
  }

  domainLegacyToCatalog(domain: string) {
    return {
      "java": "Java",
      "sql": "SQL",
      "c": "C",
      "cpp": "C++",
      "telcom": "Telcom",
      "py": "Python",
      "asm": "Assembly"
    }[domain] || domain;
  }

  domainCatalogToLegacy(domain: string) {
    return {
      "Java":"java",
      "SQL":"sql",
      "C":"c",
      "C++":"cpp",
      "Telcom":"telcom",
      "Python":"py",
      "Assembly":"asm",
    }[domain] || domain;
  }

  loadDomains() {
    const languages = new Set<string>();
    this.catalogItems.forEach((item: CatalogV2Item) => {
      (item.languages?.programming_languages || [])
        .forEach((language: string) => languages.add(language));
    });

    this.domains = Array.from(languages)
      .sort((a, b) => a.localeCompare(b))
      .map((language) => ({ id: language, name: language }));
  }

  loadProviders(domain: string) {
    if (!this.course || this.domains.length < 1)
      return;

    const providers = new Map<string, any>();
    this.catalogItems.filter((item) => (
      item.languages?.programming_languages || []).includes(domain)
    ).forEach((item) => {
      const provider = item.attribution?.provider?.trim();
      if (!provider || providers.has(provider))
        return;
      providers.set(provider, { id: provider, name: provider, domain });
    });

    this.providersList = [...providers.values()].sort((a: any, b: any) => a.name.localeCompare(b.name));
    this.providersMap = {};
    this.providersList.forEach((provider: any) => this.providersMap[provider.id] = provider);
  }

  save() {
    // -->> remove non-existing unit resources and activities
    const resourceIds = this.course.resources.map((resource: any) => `${resource.id}`);
    this.course.units.forEach((unit: any) => Object.keys(unit.activities || {})
      .filter((resourceId: any) => !resourceIds.includes(resourceId))
      .forEach((resourceId: any) => delete unit.activities[resourceId]));
    // <<--

    const course = JSON.parse(JSON.stringify(this.course));
    course.domain = this.domainCatalogToLegacy(course.domain);
    this.courses.update(course).subscribe(() => this.router.navigate(['/courses']));
  }

  deleteCourse() {
    this.confirm.confirm({
      header: 'Delete Course',
      message: 'Are you sure you want to delete this course?',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.courses.delete(this.course.id, !!this.course.deleted_at).subscribe(() => {
          this.router.navigate(['/courses']);
        });
      }
    });
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
            a.tags ||= [];
            this.activitiesList.push(a);
            this.activitiesMap[a.id] = a;
          });
        });
    });
  }

  removeResource(resource: any) {
    this.confirm.confirm({
      header: 'Remove Resource',
      message: 'Are you sure you want to remove this resource?',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.course.resources = this.course.resources.filter((r: any) => r.id != resource.id);
      }
    });
  }

  removeUnit(unit: any) {
    this.confirm.confirm({
      header: 'Remove Unit',
      message: 'Are you sure you want to remove this unit?',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        const removeIds = [unit, ...this.findChildUnits(unit)].map((u: any) => u.id);
        this.course.units = this.course.units.filter((u: any) => !removeIds.includes(u.id));
      }
    });
  }

  toggleUnitPublished(unit: any) {
    unit.published = !unit.published;
    this.findChildUnits(unit).forEach((u: any) => u.published = unit.published);
  }

  findChildUnits(unit: any) {
    const children = [];
    const units = this.course.units;
    for (let i = units.indexOf(unit) + 1; i < units.length && units[i].level > unit.level; i++)
      children.push(units[i]);
    return children;
  }

  nextResourceId() {
    return Date.now();
  }

  rearrange(event: any, list: any) {
    moveItemInArray(list, event.previousIndex, event.currentIndex);
  }

  removeActivity(unit: any, resource: any, aindex: number) {
    this.confirm.confirm({
      header: 'Remove Activity',
      message: 'Are you sure you want to remove this activity?',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => unit.activities[resource.id].splice(aindex, 1),
    });
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

  clone() {
    this.confirm.confirm({
      header: "Cloning Course",
      message: `Are you sure you want to clone the course "${this.course.name}"?`,
      acceptButtonStyleClass: 'p-button-outlined',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.courses.clone(this.course.id).subscribe({
        next: (course: any) => {
          this.router.navigate(['/courses', course.id]).then(() => location.reload());
        },
        error: (error: any) => {
          this.messages.add({
            severity: 'error',
            summary: 'Error Cloning Course!',
            detail: 'An error occurred while cloning the course. Please try again.',
          });
          console.error('error cloning course', this.course.id, error);
        }
      })
    });
  }

  syncToMasteryGrid() {
    this.confirm.confirm({
      header: 'Sync to Mastery Grid',
      message: 'Are you sure you want to sync this course to mastery grid?',
      icon: 'pi pi-question-circle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.courses.syncToMasteryGrid(this.course.id).subscribe({
          next: (response: any) => {
            if (response.students) {
              const a = document.createElement('a');
              const blob = new Blob([response.students], { type: 'text/csv' });
              a.href = window.URL.createObjectURL(blob);
              a.download = `${this.course.code}_${this.course.name}_students.csv`;
              a.click();
            }

            this.courses.read(
              (this.route.snapshot.params as any).id
            ).subscribe((course: any) => this.course = course);
            this.messages.add({
              severity: 'success',
              summary: 'Course Synchronized!',
              detail: 'Course synchronized to mastery grid successfully.',
            });
          },
          error: (error: any) => {
            this.messages.add({
              severity: 'error',
              summary: 'Error Synchronizing Course!',
              detail: 'An error occurred while syncing the course to mastery grid. ' +
                'Please check course details and try again. If the problem persists, contact support (moh70@pitt.edu).',
              sticky: true,
            });
            console.error('error syncing course', this.course.id, error);
          }
        });
      }
    });
  }

  useCourseStructure() {
    this.confirm.confirm({
      header: 'Use Course Structure',
      message: 'Are you sure you want to use this course structure?',
      icon: 'pi pi-question-circle',
      acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.courses.getModuLearnConfigs().subscribe({
          next: (resp: any) => location.href = resp.CREATE_COURSE_URL.replace('{COURSE_ID}', this.course.id),
          error: (err: any) => console.error(err)
        });
      }
    });
  }

  openInMasteryGrid() {
    window.open(`http://adapt2.sis.pitt.edu/um-vis-dev2/index.html?usr=demo&grp=ADL&sid=TEST&cid=${this.course.linkings.course_id}`, '_blank');
  }

  loadCSV($event: any, group: any) {
    const file = $event.target.files[0];
    const reader = new FileReader();
    reader.onload = () => group.students = reader.result as string;
    reader.onerror = (error) => this.messages.add({
      severity: 'error', summary: 'Error Loading File!',
      detail: 'An error occurred while loading the file. Please try again.',
    });
    reader.readAsText(file);
  }

  downloadCSV(group: any) {
    const a = document.createElement('a');
    const blob = new Blob([group.students], { type: 'text/csv' });
    a.href = window.URL.createObjectURL(blob);
    a.download = `${this.course.code}_${this.course.name}_${group.term}_${group.year}_${group.mnemonic}_${group.name}_students.csv`;
    a.click();
  }
}
