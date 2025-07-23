import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { routes } from './hub.routing';
import { HubComponent } from './hub.component';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/dropdown';
import { SelectButtonModule } from 'primeng/selectbutton';
import { UserAuthCtrlModule } from '../user-auth-ctrl/user-auth-ctrl.module';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [
    HubComponent
  ],
  imports: [
    CommonModule, FormsModule,
    RouterModule.forChild(routes),
    DialogModule, ButtonModule,
    InputTextModule, TableModule,
    DropdownModule, SelectButtonModule,
    UserAuthCtrlModule, ConfirmDialogModule,
  ],
  providers: [
    ConfirmationService,
  ],
})
export class HubModule { }
