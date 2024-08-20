import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import SortableTree from 'sortable-tree';
import { mapToTreeNodes } from '../../utils';

@Component({
  selector: 'app-rearrange-units',
  templateUrl: './rearrange-units.component.html',
  styleUrl: './rearrange-units.component.less',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    DialogModule, ButtonModule,
  ],
})
export class RearrangeUnitsComponent implements OnInit {

  @Input() units: any;

  @Output() close = new EventEmitter();
  @Output() complete = new EventEmitter();

  arrangement: any;

  ngOnInit(): void {
    setTimeout(() => this.prepArrangementList(), 0);
  }

  prepArrangementList() {
    const nodes: any = [], stack: any = {};
    this.units.forEach(({ id, name, level }: any) => {
      const item = { data: { id: id, title: name || '[not defined]' }, nodes: [] };
      if (level == 0) nodes.push(item);
      else stack[level - 1].nodes.push(item);
      stack[level] = item;
    });

    new SortableTree({
      nodes: [{ data: { title: 'Units', root: true }, nodes }],
      element: document.querySelector('.units-tree') as HTMLElement,
      stateId: 'units-tree',
      initCollapseLevel: 5,
      onChange: ({ nodes, movedNode, srcParentNode, targetParentNode }) => {
        this.arrangement = mapToTreeNodes(nodes)[0].children;
        return Promise.resolve();
      }
    });

    const map = ({ data, nodes }: any) => ({
      ...data,
      children: mapToTreeNodes(nodes, map)
    });
    this.arrangement = mapToTreeNodes(nodes, map);
  }

  applyUnitsArrangement() {
    let i = 0;
    const map: any = {};
    const mapIndices = (nodes: any[], level: number) => {
      if (!nodes) return;
      for (const node of nodes) {
        map[node.id] = [i++, level];
        mapIndices(node.children, level + 1);
      }
    }
    mapIndices(this.arrangement, 0);
    this.complete.emit(map);
  }
}
