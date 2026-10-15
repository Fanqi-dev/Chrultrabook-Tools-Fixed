import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { invoke } from "@tauri-apps/api/core";
// import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

// interface SavedStep {
//   id: number;
//   hex_code: string;
//   duration_ms: number;
// }

// interface SavedProfile {
//   id: number;
//   name: string;
//   mode: string;
//   active: boolean;
//   steps_count: number;
//   steps: SavedStep[];
// }

// interface RGB {
//   r: number;
//   g: number;
//   b: number;
// }

// // Interface for the steps used internally, which we will populate from SavedStep
// interface InternalStep {
//   id: number;
//   hexCode: string;
//   duration: number; // Renamed to 'duration' for local use
// }

@Component({
  selector: "app-keyboard-section",
  imports: [],
  templateUrl: "./keyboard-section.component.html",
  styleUrl: "./keyboard-section.component.scss",
})
export class KeyboardSectionComponent implements OnInit {
  constructor(private cdr: ChangeDetectorRef) {}

  backlight_percentage: string = "N/A";
  percentage: number = 0;
  backlight_exists: boolean = !true;
  disabled_class: string = "";
  extension: string = "";
  zoom: number = 1;

  // customProfiles: SavedProfile | undefined;
  // private profile: SavedProfile | null = null;
  // private currentStepIndex: number = 0;
  // private currentStepStartTime: number = 0;
  // private animationFrameId: number | null = null;
  // private currentStartRgb: RGB = { r: 0, g: 0, b: 0 };

  // public currentHexColor: string = "0x000000";

  // private customColors: InternalStep[] = [];
  // private rgbEnabled: boolean = false;
  // private rgbMode: string = "off";
  // private _rgbRed: number = 0;
  // private _rgbGreen: number = 0;
  // private _rgbBlue: number = 0;
  // private currentColorIndex: number = 0;

  ngOnInit() {
    invoke("execute", {
      program: "ectool",
      arguments: ["pwmgetkblight"],
      reply: true,
    }).then((event: any) => {
      const split = event.split(" ");
      if (split[0] !== "Current") {
        this.disabled_class = "disabled";
        this.backlight_exists = !false;
      } else {
        this.backlight_percentage = split[4].trim();
        this.percentage = Number(split[4]);
        this.extension = "%";
      }
    });

    invoke("local_storage", {
      function: "get",
      option: "zoom",
      value: "",
    }).then((percentage) => {
      if (typeof percentage === "string") {
        const number = Number(percentage) / 100;
        this.zoom = number;
        console.log(this.zoom);
      }
    });
    //let configList: any[];

    // invoke("local_storage", {
    //   function: "get",
    //   option: "rgb",
    //   value: "",
    // }).then((output) => {
    //   if (typeof output === "string") {
    //     if (output == "true") {
    //       invoke("local_storage", {
    //         function: "get",
    //         option: "rgb_profile",
    //         value: "",
    //       })
    //         .then((existingJsonString: any) => {
    //           if (
    //             typeof existingJsonString === "string" &&
    //             existingJsonString
    //           ) {
    //             try {
    //               configList = JSON.parse(existingJsonString);
    //             } catch (e) {
    //               console.error("Error parsing existing RGB config JSON:", e);
    //               configList = [];
    //             }
    //           }
    //           const activeItem: SavedProfile = configList.find(
    //             (item: SavedProfile) => {
    //               return item.active === true;
    //             }
    //           );
    //           this.customProfiles = activeItem;
    //           this.startCycle(this.customProfiles);
    //         })
    //         .catch((error) => {
    //           console.error("Failed to load custom profiles:", error);
    //         });
    //     }
    //   }
    // });

    // const appWebview = getCurrentWebviewWindow();
    // appWebview.listen<string>("rgb", (event) => {
    //   let payload = event.payload;
    //   let json = JSON.parse(payload);
    //   console.log(this.customProfiles);
    //   const activeItem: SavedProfile = json.find((item: SavedProfile) => {
    //     return item.active === true;
    //   });
    //   this.customProfiles = activeItem;

    //   if (this.customProfiles && this.customProfiles.mode === "custom") {
    //     this.rgbMode = "custom";
    //     this.rgbEnabled = true;
    //     this.customColors = this.customProfiles.steps.map((step) => ({
    //       id: step.id,
    //       hexCode: step.hex_code,
    //       duration: step.duration_ms,
    //     }));
    //     this.startCycle(this.customProfiles);
    //   } else {
    //     this.stopCycle();
    //   }
    // });

    this.cdr.detectChanges();
  }

