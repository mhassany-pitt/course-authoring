import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { routes } from './login.routing';
import { LoginComponent } from './login.component';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [
    LoginComponent
  ],
  imports: [
    CommonModule, FormsModule,
    ButtonModule, InputTextModule,
    RouterModule.forChild(routes)
  ]
})
export class LoginModule { }
