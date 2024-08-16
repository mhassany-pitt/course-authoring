import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnableProvidersComponent } from './enable-providers.component';

describe('EnableProvidersComponent', () => {
  let component: EnableProvidersComponent;
  let fixture: ComponentFixture<EnableProvidersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnableProvidersComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EnableProvidersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
