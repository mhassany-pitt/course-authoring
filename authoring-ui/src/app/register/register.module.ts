import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { routes } from './register.routing';
import { RegisterComponent } from './register.component';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [
    RegisterComponent
  ],
  imports: [
    CommonModule,
    CommonModule, FormsModule,
    ButtonModule, InputTextModule,
    RouterModule.forChild(routes),
  ]
})
export class RegisterModule { }
