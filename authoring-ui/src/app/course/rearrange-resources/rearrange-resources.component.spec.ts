import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RearrangeResourcesComponent } from './rearrange-resources.component';

describe('RearrangeResourcesComponent', () => {
  let component: RearrangeResourcesComponent;
  let fixture: ComponentFixture<RearrangeResourcesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RearrangeResourcesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RearrangeResourcesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
