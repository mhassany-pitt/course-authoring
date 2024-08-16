import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditUnitActivitiesComponent } from './edit-unit-activities.component';

describe('EditUnitActivitiesComponent', () => {
  let component: EditUnitActivitiesComponent;
  let fixture: ComponentFixture<EditUnitActivitiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditUnitActivitiesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EditUnitActivitiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
