import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import SortableTree from 'sortable-tree';
import { mapToTreeNodes } from '../../utils';

@Component({
  selector: 'app-rearrange-resources',
  templateUrl: './rearrange-resources.component.html',
  styleUrl: './rearrange-resources.component.less',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    DialogModule, ButtonModule,
  ],
})
export class RearrangeResourcesComponent implements OnInit {

  @Input() resources: any;

  @Output() close = new EventEmitter();
  @Output() complete = new EventEmitter();

  arrangement: any;

  ngOnInit(): void {
    setTimeout(() => this.prepArrangementList(), 0);
  }

  prepArrangementList() {
    const nodes = this.resources.map((u: any) =>
      ({ data: { id: u.id, title: u.name || '[not defined]' }, nodes: [] }));
    new SortableTree({
      nodes: [{ data: { title: 'Resources', root: true }, nodes }],
      initCollapseLevel: 5,
      element: document.querySelector('.resources-tree') as HTMLElement,
      stateId: 'resources-tree',
      confirm: (node: any, target: any) => {
        return Promise.resolve(target.data.root);
      },
      onChange: ({ nodes, movedNode, srcParentNode, targetParentNode }) => {
        this.arrangement = mapToTreeNodes(nodes)[0].children;
        return Promise.resolve();
      }
    });
  }

  applyResourcesArrangement() {
    const map: any = {};
    this.arrangement.forEach((o: any, i: number) => map[o.id] = i);
    this.complete.emit(map);
  }
}
