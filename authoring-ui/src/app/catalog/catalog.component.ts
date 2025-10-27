import { Component, OnInit } from '@angular/core';
import { CatalogService } from './catalog.service';
import { ContentDto } from './content.dto';
import { getNavLinks } from '../utils';
import { AppService } from '../app.service';
import { Router } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { CourseDto } from './course.dto';
import { ConceptDto } from './concept.dto';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-catalog',
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.less',
})
export class CatalogComponent implements OnInit {

  navLinks = getNavLinks(this.app);

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

  loadContents() {
    this.service.getContents().subscribe({
      next: (data: ContentDto[]) => {
        this.contents = data;

        // ---- collect unique values for filters ----
        const opt_types = new Set<string>();
        const opt_domain_names = new Set<string>();
        const opt_author_names = new Set<string>();
        const opt_provider_names = new Set<string>();

        this.contents.forEach(content => {
          if (content.type) opt_types.add(content.type);
          if (content.domain_name) opt_domain_names.add(content.domain_name);
          if (content.author_name) opt_author_names.add(content.author_name);
          if (content.provider_name) opt_provider_names.add(content.provider_name);
          content.problem_statement = content.problem_statement?.replace(/\\n/g, '\n');
        });

        this.opt_types = [...opt_types].sort();
        this.opt_domain_names = [...opt_domain_names].sort();
        this.opt_author_names = [...opt_author_names].sort();
        this.opt_provider_names = [...opt_provider_names].sort();
      },
      error: (error) => {
        console.error('Error fetching contents:', error);
      }
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
}

// TODO: speed up the export -- move it to backend so that it can be used as api
// TODO: also provide the slc code when exporting
// TODO: show kcs from multiple providers
