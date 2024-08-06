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
import { DragDropModule } from '@angular/cdk/drag-drop';

@NgModule({
  declarations: [
    CourseComponent,
  ],
  imports: [
    CommonModule, FormsModule,
    CourseRoutingModule,
    UserAuthCtrlModule,
    DropdownModule, InputTextModule,
    InputTextareaModule, DropdownModule,
    CheckboxModule, ButtonModule, TabViewModule,
    DialogModule, ListboxModule, TreeModule, TableModule,
    IconFieldModule, InputIconModule,
    DragDropModule,
  ]
})
export class CourseModule { }
