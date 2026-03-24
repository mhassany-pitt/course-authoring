import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { any, getNavLinks, getPreviewLink } from '../utils';
import { AppService } from '../app.service';
import { ActivatedRoute, NavigationStart, Router } from '@angular/router';
import { CoursesService } from '../courses/courses.service';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CatalogV2Service } from '../catalog_v2/catalog-v2.service';
import { CatalogV2Item } from '../catalog_v2/catalog-v2.types';
import { firstValueFrom, Subscription } from 'rxjs';

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
  _v: any = {
    'dont-collect-data': false,
  };
  trackingMessageDismissed = false;
  sessionId = '';
  pageOpenedAt = 0;
  focusedFieldValues: Record<string, any> = {};
  leavePageLogged = false;
  private routerEventsSubscription?: Subscription;
  private readonly trackingMessageStorageKey = 'course-authoring.tracking-message.dismissed';
  private readonly trackingConsentStorageKey = 'course-authoring.tracking-message.dont-collect-data';

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
    this.sessionId = Math.random().toString(36).substring(2);
    this.pageOpenedAt = Date.now();
    this.trackingMessageDismissed = localStorage.getItem(this.trackingMessageStorageKey) == 'true';
    this._v['dont-collect-data'] = localStorage.getItem(this.trackingConsentStorageKey) == 'true';
    this.activeTabIndex = this.getTabIndexFromQueryParam();
    this.routerEventsSubscription = this.router.events.subscribe(event => {
      if (!(event instanceof NavigationStart))
        return;
      this.logLeavePage(event.url);
    });
    this.loadInitialData();
  }

  ngOnDestroy() {
    this.routerEventsSubscription?.unsubscribe();
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

  logLeavePage(targetUrl: string) {
    if (this.leavePageLogged || !this.course?.id)
      return;

    const currentCoursePath = `/courses/${this.course.id}`;
    if (targetUrl.startsWith(currentCoursePath))
      return;

    this.leavePageLogged = true;
    this.logCourseChange('leave-page', { target_url: targetUrl }, null, null);
  }

  onTabChange(index: number) {
    const prevValue = this.activeTabIndex;
    this.activeTabIndex = index;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: index },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.logCourseChange('change-tab', { field: 'tab' }, index, prevValue);
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
    const prevValue = this.cloneValue(unit.activities[this.activeCatalogBrowser.resourceId] || []);
    unit.activities[this.activeCatalogBrowser.resourceId] = activities;
    this.logCourseChange(
      'update-activities',
      {
        unit: this.getActivityLogUnit(unit),
        resource: this.getActivityLogResource(this.course.resources.find(
          (item: any) => item.id == this.activeCatalogBrowser?.resourceId
        )),
        field: 'activities',
      },
      activities,
      prevValue
    );
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
    const prevValue = this.course.resources.map((resource: any, index: number) => {
      const { providers, ...rest } = this.cloneValue(resource);
      return {
        ...rest,
        order: index,
      };
    });
    this.course.resources.sort((r1: any, r2: any) => map[r1.id] - map[r2.id]);
    const value = this.course.resources.map((resource: any, index: number) => {
      const { providers, ...rest } = this.cloneValue(resource);
      return {
        ...rest,
        order: index,
      };
    });
    this.logCourseChange('move-resource', { field: 'resources', action: 'rearrangement' }, value, prevValue);
  }

  applyUnitsArrangement(map: any) {
    const prevValue = this.course.units.map((unit: any, index: number) => {
      const { activities, ...rest } = this.cloneValue(unit);
      return {
        ...rest,
        order: index,
      };
    });
    this.course.units.sort((u1: any, u2: any) => map[u1.id][0] - map[u2.id][0]);
    this.course.units.forEach((u: any) => u.level = map[u.id][1]);
    const value = this.course.units.map((unit: any, index: number) => {
      const { activities, ...rest } = this.cloneValue(unit);
      return {
        ...rest,
        order: index,
      };
    });
    this.logCourseChange('move-unit', { field: 'units', action: 'rearrangement' }, value, prevValue);
  }

  async loadInitialData() {
    const params: any = this.route.snapshot.params;
    const [course, items]: any = await Promise.all([
      firstValueFrom(this.courses.read(params.id)),
      firstValueFrom(this.catalogV2.list()),
    ]);
    const loadedCourse = this.cloneValue(course);
    course.domain = this.domainLegacyToCatalog(course.domain);
    this.course = course;
    this.catalogItems = items || [];
    this.loadDomains();
    this.loadProviders(this.course.domain);
    this.logCourseChange('load', { field: 'course' }, loadedCourse, null);
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

  onDomainChange(domain: string) {
    const prevValue = this.course.domain;
    this.course.domain = domain;
    this.loadProviders(this.course.domain);
    if (prevValue === domain)
      return;
    this.logCourseChange('change-domain', { field: 'domain' }, domain, prevValue);
  }

  onPublishedChange(published: boolean) {
    const prevValue = this.course.published;
    this.course.published = published;
    if (prevValue === published)
      return;
    this.logCourseChange('change-published', { field: 'published' }, published, prevValue);
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
    this.courses.update(course).subscribe(() => {
      this.logCourseChange('save', { field: 'course' }, course, null);
      this.router.navigate(['/courses']);
    });
  }

  deleteCourse() {
    this.confirm.confirm({
      header: 'Delete Course',
      message: 'Are you sure you want to delete this course?',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        const undo = !!this.course.deleted_at;
        const prevValue = this.course.deleted_at;
        this.courses.delete(this.course.id, undo).subscribe((course: any) => {
          this.logCourseChange(
            undo ? 'undelete-course' : 'delete-course',
            { field: 'deleted_at' },
            course?.deleted_at ?? null,
            prevValue
          );
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
        const prevValue = this.cloneValue(this.course.resources);
        this.course.resources = this.course.resources.filter((r: any) => r.id != resource.id);
        this.logCourseChange('remove-resource', { field: 'resources', resource: this.cloneValue(resource) }, this.course.resources, prevValue);
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
        const prevValue = this.cloneValue(this.course.units);
        const removeIds = [unit, ...this.findChildUnits(unit)].map((u: any) => u.id);
        this.course.units = this.course.units.filter((u: any) => !removeIds.includes(u.id));
        this.logCourseChange('remove-unit', { field: 'units', unit: this.cloneValue(unit) }, this.course.units, prevValue);
      }
    });
  }

  toggleUnitPublished(unit: any) {
    const prevValue = this.getActivityLogUnit(unit);
    unit.published = !unit.published;
    this.findChildUnits(unit).forEach((u: any) => u.published = unit.published);
    const value = this.getActivityLogUnit(unit);
    this.logCourseChange('toggle-unit-published', { unit: value, field: 'published' }, value, prevValue);
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

  rearrange(event: any, list: any, unit: any, resource: any) {
    const prevValue = this.cloneValue(list);
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.logCourseChange(
      'move-activity',
      {
        unit: this.getActivityLogUnit(unit),
        resource: this.getActivityLogResource(resource),
        previous_index: event.previousIndex,
        current_index: event.currentIndex,
      } as any,
      list,
      prevValue
    );
  }

  removeActivity(unit: any, resource: any, aindex: number) {
    this.confirm.confirm({
      header: 'Remove Activity',
      message: 'Are you sure you want to remove this activity?',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        const prevValue = this.cloneValue(unit.activities[resource.id]);
        unit.activities[resource.id].splice(aindex, 1);
        this.logCourseChange(
          'remove-activity',
          {
            unit: this.getActivityLogUnit(unit),
            resource: this.getActivityLogResource(resource),
            field: 'activities',
            removed_index: aindex,
          },
          unit.activities[resource.id],
          prevValue
        );
      },
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
    const prevValue = this.cloneValue(this.course.units.map((u: any) => ({
      id: u.id,
      _ui_expand: !!u._ui_expand,
    })));
    this.course.units.forEach((u: any) => {
      u._ui_expand = !toggle;
      this.forceUiRefresh(`unitdesc-ref-tt:${u.id}`);
    });
    const value = this.course.units.map((u: any) => ({
      id: u.id,
      _ui_expand: !!u._ui_expand,
    }));
    this.logCourseChange('toggle-all-unit-descriptions', { field: 'unit-description', action: toggle ? 'collapse-all' : 'expand-all' }, value, prevValue);
  }

  toggleUnitDescription(unit: any) {
    const prevValue = {
      id: unit.id,
      _ui_expand: !!unit._ui_expand,
    };
    unit._ui_expand = !unit._ui_expand;
    this.forceUiRefresh(`unitdesc-ref-tt:${unit.id}`);
    this.logCourseChange(
      'toggle-unit-description',
      { field: 'unit-description', unit: this.cloneValue(unit) },
      { id: unit.id, _ui_expand: !!unit._ui_expand },
      prevValue
    );
  }

  applyResourceProviders(providers: any[]) {
    const prevValue = this.cloneValue(this.editingResource?.providers || []);
    this.editingResource.providers = providers;
    this.logCourseChange(
      'update-resource-providers',
      { field: 'providers', resource: this.cloneValue(this.editingResource) },
      this.editingResource.providers,
      prevValue
    );
    this.editingProviders = null;
  }

  clone() {
    this.confirm.confirm({
      header: "Cloning Course",
      message: `Are you sure you want to clone the course "${this.course.name}"?`,
      acceptButtonStyleClass: 'p-button-outlined',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.courses.clone(this.course.id).subscribe({
        next: (course: any) => {
          this.logCourseChange(
            'clone-course',
            { field: 'course', source_course: { id: this.course.id, name: this.course.name } },
            { id: course?.id, name: course?.name },
            null
          );
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
            ).subscribe((course: any) => {
              course.domain = this.domainLegacyToCatalog(course.domain);
              this.course = course;
            });
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

  dismissTrackingMessage() {
    localStorage.setItem(this.trackingMessageStorageKey, 'true');
    localStorage.setItem(this.trackingConsentStorageKey, `${!!this._v['dont-collect-data']}`);
    this.trackingMessageDismissed = true;
  }

  rememberFieldValue(event: FocusEvent) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | null;
    const field = target?.getAttribute('name');
    if (!target || !field)
      return;

    this.rememberTrackedField(field, target.value);
  }

  logFieldBlur(event: FocusEvent) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | null;
    const field = target?.getAttribute('name');
    if (!target || !field)
      return;

    this.logTrackedFieldBlur(field, target.value, { field });
  }

  rememberTrackedField(key: string, value: any) {
    this.focusedFieldValues[key] = value;
  }

  logTrackedFieldBlur(key: string, value: any, object: any) {
    const prevValue = this.focusedFieldValues[key] ?? null;
    delete this.focusedFieldValues[key];

    if (prevValue === value)
      return;

    this.logCourseChange('blur', object, value, prevValue);
  }

  addUnit() {
    const prevValue = this.cloneValue(this.course.units);
    const unit = { id: this.nextResourceId(), level: 0 };
    this.course.units.push(unit);
    this.logCourseChange('add-unit', { field: 'units', unit: this.cloneValue(unit) }, this.course.units, prevValue);
  }

  addResource() {
    const prevValue = this.cloneValue(this.course.resources);
    const resource = { id: this.nextResourceId() };
    this.course.resources.push(resource);
    this.logCourseChange('add-resource', { field: 'resources', resource: this.cloneValue(resource) }, this.course.resources, prevValue);
  }

  addGroup() {
    this.course.groups ||= [];
    const prevValue = this.cloneValue(this.course.groups);
    const group = { id: this.nextResourceId() };
    this.course.groups.push(group);
    this.logCourseChange('add-group', { field: 'groups', group: this.cloneValue(group) }, this.course.groups, prevValue);
  }

  canTrackChanges() {
    return this.trackingMessageDismissed && !this._v['dont-collect-data'] && !!this.course?.id && !!this.app.user?.email;
  }

  logCourseChange(action: string, object: any, value: any, prev_value: any) {
    if (!this.canTrackChanges())
      return;

    const log = {
      action,
      object,
      value: this.cloneValue(value),
      prev_value: this.cloneValue(prev_value),
      user_email: this.app.user.email,
      session_id: this.sessionId,
      since_0dt: Date.now() - this.pageOpenedAt,
    };

    this.courses.log(this.course.id, log).subscribe({
      error: (error: any) => console.error('error logging course change', error),
    });
  }

  cloneValue<T>(value: T): T {
    if (value === undefined || value === null)
      return value;
    return JSON.parse(JSON.stringify(value));
  }

  getActivityLogUnit(unit: any) {
    const { activities, ...rest } = this.cloneValue(unit);
    return rest;
  }

  getActivityLogResource(resource: any) {
    const { providers, ...rest } = this.cloneValue(resource);
    return rest;
  }

  logCatalogBrowserInteraction(interaction: any) {
    if (!interaction)
      return;

    const unit = this.course?.units?.find((item: any) => item.id == this.activeCatalogBrowser?.unitId);
    const resource = this.course?.resources?.find((item: any) => item.id == this.activeCatalogBrowser?.resourceId);

    this.logCourseChange(
      interaction.action,
      {
        ...this.cloneValue(interaction.object),
        unit: unit ? this.getActivityLogUnit(unit) : undefined,
        resource: resource ? this.getActivityLogResource(resource) : undefined,
        scope: 'catalog-browser',
      },
      interaction.value,
      interaction.prev_value
    );
  }
}
