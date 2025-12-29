import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AppService } from '../app.service';
import { getNavLinks } from '../utils';
import { SlcItemReportsService } from './slc-item-reports.service';
import { SlcItemReport } from './slc-item-reports.types';

@Component({
  selector: 'app-slc-item-reports',
  templateUrl: './slc-item-reports.component.html',
  styleUrls: ['./slc-item-reports.component.less'],
})
export class SlcItemReportsComponent implements OnInit {
  navLinks = getNavLinks(this.app);

  reports: SlcItemReport[] = [];
  loading = true;

  dialog = false;
  saving = false;
  model: SlcItemReport | null = null;

  constructor(
    public router: Router,
    public app: AppService,
    private service: SlcItemReportsService
  ) {}

  ngOnInit(): void {
    this.reload();
  }

  filter(table: any, $event: any) {
    table.filterGlobal($event.target.value, 'contains');
  }

  reload() {
    this.loading = true;
    this.service.list().subscribe({
      next: (reports) => (this.reports = reports || []),
      error: (error) => console.log(error),
      complete: () => (this.loading = false),
    });
  }

  editReport(report: SlcItemReport) {
    this.model = { ...report, item: report.item || null };
    this.dialog = true;
  }

  saveReport() {
    if (!this.model) return;
    this.saving = true;
    const payload = {
      reason: this.model.reason,
      details: this.model.details,
      resolved: !!this.model.resolved,
    };
    this.service.update(this.model.id, payload).subscribe({
      next: () => {
        this.dialog = false;
        this.model = null;
        this.reload();
      },
      error: (error) => {
        console.log(error);
        this.saving = false;
      },
      complete: () => (this.saving = false),
    });
  }
}
