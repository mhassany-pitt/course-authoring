import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { AppService } from './app.service';
import { DialogModule } from 'primeng/dialog';
import { LoadingBarHttpClientModule } from '@ngx-loading-bar/http-client';
import { LoadingBarRouterModule } from '@ngx-loading-bar/router';
import { HttpClientModule } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { CheckboxModule } from 'primeng/checkbox';
import { DropdownModule } from 'primeng/dropdown';
import { SelectButtonModule } from 'primeng/selectbutton';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { AccordionModule } from 'primeng/accordion';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, FormsModule,
    LoadingBarRouterModule,
    LoadingBarHttpClientModule,
    HttpClientModule,
    FormsModule, ButtonModule, AccordionModule, TableModule,
    InputTextModule, DialogModule, InputTextareaModule,
    CheckboxModule, DropdownModule, SelectButtonModule,
    AutoCompleteModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.less'
})
export class AppComponent {
  readonly DOCUMENTATION_URL = 'https://docs.google.com/document/d/12PhDaTUDmPsw0zapytMcr24UeXW41MMBii5S5VfWzg4/edit?usp=sharing';
  readonly VERSION = 1;
  lastDismissed = +(this.getStorageItem('course-authoring.update-notice.version') || 0);

  constructor(public app: AppService) { }

  getStorageItem(key: string) {
    return localStorage.getItem(key);
  }

  setStorageItem(key: string, value: string) {
    localStorage.setItem(key, value);
  }
}
