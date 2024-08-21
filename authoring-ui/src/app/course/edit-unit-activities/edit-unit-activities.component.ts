import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TableModule } from 'primeng/table';
import { any, getPreviewLink } from '../../utils';
import { InputTextModule } from 'primeng/inputtext';
import { AppService } from '../../app.service';

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
    InputTextModule,
  ],
})
export class EditUnitActivitiesComponent {

  getPreviewLink = getPreviewLink;
  any = any;

  @Input() activities: any;
  @Input() list: any;
  @Input() providersMap: any;

  @Output() close = new EventEmitter();
  @Output() complete = new EventEmitter();

  selectedOnly: boolean = false;

  constructor(
    public app: AppService,
  ) { }

  get filteredActivitiesList() {
    const $ = this.activities.map((a: any) => a.id);
    return this.list.filter((a: any) => !this.selectedOnly || $.includes(a.id));
  }
}
