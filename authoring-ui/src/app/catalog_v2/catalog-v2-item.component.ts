import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { blankItem, CatalogV2Item } from './catalog-v2.types';
import { CatalogV2Service } from './catalog-v2.service';
import { AppService } from '../app.service';
import { getNavLinks } from '../utils';
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

  _t: any = {
    identity: true,
    languages: true,
    attribution: false,
    rights: false,
    content: true,
    classification: false,
    'knowledge-components': false,
    pedagogy: false,
    delivery: false,
    uses: false,
  }; // toggles

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

  private ensureDefaults(item: CatalogV2Item): CatalogV2Item {
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

  submitReport() {
    this.reportState.submitting = true;
    this.reportState.success = '';
    this.reportState.error = '';
    this.catalog.report(this.item.id, this.report).subscribe({
      next: () => {
        this.reportState.success =
          'Thank you for reporting this item. You can close this dialog.';
        this.report.reason = '';
        this.report.details = '';
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
}
