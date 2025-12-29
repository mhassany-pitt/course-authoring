import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UserAuthCtrlModule } from '../user-auth-ctrl/user-auth-ctrl.module';

import { CatalogV2Component } from './catalog-v2.component';
import { CatalogV2ItemComponent } from './catalog-v2-item.component';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { TableModule } from 'primeng/table';
import { HighlightLineNumbers } from 'ngx-highlightjs/line-numbers';
import { Highlight } from 'ngx-highlightjs';
import { DialogModule } from 'primeng/dialog';

@NgModule({
  declarations: [CatalogV2Component, CatalogV2ItemComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([
      { path: '', component: CatalogV2Component },
      { path: ':id', component: CatalogV2ItemComponent },
    ]),
    UserAuthCtrlModule,
    DropdownModule,
    InputTextModule,
    InputTextareaModule,
    ButtonModule,
    CalendarModule,
    TableModule,
    Highlight,
    HighlightLineNumbers,
    DialogModule,
  ],
})
export class CatalogV2Module {}
