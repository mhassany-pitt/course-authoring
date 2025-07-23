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
  selected_concepts: ConceptDto[] = [];

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
    this.loadCourses(content.id);
    this.loadConcepts(content.id);
  }

  unselectContent() {
    this.preview = false;
    this.selected = null as any;
    this.selected_courses = [];
    this.selected_concepts = [];
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

  loadConcepts(contentId: number) {
    this.service.getConcepts(contentId).subscribe({
      next: (data) => {
        this.selected_concepts = data;
      },
      error: (error) => {
        console.error('Error fetching concepts:', error);
      }
    });
  }

  getConcepts(direction: string): string {
    return this.selected_concepts.filter(c => c.direction == direction).map(c => c.name).join(', ');
  }

  async export() {
    this.export_status = 'Exporting...';

    const selection: any[] = [];
    for (let i = 0; i < this.selection.length; i++) {
      this.export_status = `Exporting ${i + 1} of ${this.selection.length}...`;
      const item = JSON.parse(JSON.stringify(this.selection[i]));
      item.concepts = await firstValueFrom(this.service.getConcepts(item.id));
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