  // public startCycle(profile: SavedProfile): void {
  //   if (profile.steps.length < 2) {
  //     this.stopCycle();
  //     return;
  //   }

  //   this.stopCycle();
  //   this.profile = profile;
  //   this.currentColorIndex = 0;

  //   const firstRgb = this._updateRgbFromHex(this.customColors[0].hexCode);
  //   this.currentStartRgb = firstRgb ? firstRgb : { r: 0, g: 0, b: 0 };

  //   this.currentStepStartTime = Date.now();
  //   this.startAnimationFrameLoop();
  // }

  // public stopCycle(): void {
  //   if (this.animationFrameId !== null) {
  //     cancelAnimationFrame(this.animationFrameId);
  //     this.animationFrameId = null;
  //     this.profile = null;
  //     this.rgbEnabled = false;
  //   }
  // }

  // private startAnimationFrameLoop = (): void => {
  //   const hexColor = this.updateColorTransition();
  //   if (hexColor) {
  //     this.update_rgb(hexColor);
  //   }
  //   this.animationFrameId = requestAnimationFrame(this.startAnimationFrameLoop);
  // };

  // private _updateRgbFromHex(hex: string): RGB | null {
  //   const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  //   if (!result) return null;
  //   return {
  //     r: parseInt(result[1], 16),
  //     g: parseInt(result[2], 16),
  //     b: parseInt(result[3], 16),
  //   };
  // }

  // update_rgb(hex_code: string) {
  //   let hex = hex_code.trim();

  //   // Normalize input: remove '#' if present
  //   if (hex.startsWith("#")) {
  //     hex = hex.slice(1);
  //   }

  //   // Validate hex
  //   if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
  //     console.error("Invalid hex color:", hex);
  //     return;
  //   }

  //   const ectoolHex = ("0x" + hex.toLowerCase()).toString().trim();
  //   console.log(ectoolHex);

  //   invoke("execute", {
  //     program: "ectool",
  //     arguments: ["rgbkbd", "clear", ectoolHex],
  //     reply: true,
  //   }).then((event: any) => {
  //     console.log(event);
  //   });
  // }

  // private updateColorTransition(): string | null {
  //   if (
  //     this.customColors.length < 1 ||
  //     !this.rgbEnabled ||
  //     this.rgbMode !== "custom"
  //   ) {
  //     this.stopCycle();
  //     return null;
  //   }

  //   const now = Date.now();

  //   const previousIndex = this.currentColorIndex;
  //   const targetIndex = (this.currentColorIndex + 1) % this.customColors.length;

  //   const currentConfig = this.customColors[previousIndex];
  //   const nextConfig = this.customColors[targetIndex];

  //   const duration = Math.max(1, currentConfig.duration);
  //   const elapsed = now - this.currentStepStartTime;
  //   let progress = Math.min(1, elapsed / duration);

  //   const startR = this.currentStartRgb.r;
  //   const startG = this.currentStartRgb.g;
  //   const startB = this.currentStartRgb.b;

  //   const targetRgb = this._updateRgbFromHex(nextConfig.hexCode);

  //   if (!targetRgb) {
  //     this.stopCycle();
  //     return null;
  //   }

  //   if (progress < 1) {
  //     this._rgbRed = startR + (targetRgb.r - startR) * progress;
  //     this._rgbGreen = startG + (targetRgb.g - startG) * progress;
  //     this._rgbBlue = startB + (targetRgb.b - startB) * progress;
  //   } else {
  //     this._rgbRed = targetRgb.r;
  //     this._rgbGreen = targetRgb.g;
  //     this._rgbBlue = targetRgb.b;

  //     this.currentStartRgb = { r: targetRgb.r, g: targetRgb.g, b: targetRgb.b };

  //     this.currentColorIndex = targetIndex;
  //     this.currentStepStartTime = now;

  //     return this.updateColorTransition();
  //   }

  //   const r = Math.min(255, Math.max(0, Math.round(this._rgbRed)));
  //   const g = Math.min(255, Math.max(0, Math.round(this._rgbGreen)));
  //   const b = Math.min(255, Math.max(0, Math.round(this._rgbBlue)));

  //   const hex =
  //     "0x" +
  //     r.toString(16).padStart(2, "0") +
  //     g.toString(16).padStart(2, "0") +
  //     b.toString(16).padStart(2, "0");

  //   this.currentHexColor = hex;
  //   return hex;
  // }

  update_percentage(event: MouseEvent) {
    this.backlight_percentage = (event.target as HTMLInputElement).value;
    invoke("execute", {
      program: "ectool",
      arguments: ["pwmsetkblight", this.backlight_percentage],
      reply: false,
    });
  }
}
