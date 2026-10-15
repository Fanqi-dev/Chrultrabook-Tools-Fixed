import { ChangeDetectorRef, Component, inject, OnInit } from "@angular/core";
import { FanService } from "../../services/fan.service";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";

@Component({
  selector: "app-fan-section",
  imports: [],
  templateUrl: "./fan-section.component.html",
  styleUrl: "./fan-section.component.scss",
  providers: [FanService],
})
export class FanSectionComponent implements OnInit {
  selected_mode: string = "N/A";
  temp: number = 0;
  fan_exists: boolean = true;
  disabled_class: string = "disable";
  button: string = "btn-outline-secondary";

  fan_auto_class: string = "";
  fan_off_class: string = "";
  fan_max_class: string = "";
  fan_custom_class: string = "";

  auto_active: string = "";
  off_active: string = "";
  max_active: string = "";
  custom_active: string = "";

  active_class: string = "";
  extension: string = "N/A";
  interval: any;
  fan_array: any;

  zoom: number = 1;

  fanService: FanService = inject(FanService);
  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    invoke("execute", {
      program: "ectool",
      arguments: ["pwmgetfanrpm", "all"],
      reply: true,
    }).then((event) => {
      let output: any = event;
      let split = output.split(" ");
      console.log(split[0]);
      if (split[0] == "Fan") {
        //fans are auto disabled, this reverses the disabling
        this.fan_auto_class = "btn-outline-success";
        this.fan_off_class = "btn-outline-warning ";
        this.fan_max_class = "btn-outline-danger";
        this.fan_custom_class = "btn-outline-info btn-outline-info-custom";
        this.extension = "RPM";
        this.disabled_class = "";
        this.fan_exists = false;
        this.cdr.detectChanges();

        //checks if user wants fan curves on boot and applies the respective classes
        invoke("local_storage", {
          function: "get",
          option: "fan_boot",
          value: "",
        }).then(async (event) => {
          if (typeof event === "string") {
            if (event == "") {
              this.auto_active = "active";
              this.selected_mode = "Auto";
              this.fan_auto();
            } else {
              let output = JSON.parse(event);
              if (output) {
                await this.fanService.ready;
                const selected_data = this.fanService.getSelected();
                this.selected_mode = selected_data[0];
                this.fan_array = selected_data[1];
                this.custom_active = "active";
                this.apply_interval();
              } else {
                this.auto_active = "active";
                this.selected_mode = "Auto";
                this.fan_auto();
              }
            }
            this.cdr.detectChanges();
          }
        }).catch((error) => {
          console.error("fan-section: failed to read fan_boot:", error);
        });

        setInterval(this.get_fan_rpm, 1000);
        this.button = "border-0";
      }
      invoke("local_storage", {
        function: "get",
        option: "zoom",
        value: "",
      }).then((percentage) => {
        if (typeof percentage === "string") {
          const number = Number(percentage) / 100;
          this.zoom = number;
        }
      }).catch((error) => {
        console.error("fan-section: failed to read zoom setting:", error);
      });
    }).catch((error) => {
      // ectool missing/failed (no CROS-EC driver, no permission, no fan):
      // keep the fan controls disabled but surface the reason instead of
      // dying with a silent unhandled rejection
      console.error(
        "fan-section: fan detection failed, fan controls stay disabled:",
        error
      );
      this.cdr.detectChanges();
    });

    //starts the interval of reading the cpu temps
    setInterval(() => {
      this.get_cpu_temp();
    }, 1000);

    //listens to the data outputted by rust
    const appWebview = getCurrentWebviewWindow();
    appWebview.listen<string>("fan_curve", (event) => {
      let payload = event.payload;
      let payload_split = payload.split(" ");
      let profile = payload_split[0];
      (document.getElementById("selected_mode") as HTMLInputElement).innerText =
        profile;
      this.fan_array = JSON.parse(payload_split[1]);
      console.log(this.fan_array);
      this.fan_custom();
    });

