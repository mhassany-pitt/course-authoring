import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UserAuthCtrlModule } from '../user-auth-ctrl/user-auth-ctrl.module';

import { SlcItemsComponent } from './slc-items.component';
import { SlcItemComponent } from './slc-item.component';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { TableModule } from 'primeng/table';
import { HighlightLineNumbers } from 'ngx-highlightjs/line-numbers';
import { Highlight } from 'ngx-highlightjs';

@NgModule({
  declarations: [SlcItemsComponent, SlcItemComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([
      { path: '', component: SlcItemsComponent },
      { path: ':id', component: SlcItemComponent },
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
  ],
})
export class SLCItemsModule {}
