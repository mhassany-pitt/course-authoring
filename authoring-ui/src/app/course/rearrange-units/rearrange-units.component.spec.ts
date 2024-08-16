import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RearrangeUnitsComponent } from './rearrange-units.component';

describe('RearrangeUnitsComponent', () => {
  let component: RearrangeUnitsComponent;
  let fixture: ComponentFixture<RearrangeUnitsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RearrangeUnitsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RearrangeUnitsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
