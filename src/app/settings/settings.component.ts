import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { invoke } from "@tauri-apps/api/core";
import { version } from "../../../package.json";

@Component({
  selector: "app-settings",
  imports: [],
  templateUrl: "./settings.component.html",
  styleUrl: "./settings.component.scss",
})
export class SettingsComponent implements OnInit {
  version_applied: string = "";
  linux: boolean = true;
  //rgb_enabled: boolean = true;

  sensors: any;
  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.version_applied = version;
    invoke("os").then((os) => {
      if (typeof os == "string") {
        if (os != "linux") {
          this.linux = false;
          this.cdr.detectChanges();
        }
      }
    });

    invoke("local_storage", {
      function: "get",
      option: "fan_boot",
      value: "",
    }).then((fan_boot) => {
      if (fan_boot == "true") {
        this.options[0].answer = true;
        this.cdr.detectChanges();
      }
    });

    invoke("local_storage", {
      function: "get",
      option: "app_tray",
      value: "",
    }).then((app_tray) => {
      if (app_tray == "true") {
        this.options[1].answer = true;
        this.cdr.detectChanges();
      }
    });

    invoke("local_storage", {
      function: "get",
      option: "start_app_tray",
      value: "",
    }).then((start_app_tray) => {
      if (start_app_tray == "true") {
        this.options[2].answer = true;
        this.cdr.detectChanges();
      }
    });

    invoke("local_storage", {
      function: "get",
      option: "app_boot",
      value: "",
    }).then((app_boot) => {
      if (app_boot == "true") {
        this.options[3].answer = true;
        this.cdr.detectChanges();
      }
    });

    // invoke("execute", {
    //   program: "ectool",
    //   arguments: ["rgbkbd", "getconfig"],
    //   reply: true,
    // }).then((event) => {
    //   let output: any = event;
    //   let split = output.split(" ")[0].toLowerCase();
    //   if (split == "ec") {
    //     this.rgb_enabled = true;
    //   } else {
    //     this.rgb_enabled = false;

    //     invoke("local_storage", {
    //       function: "get",
    //       option: "rgb",
    //       value: "",
    //     }).then((app_boot) => {
    //       if (app_boot == "true") {
    //         this.options[3].answer = true;
    //         this.cdr.detectChanges();
    //       }
    //     });
    //   }
    //   this.options[4].disabled = this.rgb_enabled;
    // });

   invoke("get_sensors").then((sensor_data) => {
  if (typeof sensor_data === "string") {
    // Filter out empty lines to avoid ID errors
    this.sensors = sensor_data.split("\n").filter(s => s.trim() !== "");
  }

  // 1. Build and Inject HTML
  let sensors_html = '<div class="form-check">';
  for (let i = 0; i < this.sensors.length; i++) {
    sensors_html += `
      <label class="form-check-label fs-4" for="${this.sensors[i]}">${this.sensors[i]}</label>
      <input class="form-check-input" type="checkbox" id="${this.sensors[i]}" checked><br>
    `;
  }
  sensors_html += "</div>";
  (document.getElementById("sensor_area") as HTMLElement).innerHTML = sensors_html;

  // 2. Add Event Listeners
  for (let i = 0; i < this.sensors.length; i++) {
    document.getElementById(this.sensors[i])?.addEventListener("click", () => {
      this.change_sensor();
    });
  }

  // 3. Now get the saved states (Nested so the IDs exist)
  invoke("local_storage", {
    function: "get",
    option: "sensor_selection",
    value: "",
  }).then((value) => {
    if (typeof value === "string" && value.trim() !== "") {
      // Split and remove the empty entry caused by the trailing space
      const states = value.trim().split(" ");
      
      for (let i = 0; i < this.sensors.length; i++) {
        const input = document.getElementById(this.sensors[i]) as HTMLInputElement;
        if (input) {
          // Check if saved state is "true", otherwise default to true
          input.checked = states[i] !== undefined ? states[i] === "true" : true;
        }
      }
    }
    this.cdr.detectChanges();
  });
});
    invoke("local_storage", {
      function: "get",
      option: "zoom",
      value: "",
    }).then((percentage) => {
      if (typeof percentage === "string") {
        if (percentage == "") {
          (document.getElementById("zoom") as HTMLInputElement).value = "100";
        } else {
          (document.getElementById("zoom") as HTMLInputElement).value =
            percentage;
        }
      }
      this.cdr.detectChanges();
    });
  }

  options = [
    {
      id: 1,
      function: "Start Custom Fan Curves On App Startup",
      answer: false,
      disabled: false,
    },
    {
      id: 2,
      function: "Main Window Minimizes To Tray On Exit",
      answer: false,
      disabled: false,
    },
    {
      id: 3,
      function: "Start App in System Tray",
      answer: false,
      disabled: false,
    },
    {
      id: 4,
      function: "Start App On Boot",
      answer: false,
      disabled: false,
    },
    // {
    //   id: 5,
    //   function: "Start Custom Keyboard RGB Profile on Boot",
    //   answer: false,
    //   disabled: false,
    // },
  ];
  toggle(i: number) {
    if (this.options[i].answer) {
      this.options[i].answer = false;
    } else {
      this.options[i].answer = true;
    }
    switch (i) {
      case 0:
        invoke("local_storage", {
          function: "save",
          option: "fan_boot",
          value: this.options[0].answer.toString(),
        });
        break;
      case 1:
        invoke("local_storage", {
          function: "save",
          option: "app_tray",
          value: this.options[1].answer.toString(),
        });
        break;
      case 2:
        invoke("local_storage", {
          function: "save",
          option: "start_app_tray",
          value: this.options[2].answer.toString(),
        });
        break;
      case 3:
        invoke("local_storage", {
          function: "save",
          option: "app_boot",
          value: this.options[3].answer.toString(),
        });
        invoke("autostart", { value: this.options[3].answer });
        break;
      // case 4:
      //   invoke("local_storage", {
      //     function: "save",
      //     option: "rgb",
      //     value: this.options[4].answer.toString(),
      //   });
      //   break;
    }
  }
  update_zoom(value: string) {
    const number = Number(value) / 100;
    invoke("setzoom", { scale: number });
    invoke("local_storage", {
      function: "save",
      option: "zoom",
      value: value,
    });
  }

  change_sensor() {
    let sensor_state = "";
    for (let i = 0; i < this.sensors.length; i++) {
      let checked = (
        document.getElementById(this.sensors[i]) as HTMLInputElement
      ).checked;
      sensor_state = sensor_state.concat(checked + " ");
    }

    invoke("local_storage", {
      function: "save",
      option: "sensor_selection",
      value: sensor_state,
    });
  }

  async confirmResetDialog(): Promise<boolean> {
    return confirm(
      "Are you sure you want to reset the app? This will delete all app data and close the app."
    );
  }
  confirmReset() {
    let confirmed = this.confirmResetDialog().then((confirm) => {
      if (confirm) {
        // Trigger your reset logic here
        // window.__TAURI__.invoke('reset_app');
        invoke("reset");
      }
    });
  }
}
