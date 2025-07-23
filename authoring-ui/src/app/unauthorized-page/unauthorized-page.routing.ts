import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UnauthorizedPageComponent } from './unauthorized-page.component';

export const routes: Routes = [
  { path: '', component: UnauthorizedPageComponent }
];
