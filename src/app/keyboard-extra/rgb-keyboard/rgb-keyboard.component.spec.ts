import { ComponentFixture, TestBed } from "@angular/core/testing";

import { RgbKeyboardComponent } from "./rgb-keyboard.component";

describe("RgbKeyboardComponent", () => {
  let component: RgbKeyboardComponent;
  let fixture: ComponentFixture<RgbKeyboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RgbKeyboardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RgbKeyboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
