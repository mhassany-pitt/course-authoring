import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TableModule } from 'primeng/table';
import { any } from '../../utils';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-enable-providers',
  templateUrl: './enable-providers.component.html',
  styleUrl: './enable-providers.component.less',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    DialogModule, TableModule,
    IconFieldModule, InputIconModule,
    ButtonModule, CheckboxModule,
    InputTextModule,
  ],
})
export class EnableProvidersComponent {

  any = any;

  @Input() providers: any;
  @Input() list: any;

  enabledOnly: boolean = false;

  @Output() close = new EventEmitter();
  @Output() complete = new EventEmitter();

  get filteredProvidersList() {
    const $ = this.providers.map((p: any) => p.id);
    return this.list.filter((p: any) => !this.enabledOnly || $.includes(p.id));
  }
}
