import { ComponentFixture, TestBed } from "@angular/core/testing";

import { KeyboardRemapComponent } from "./keyboard-remap.component";

describe("KeyboardRemapComponent", () => {
  let component: KeyboardRemapComponent;
  let fixture: ComponentFixture<KeyboardRemapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KeyboardRemapComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(KeyboardRemapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
