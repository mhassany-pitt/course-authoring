import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { routes } from './courses.routing.module';
import { CoursesComponent } from './courses.component';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { UserAuthCtrlModule } from '../user-auth-ctrl/user-auth-ctrl.module';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [
    CoursesComponent,
  ],
  imports: [
    CommonModule, FormsModule,
    RouterModule.forChild(routes),
    UserAuthCtrlModule,
    TableModule, DialogModule,
    InputTextModule, ButtonModule,
    CheckboxModule, DropdownModule,
    ToggleButtonModule,
  ]
})
export class CoursesModule { }
