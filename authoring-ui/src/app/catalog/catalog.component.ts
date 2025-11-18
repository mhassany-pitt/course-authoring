import { Component, OnInit, ViewChild } from '@angular/core';
import { CatalogService } from './catalog.service';
import { ContentDto } from './content.dto';
import { getNavLinks } from '../utils';
import { AppService } from '../app.service';
import { Router } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { CourseDto } from './course.dto';
import { ConceptDto } from './concept.dto';
import { firstValueFrom } from 'rxjs';
import { Table } from 'primeng/table';

@Component({
  selector: 'app-catalog',
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.less',
})
export class CatalogComponent implements OnInit {

  navLinks = getNavLinks(this.app);

  @ViewChild('tb') tb: Table | undefined;

  opt_types: string[] = [];
  opt_domain_names: string[] = [];
  opt_author_names: string[] = [];
  opt_provider_names: string[] = [];

  contents: ContentDto[] = [];

  preview: boolean = false;
  selected: ContentDto = null as any;
  selected_courses: CourseDto[] = [];
  selected_aggconcept_sources: Set<string> = new Set<string>();
  selected_aggconcepts: ConceptDto[] = [];
  selected_um2concepts: any[] = [];

  selection: ContentDto[] = [];
  export_status: string = '';

  _t: any = {};

  any(obj: any) { return obj; }

  constructor(
    public router: Router,
    private app: AppService,
    public sanitizer: DomSanitizer,
    private service: CatalogService,
  ) { }

  ngOnInit() {
    this.loadContents();
  }

  getAttrOptions(all: any[], filtered: any[], attr: string): any[] {
    const its: any = {};
    all.forEach((it: any) => its[it[attr]] = 0);
    filtered?.forEach(it => its[it[attr]] += 1);
    return Array.from(Object.keys(its))
      .map(k => ({ value: k, label: `${k} (${its[k]})`, count: its[k] }))
      .sort((a, b) => b.count == a.count ? a.value.localeCompare(b.value) : b.count - a.count);
  }

  reloadFilterOptions($event?: any) {
    const tb_filtered = this.tb?.filteredValue || this.contents;
    this.opt_author_names = this.getAttrOptions(this.contents, tb_filtered, 'author_name');
    this.opt_domain_names = this.getAttrOptions(this.contents, tb_filtered, 'domain_name');
    this.opt_types = this.getAttrOptions(this.contents, tb_filtered, 'type');
    this.opt_provider_names = this.getAttrOptions(this.contents, tb_filtered, 'provider_name');
  }

  loadContents() {
    this._t['loading-catalog'] = true;
    this.service.getContents().subscribe({
      next: (data: ContentDto[]) => {
        this.contents = data;
        this.contents.forEach(content => {
          content.problem_statement = content.problem_statement?.replace(/\\n/g, '\n');
        });
        this.reloadFilterOptions();
      },
      error: (error) => {
        console.error('Error fetching contents:', error);
      },
      complete: () => delete this._t['loading-catalog']
    })
  }

  selectContent(content: ContentDto) {
    this.preview = true;
    this.selected = content;
    this.selected.preview_url = content.preview_url || content.url;
    this.selected.preview_iframe_url = this.sanitizer.bypassSecurityTrustResourceUrl(this.selected.preview_url);
    this.loadCourses(content.id);
    this.loadAggregateConcepts(content.id);
    this.loadUM2Concepts(content.short_name);
  }

  unselectContent() {
    this.preview = false;
    this.selected = null as any;
    this.selected_courses = [];
    this.selected_aggconcept_sources = new Set<string>();
    this.selected_aggconcepts = [];
    this.selected_um2concepts = [];
  }

  loadCourses(contentId: number) {
    this.service.getCourses(contentId).subscribe({
      next: (data) => {
        this.selected_courses = data;
      },
      error: (error) => {
        console.error('Error fetching courses:', error);
      }
    });
  }

  loadAggregateConcepts(contentId: number) {
    this.service.getAggregateConcepts(contentId).subscribe({
      next: (data) => {
        this.selected_aggconcept_sources = new Set<string>();
        data.forEach(c => this.selected_aggconcept_sources.add(c.source));
        this.selected_aggconcepts = data;
      },
      error: (error) => {
        console.error('Error fetching concepts:', error);
      }
    });
  }

  loadUM2Concepts(activityName: string) {
    this.service.getUM2Concepts(activityName).subscribe({
      next: (data) => {
        this.selected_um2concepts = data;
      },
      error: (error) => {
        console.error('Error fetching concepts:', error);
      }
    });
  }

  getAggregateConcepts(source: string): string {
    return this.selected_aggconcepts.filter(c => c.source == source).map(c => c.name).join(', ');
  }

  async export() {
    this.export_status = 'Exporting...';

    const selection: any[] = [];
    for (let i = 0; i < this.selection.length; i++) {
      this.export_status = `Exporting ${i + 1} of ${this.selection.length}...`;
      const item = JSON.parse(JSON.stringify(this.selection[i]));
      item.aggregate_concepts = await firstValueFrom(this.service.getAggregateConcepts(item.id));
      item.um2_concepts = await firstValueFrom(this.service.getUM2Concepts(item.short_name));
      item.courses = await firstValueFrom(this.service.getCourses(item.id));
      selection.push(item);
    }

    const blob = new Blob([JSON.stringify(selection, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `paws-catalog_slcs-export_${Date.now()}.json`;
    link.click();
    link.remove();

    this.export_status = 'Export completed!';
    setTimeout(() => {
      this.export_status = '';
      this.selection = [];
    }, 3000);
  }

  report(content: ContentDto) {
    const feedback = prompt(`Report content:\n - "${content.name}"\n\nPlease provide details about the issue (optional):`);
    if (feedback === null) return; // user cancelled
    this.service.report({ feedback, content }).subscribe({
      next: () => alert(`Thank you for reporting content:\n - "${content.name}"`),
      error: (err: any) => console.error('Error reporting content:', err)
    });
  }
}
