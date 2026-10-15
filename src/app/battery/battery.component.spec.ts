import { ComponentFixture, TestBed } from "@angular/core/testing";

import { BatteryComponent } from "./battery.component";

describe("BatteryComponent", () => {
  let component: BatteryComponent;
  let fixture: ComponentFixture<BatteryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BatteryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BatteryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
