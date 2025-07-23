import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { routes } from './update-password.routing';
import { UpdatePasswordComponent } from './update-password.component';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [
    UpdatePasswordComponent
  ],
  imports: [
    CommonModule, FormsModule,
    ButtonModule, InputTextModule,
    RouterModule.forChild(routes)
  ]
})
export class UpdatePasswordModule { }
