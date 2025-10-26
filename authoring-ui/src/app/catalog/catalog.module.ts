import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { routes } from './catalog.routing';
import { CatalogService } from './catalog.service';

import { UserAuthCtrlModule } from '../user-auth-ctrl/user-auth-ctrl.module';

import { TableModule } from 'primeng/table';
import { CatalogComponent } from './catalog.component';
import { RouterModule } from '@angular/router';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SidebarModule } from 'primeng/sidebar';
import { TooltipModule } from 'primeng/tooltip';
import { MultiSelectModule } from 'primeng/multiselect';
import { ButtonModule } from 'primeng/button';
import { TabViewModule } from 'primeng/tabview';

import { Highlight, HIGHLIGHT_OPTIONS } from 'ngx-highlightjs';
import { HighlightLineNumbers } from 'ngx-highlightjs/line-numbers';

@NgModule({
  declarations: [
    CatalogComponent,
  ],
  imports: [
    CommonModule, FormsModule,
    RouterModule.forChild(routes),
    TableModule, DropdownModule,
    InputTextModule, UserAuthCtrlModule,
    SidebarModule, TooltipModule, TabViewModule,
    MultiSelectModule, ButtonModule,
    Highlight, HighlightLineNumbers,
  ],
  providers: [
    CatalogService,
    { provide: HIGHLIGHT_OPTIONS, useValue: { themePath: 'assets/styles/solarized-dark.css' } }
  ]
})
export class CatalogModule { }
