import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { routes } from './unauthorized-page.routing';
import { UnauthorizedPageComponent } from './unauthorized-page.component';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [
    UnauthorizedPageComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class UnauthorizedPageModule { }
