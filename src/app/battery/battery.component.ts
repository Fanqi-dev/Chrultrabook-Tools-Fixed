import { ChangeDetectorRef, Component } from "@angular/core";
import { invoke } from "@tauri-apps/api/core";
import { toInteger } from "lodash";

@Component({
  selector: "app-battery",
  imports: [],
  templateUrl: "./battery.component.html",
  styleUrl: "./battery.component.scss",
})
export class BatteryComponent {
  oldec: boolean = false;
  public currentMode: "Normal" | "Idle" | "Discharge" = "Normal";

  public selectMode(newMode: "Normal" | "Idle" | "Discharge"): void {
    this.currentMode = newMode;
  }

  constructor(private cdr: ChangeDetectorRef) {}
  ngOnInit() {
    invoke("execute", {
      program: "ectool",
      arguments: ["chargecontrol"],
      reply: true,
    }).then((event) => {
      if (typeof event == "string") {
        let output = event.split(" ")[0].substring(0, 5).toLowerCase();
        console.log(output);
        if (output == "error") {
          console.log("hi");
          this.oldec = true;
          this.cdr.detectChanges();
        }
      }
    });
  }

  apply_limits() {
    let charge = (document.getElementById("chargecontrol") as HTMLInputElement)
      .value;

    let charge_int = toInteger(charge);
    if (charge_int > 100) {
      charge_int = 100;
    }

    let lower_charge = toInteger(charge_int) - 5;

    invoke("execute", {
      program: "ectool",
      arguments: ["chargecontrol", "normal", lower_charge, charge_int],
      reply: true,
    }).then((event) => {
      //console.log(event)
    });
  }

  apply_mode() {
    let mode = (document.getElementById("mode_battery") as HTMLInputElement)
      .value;

    invoke("execute", {
      program: "ectool",
      arguments: ["chargecontrol", "normal", mode],
      reply: true,
    });

    console.log(mode);
  }

  apply_maximum_current() {
    let value = (document.getElementById("maxcurrent") as HTMLInputElement)
      .value;
    invoke("execute", {
      program: "ectool",
      arguments: ["chargecurrentlimit", value],
      reply: true,
    });
  }
}
