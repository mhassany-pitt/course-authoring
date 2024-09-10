import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CourseRoutingModule } from './course.routing.module';
import { CourseComponent } from './course.component';
import { DropdownModule } from 'primeng/dropdown';
import { UserAuthCtrlModule } from '../user-auth-ctrl/user-auth-ctrl.module';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { TabViewModule } from 'primeng/tabview';
import { DialogModule } from 'primeng/dialog';
import { ListboxModule } from 'primeng/listbox';
import { TreeModule } from 'primeng/tree';
import { TableModule } from 'primeng/table';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ToastModule } from 'primeng/toast';
import { DragDropModule } from '@angular/cdk/drag-drop'
import { ButtonGroupModule } from 'primeng/buttongroup';
import { RearrangeResourcesComponent } from "./rearrange-resources/rearrange-resources.component";
import { RearrangeUnitsComponent } from "./rearrange-units/rearrange-units.component";
import { EditUnitActivitiesComponent } from "./edit-unit-activities/edit-unit-activities.component";
import { EnableProvidersComponent } from "./enable-providers/enable-providers.component";
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ChipsModule } from 'primeng/chips';

@NgModule({
  declarations: [
    CourseComponent,
  ],
  imports: [
    CommonModule, FormsModule,
    CourseRoutingModule,
    UserAuthCtrlModule,
    RearrangeResourcesComponent,
    RearrangeUnitsComponent,
    EditUnitActivitiesComponent,
    EnableProvidersComponent,
    DropdownModule, InputTextModule, ButtonGroupModule,
    InputTextareaModule, DropdownModule,
    CheckboxModule, ButtonModule, TabViewModule,
    DialogModule, ListboxModule, TreeModule, TableModule,
    ChipsModule, IconFieldModule, InputIconModule, ToastModule,
    ConfirmDialogModule, DragDropModule,
  ],
  providers: [
    MessageService, ConfirmationService,
  ]
})
export class CourseModule { }
