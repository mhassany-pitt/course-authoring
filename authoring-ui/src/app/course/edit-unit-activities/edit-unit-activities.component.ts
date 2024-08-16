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

@Component({
  selector: 'app-edit-unit-activities',
  templateUrl: './edit-unit-activities.component.html',
  styleUrl: './edit-unit-activities.component.less',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    DialogModule, TableModule,
    IconFieldModule, InputIconModule,
    ButtonModule, CheckboxModule,
  ],
})
export class EditUnitActivitiesComponent {

  any = any;

  @Input() activities: any;
  @Input() list: any;

  @Output() close = new EventEmitter();
  @Output() complete = new EventEmitter();

  selectedOnly: boolean = false;

  get filteredActivitiesList() {
    const $ = this.activities.map((a: any) => a.id);
    return this.list.filter((a: any) => !this.selectedOnly || $.includes(a.id));
  }
}