    // B6: Rust emits system_resume after detecting sleep→wake (wall-clock jump).
    appWebview.listen("system_resume", () => {
      console.log("fan-section: system_resume — re-applying fan curve");
      this.reapply_curve_once();
    });
  }

  async get_cpu_temp() {
    try {
      const output: number = await invoke("get_temps");
      const convertedOutput = output.toString().trim();
      const el = document.getElementById("temp") as HTMLInputElement | null;
      if (el) {
        el.innerText = convertedOutput;
      }
      this.temp = Number(convertedOutput);
    } catch (error) {
      console.error("fan-section: get_temps failed:", error);
    }
  }

  async get_fan_rpm() {
    try {
      const output: string = await invoke("execute", {
        program: "ectool",
        arguments: ["pwmgetfanrpm", "all"],
        reply: true,
      });
      const split = output.split(" ");
      const el = document.getElementById("fanRPM") as HTMLInputElement | null;
      if (el && split[3]) {
        el.innerText = split[3].trim();
      }
    } catch (error) {
      console.error("fan-section: get_fan_rpm failed:", error);
    }
  }

  switchSelected() {
    this.auto_active = "";
    this.off_active = "";
    this.max_active = "";
    this.custom_active = "";
  }

  fan_auto() {
    invoke("execute", {
      program: "ectool",
      arguments: ["autofanctrl"],
      reply: false,
    }).catch((error) => {
      console.error("fan-section: fan_auto failed:", error);
    });
    clearInterval(this.interval);
    this.selected_mode = "Auto";
    this.switchSelected();
    this.auto_active = "active";
  }
  fan_off() {
    invoke("execute", {
      program: "ectool",
      arguments: ["fanduty", "0"],
      reply: false,
    }).catch((error) => {
      console.error("fan-section: fan_off failed:", error);
    });
    clearInterval(this.interval);
    this.selected_mode = "Off";
    this.switchSelected();
    this.off_active = "active";
  }
  fan_max() {
    invoke("execute", {
      program: "ectool",
      arguments: ["fanduty", "100"],
      reply: false,
    }).catch((error) => {
      console.error("fan-section: fan_max failed:", error);
    });
    clearInterval(this.interval);
    this.selected_mode = "Max";
    this.switchSelected();
    this.max_active = "active";
  }

  fan_custom() {
    this.switchSelected();
    this.custom_active = "active";
    this.apply_interval();
  }
  apply_interval() {
    clearInterval(this.interval);
    // B3: never write fanduty while temp is still the unset default (0).
    // Seed a real reading first, then tick every second.
    this.get_cpu_temp()
      .then(() => {
        if (this.temp > 0 && this.fan_array) {
          invoke("set_custom_fan", {
            temp: this.temp,
            array: this.fan_array,
          }).catch((error) => {
            console.error("fan-section: set_custom_fan failed:", error);
          });
        }
      })
      .catch((error) => {
        console.error("fan-section: initial get_temps failed:", error);
      });
    this.interval = setInterval(() => {
      if (this.temp > 0 && this.fan_array) {
        invoke("set_custom_fan", {
          temp: this.temp,
          array: this.fan_array,
        }).catch((error) => {
          console.error("fan-section: set_custom_fan failed:", error);
        });
      }
    }, 1000);
  }

  /** Re-assert the active custom curve once (used after sleep/resume). */
  reapply_curve_once() {
    if (this.custom_active !== "active" || !this.fan_array) {
      return;
    }
    const run = () => {
      if (this.temp > 0) {
        invoke("set_custom_fan", {
          temp: this.temp,
          array: this.fan_array,
        }).catch((error) => {
          console.error("fan-section: resume set_custom_fan failed:", error);
        });
      }
    };
    // Refresh temp then write; also schedule a follow-up within ~5s.
    this.get_cpu_temp()
      .then(run)
      .catch((error) => {
        console.error("fan-section: resume get_temps failed:", error);
        run();
      });
    setTimeout(run, 2000);
  }

  open_fan_custom_window() {
    invoke("open_window", {
      name: "Custom_Fans",
      width: 980.0,
      height: 540.0,
      zoom: this.zoom,
    }).catch((error) => {
      console.error("fan-section: failed to open custom fan window:", error);
    });
  }

  ngOnDestroy() {
    clearInterval(this.interval);
  }
}
