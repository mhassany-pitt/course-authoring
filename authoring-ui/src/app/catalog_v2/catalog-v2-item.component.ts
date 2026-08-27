import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { blankItem, CatalogV2Item } from './catalog-v2.types';
import { CatalogV2Service } from './catalog-v2.service';
import { AppService } from '../app.service';
import { getNavLinks } from '../utils';
import { isCoursePorted } from '../legacy-courses';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-catalog-v2-item',
  templateUrl: './catalog-v2-item.component.html',
  styleUrls: ['./catalog-v2-item.component.less'],
})
export class CatalogV2ItemComponent implements OnInit, OnDestroy {
  navLinks = getNavLinks(this.app);
  history = history;

  item: CatalogV2Item = blankItem();
  loading = true;

  report = {
    reason: '',
    details: '',
  };

  reportState = {
    show: false,
    submitting: false,
    success: '',
    error: '',
  };

  copiedCode = false;
  copiedId = false;
  codeExpanded = false;

  _t: any = {
    identity: true,
    languages: true,
    attribution: true,
    rights: true,
    content: true,
    classification: true,
    'knowledge-components': true,
    pedagogy: true,
    delivery: true,
    uses: true,
  }; // toggles

  itemId = '';
  private routeSub: Subscription | undefined;

  constructor(
    private catalog: CatalogV2Service,
    private app: AppService,
    public router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.itemId = id;
        this.loadItem(id);
      } else {
        this.loading = false;
        this.router.navigate(['/catalog-v2']);
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  get canEdit() {
    return this.isAdmin || this.isOwner;
  }

  private get isAdmin() {
    return this.app.user?.roles?.includes('app-admin');
  }

  private get isOwner() {
    return (
      !!this.app.user?.email &&
      !!this.item?.user_email &&
      this.app.user.email === this.item.user_email
    );
  }

  private ensureDefaults(item?: CatalogV2Item | null): CatalogV2Item {
    if (!item) return blankItem();
    return {
      ...blankItem(),
      ...item,
      identity: { ...blankItem().identity, ...(item.identity || {}) },
      links: { ...blankItem().links, ...(item.links || {}) },
      languages: { ...blankItem().languages, ...(item.languages || {}) },
      content: { ...blankItem().content, ...(item.content || {}) },
      classification: {
        ...blankItem().classification,
        ...(item.classification || {}),
      },
      pedagogy: { ...blankItem().pedagogy, ...(item.pedagogy || {}) },
      interaction: { ...blankItem().interaction, ...(item.interaction || {}) },
      delivery: item.delivery || [],
      rights: { ...blankItem().rights, ...(item.rights || {}) },
      uses: item.uses || [],
    };
  }

  private loadItem(id: string) {
    this.loading = true;
    this.catalog.read(id).subscribe({
      next: (item) => (this.item = this.ensureDefaults(item)),
      error: () => this.router.navigate(['/catalog-v2']),
      complete: () => (this.loading = false),
    });
  }

  openReportDialog() {
    this.reportState.success = '';
    this.reportState.error = '';
    this.reportState.show = true;
  }

  submitReport() {
    this.reportState.submitting = true;
    this.reportState.success = '';
    this.reportState.error = '';
    this.catalog.report(this.item.id, this.report).subscribe({
      next: () => {
        this.reportState.success =
          'Thank you for reporting this item. You can close this dialog.';
        this.reportState.submitting = false;
      },
      error: (err) => {
        console.error('failed to report catalog item', err);
        this.reportState.error =
          'Unable to submit the report. Please try again.';
        this.reportState.submitting = false;
      },
    });
  }

  extractCid(use: any): string | null {
    if (!use) return null;
    const fromId = use.context_id
      ? String(use.context_id).match(/cid=(\d+)/)
      : null;
    if (fromId) return fromId[1];
    const fromUrl = use.context_url
      ? String(use.context_url).match(/cid=(\d+)/)
      : null;
    if (fromUrl) return fromUrl[1];
    if (
      typeof use.context_id === 'number' ||
      /^\d+$/.test(String(use.context_id || ''))
    ) {
      return String(use.context_id);
    }
    return null;
  }

  isPorted(use: any): boolean {
    const cid = this.extractCid(use);
    return cid ? isCoursePorted(cid) : false;
  }

  copyCode(): void {
    if (!this.item.content.source_code) return;
    navigator.clipboard.writeText(this.item.content.source_code).then(() => {
      this.copiedCode = true;
      setTimeout(() => (this.copiedCode = false), 2000);
    });
  }

  copyId(text: string): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.copiedId = true;
      setTimeout(() => (this.copiedId = false), 2000);
    });
  }

  hasPedagogy(): boolean {
    const p = this.item.pedagogy;
    if (!p) return false;
    return !!(
      p.instructional_role ||
      (p.learning_objectives && p.learning_objectives.length > 0) ||
      (p.prerequisites?.topics && p.prerequisites.topics.length > 0) ||
      (p.prerequisites?.concepts && p.prerequisites.concepts.length > 0) ||
      (p.prerequisites?.item_ids && p.prerequisites.item_ids.length > 0)
    );
  }

  hasKnowledgeComponents(): boolean {
    const kcs = this.item.classification?.knowledge_components;
    return !!kcs && Object.keys(kcs).length > 0;
  }

  getNormalizedLanguage(): string {
    const raw = (
      this.item?.languages?.programming_languages?.[0] || ''
    )
      .toLowerCase()
      .trim();
    if (raw.includes('py')) return 'python';
    if (raw.includes('java') && !raw.includes('script')) return 'java';
    if (raw.includes('js') || raw.includes('javascript')) return 'javascript';
    if (raw.includes('ts') || raw.includes('typescript')) return 'typescript';
    if (raw.includes('c++') || raw.includes('cpp')) return 'cpp';
    if (raw.includes('c#') || raw.includes('csharp')) return 'csharp';
    if (raw.includes('c') && raw.length === 1) return 'c';
    if (raw.includes('sql')) return 'sql';
    if (raw.includes('asm') || raw.includes('assembly')) return 'x86asm';
    if (raw.includes('html')) return 'html';
    if (raw.includes('css')) return 'css';
    return raw || 'plaintext';
  }

  parseContextName(name: string): { title: string; unit?: string } {
    if (!name) return { title: 'Unknown Context' };
    const parts = name.split(' > ');
    if (parts.length > 1) {
      return {
        title: parts[0].trim(),
        unit: parts.slice(1).join(' > ').trim(),
      };
    }
    return { title: name.trim() };
  }

  getFormattedPrompt(): string {
    if (!this.item?.content?.prompt) return '';
    let text = String(this.item.content.prompt);
    text = text
      .replace(/\\r\\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '  ');
    return text.trim();
  }
}
