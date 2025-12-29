import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CatalogV2Service } from './slc-items.service';
import { AppService } from '../app.service';
import { getNavLinks } from '../utils';

@Component({
  selector: 'app-slc-items',
  templateUrl: './slc-items.component.html',
  styleUrls: ['./slc-items.component.less'],
})
export class SlcItemsComponent implements OnInit {
  navLinks = getNavLinks(this.app);

  items: any = [];
  itemAuthors: any = {};

  loading = true;

  constructor(
    public router: Router,
    public app: AppService,
    public api: CatalogV2Service
  ) {}

  ngOnInit(): void {
    this.reload();
  }

  filter(table: any, $event: any) {
    table.filterGlobal($event.target.value, 'contains');
  }

  reload() {
    this.loading = true;
    this.api.list().subscribe({
      next: (items: any) => {
        this.items = items;
        this.flattenAuthors();
      },
      error: (error: any) => console.log(error),
      complete: () => (this.loading = false),
    });
  }

  flattenAuthors() {
    this.itemAuthors = this.items.reduce((acc: any, item: any) => {
      acc[item.id] = '';
      if (item.attribution?.authors?.length) {
        acc[item.id] = item.attribution.authors
          .map(
            (author: any) =>
              `${author.name}` +
              (author.affiliation ? ` (${author.affiliation})` : '')
          )
          .join(', ');
      }
      return acc;
    }, {});
  }
}
