import { Component, OnDestroy, ChangeDetectorRef } from "@angular/core";
import { invoke } from "@tauri-apps/api/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

const ANIMATION_INTERVAL = 20;

interface Key {
  label: string;
  state: string;
  width?: number;
}

interface CustomColor {
  id: number;
  hexCode: string;
  duration: number;
}

interface SavedStep {
  id: number;
  hex_code: string;
  duration_ms: number;
}

interface SavedProfile {
  id: number;
  name: string;
  mode: string;
  steps_count: number;
  steps: SavedStep[];
}

@Component({
  selector: "app-rgb-keyboard",
  imports: [CommonModule, FormsModule],
  templateUrl: "./rgb-keyboard.component.html",
  styleUrl: "./rgb-keyboard.component.scss",
})
export class RgbKeyboardComponent implements OnDestroy {
  private _rgbEnabled: boolean = true;
  brightness: number = 80;
  private _rgbRed: number = 255;
  private _rgbGreen: number = 100;
  private _rgbBlue: number = 255;
  private _hexCodeInput: string = "FF64FF";
  private _rgbMode: string = "off";
  default_button_state: string = "btn-outline-secondary";
  selectedKeyIndex: { row: number; col: number } | null = null;
  customCycleName: string = "My Custom Cycle";

  options_enabled: boolean = true;

  generatedConfigJson: string = "";

  selectedProfileId: number | string = "off";
  customProfiles: SavedProfile[] = [];

  private colorCycleInterval: any;
  private currentColorIndex: number = 0;
  private currentStepStartTime: number = 0;
  private currentStartRgb: { r: number; g: number; b: number } = {
    r: 0,
    g: 0,
    b: 0,
  };

  customColors: CustomColor[] = [
    { id: 1, hexCode: "#FF0000", duration: 1000 },
    { id: 2, hexCode: "#00FF00", duration: 1500 },
    { id: 3, hexCode: "#0000FF", duration: 800 },
  ];
  private nextCustomColorId: number = 4;

  keyboardLayout: Key[][] = [
    [
      { label: "esc", state: this.default_button_state, width: 1 },
      { label: "\uF12F", state: this.default_button_state, width: 1 },
      { label: "\uF138", state: this.default_button_state, width: 1 },
      { label: "\uF116", state: this.default_button_state, width: 1 },
      { label: "\uF14D", state: this.default_button_state, width: 1 },
      { label: "\uF6CF", state: this.default_button_state, width: 1 },
      { label: "\uF1D4", state: this.default_button_state, width: 1 },
      { label: "\uF1D2", state: this.default_button_state, width: 1 },
      { label: "\uF60D", state: this.default_button_state, width: 1 },
      { label: "\uF60B", state: this.default_button_state, width: 1 },
      { label: "\uF611", state: this.default_button_state, width: 1 },
      { label: "\uF47B", state: this.default_button_state, width: 1 },
    ],
    [
      { label: "`", state: this.default_button_state, width: 1 },
      { label: "1", state: this.default_button_state, width: 1 },
      { label: "2", state: this.default_button_state, width: 1 },
      { label: "3", state: this.default_button_state, width: 1 },
      { label: "4", state: this.default_button_state, width: 1 },
      { label: "5", state: this.default_button_state, width: 1 },
      { label: "6", state: this.default_button_state, width: 1 },
      { label: "7", state: this.default_button_state, width: 1 },
      { label: "8", state: this.default_button_state, width: 1 },
      { label: "9", state: this.default_button_state, width: 1 },
      { label: "0", state: this.default_button_state, width: 1 },
      { label: "-", state: this.default_button_state, width: 1 },
      { label: "=", state: this.default_button_state, width: 1 },
      { label: "backspace", state: this.default_button_state, width: 2 },
    ],
    [
      { label: "tab", state: this.default_button_state, width: 1.5 },
      { label: "Q", state: this.default_button_state, width: 1 },
      { label: "W", state: this.default_button_state, width: 1 },
      { label: "E", state: this.default_button_state, width: 1 },
      { label: "R", state: this.default_button_state, width: 1 },
      { label: "T", state: this.default_button_state, width: 1 },
      { label: "Y", state: this.default_button_state, width: 1 },
      { label: "U", state: this.default_button_state, width: 1 },
      { label: "I", state: this.default_button_state, width: 1 },
      { label: "O", state: this.default_button_state, width: 1 },
      { label: "P", state: this.default_button_state, width: 1 },
      { label: "[", state: this.default_button_state, width: 1 },
      { label: "]", state: this.default_button_state, width: 1 },
      { label: "\\", state: this.default_button_state, width: 1.5 },
    ],
    [
      { label: "\uF52A", state: this.default_button_state, width: 1.75 },
      { label: "A", state: this.default_button_state, width: 1 },
      { label: "S", state: this.default_button_state, width: 1 },
      { label: "D", state: this.default_button_state, width: 1 },
      { label: "F", state: this.default_button_state, width: 1 },
      { label: "G", state: this.default_button_state, width: 1 },
      { label: "H", state: this.default_button_state, width: 1 },
      { label: "J", state: this.default_button_state, width: 1 },
      { label: "K", state: this.default_button_state, width: 1 },
      { label: "L", state: this.default_button_state, width: 1 },
      { label: ";", state: this.default_button_state, width: 1 },
      { label: "'", state: this.default_button_state, width: 1 },
      { label: "Enter", state: this.default_button_state, width: 2.25 },
    ],
    [
      { label: "Shift", state: this.default_button_state, width: 2.25 },
      { label: "Z", state: this.default_button_state, width: 1 },
      { label: "X", state: this.default_button_state, width: 1 },
      { label: "C", state: this.default_button_state, width: 1 },
      { label: "V", state: this.default_button_state, width: 1 },
      { label: "B", state: this.default_button_state, width: 1 },
      { label: "N", state: this.default_button_state, width: 1 },
      { label: "M", state: this.default_button_state, width: 1 },
      { label: ",", state: this.default_button_state, width: 1 },
      { label: ".", state: this.default_button_state, width: 1 },
      { label: "/", state: this.default_button_state, width: 1 },
      { label: "Shift", state: this.default_button_state, width: 2.75 },
    ],
    [
      { label: "Ctrl", state: this.default_button_state, width: 1.25 },
      { label: "Alt", state: this.default_button_state, width: 1.25 },
      { label: "Space", state: this.default_button_state, width: 6.25 },
      { label: "Alt", state: this.default_button_state, width: 1.25 },
      { label: "Ctrl", state: this.default_button_state, width: 1.25 },
    ],
  ];

  constructor(private cdr: ChangeDetectorRef) {}

  private loadProfileData(profileId: number): void {
    const profile = this.customProfiles.find((p) => p.id === profileId);

    if (profile) {
      this.customCycleName = profile.name;

      this.customColors = profile.steps.map((step: any, index: number) => ({
        id: index,
        hexCode: step.hex_code.startsWith("#")
          ? step.hex_code.toUpperCase()
          : `#${step.hex_code.toUpperCase()}`,
        duration: step.duration_ms,
      }));

      this.nextCustomColorId =
        this.customColors.length > 0
          ? this.customColors[this.customColors.length - 1].id + 1
          : 1;

      console.log(`Loaded data for profile: ${profile.name}`);

      this.startColorCycle();
    } else {
      console.error(
        `Profile with ID ${profileId} not found in customProfiles.`
      );
    }
  }

  ngOnInit() {
    this.loadCustomProfiles();
    this.rgbEnabled = false;
  }
  private loadCustomProfiles(): void {
    const STORAGE_KEY = "rgb_profile";
    let configList: any[];

    invoke("local_storage", {
      function: "get",
      option: STORAGE_KEY,
      value: "",
    })
      .then((existingJsonString: any) => {
        if (typeof existingJsonString === "string" && existingJsonString) {
          try {
            configList = JSON.parse(existingJsonString);
          } catch (e) {
            console.error("Error parsing existing RGB config JSON:", e);
            configList = [];
          }
        }
        this.customProfiles = configList;
        console.log("Loaded profiles:", this.customProfiles);
        this.cdr.detectChanges();
      })
      .catch((error) => {
        console.error("Failed to load custom profiles:", error);
      });
  }

  get rgbEnabled(): boolean {
    return this._rgbEnabled;
  }
  set rgbEnabled(value: boolean) {
    this._rgbEnabled = value;
    if (this._rgbEnabled && this.rgbMode === "custom") {
      this.startColorCycle();
    } else {
      this.stopColorCycle();
    }
  }

  get rgbMode(): string {
    return this._rgbMode;
  }
  set rgbMode(value: string) {
    this.options_enabled = true;
    this._rgbMode = value;
    this.stopColorCycle();
    this._rgbEnabled = true;

    const profileId = parseInt(value, 10);

    if (!isNaN(profileId)) {
      this.selectedProfileId = profileId;
      this.loadProfileData(profileId);
      this._rgbMode = "custom";

      return;
    }

    if (this._rgbMode === "custom") {
      this.rgbEnabled = true;
      this.options_enabled = true;
    }

    if (this._rgbMode === "off") {
      this.rgbEnabled = false;
      this.options_enabled = true;
    }

    if (this._rgbMode == "flow") {
      this.rgbEnabled = true;
      this.options_enabled = false;
    }

    if (this._rgbMode == "dot") {
      this.rgbEnabled = true;
      this.options_enabled = false;
    }
  }

  get rgbColor(): string {
    return `rgb(${Math.round(this.rgbRed)}, ${Math.round(
      this.rgbGreen
    )}, ${Math.round(this.rgbBlue)})`;
  }

  get rgbOpacity(): number {
    return this.brightness / 100;
  }

  get rgbRed(): number {
    return this._rgbRed;
  }
  set rgbRed(value: number) {
    this._rgbRed = Math.max(0, Math.min(255, value));
    this.updateHexFromRgb();
  }

  get rgbGreen(): number {
    return this._rgbGreen;
  }
  set rgbGreen(value: number) {
    this._rgbGreen = Math.max(0, Math.min(255, value));
    this.updateHexFromRgb();
  }

  get rgbBlue(): number {
    return this._rgbBlue;
  }
  set rgbBlue(value: number) {
    this._rgbBlue = Math.max(0, Math.min(255, value));
    this.updateHexFromRgb();
  }

  get hexCodeInput(): string {
    return this._hexCodeInput;
  }
  set hexCodeInput(value: string) {
    this._hexCodeInput = value;
    this.updateRgbFromHex();
  }

  private _updateRgbFromHex(
    hex: string
  ): { r: number; g: number; b: number } | null {
    let cleanHex = hex.startsWith("#") ? hex.slice(1) : hex;
    if (cleanHex.length === 6) {
      try {
        const r = parseInt(cleanHex.substring(0, 2), 16);
        const g = parseInt(cleanHex.substring(2, 4), 16);
        const b = parseInt(cleanHex.substring(4, 6), 16);
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
          return {
            r: Math.max(0, Math.min(255, r)),
            g: Math.max(0, Math.min(255, g)),
            b: Math.max(0, Math.min(255, b)),
          };
        }
      } catch (e) {}
    }
    return null;
  }

  private updateHexFromRgb(): void {
    const r = Math.round(this.rgbRed).toString(16).padStart(2, "0");
    const g = Math.round(this.rgbGreen).toString(16).padStart(2, "0");
    const b = Math.round(this.rgbBlue).toString(16).padStart(2, "0");
    this._hexCodeInput = `#${r}${g}${b}`.toUpperCase();
  }

  private updateRgbFromHex(): void {
    const rgb = this._updateRgbFromHex(this._hexCodeInput);
    if (rgb) {
      this._rgbRed = rgb.r;
      this._rgbGreen = rgb.g;
      this._rgbBlue = rgb.b;
    }
  }

  public ngOnDestroy(): void {
    this.stopColorCycle();
  }

  public generateCustomRgbConfigJson(send_to_main: boolean): void {
    const STORAGE_KEY = "rgb_profile";
    let configList: any[] = [];

    invoke("local_storage", {
      function: "get",
      option: STORAGE_KEY,
      value: "",
    })
      .then((existingJsonString: any) => {
        if (typeof existingJsonString === "string" && existingJsonString) {
          try {
            configList = JSON.parse(existingJsonString);
          } catch (e) {
            console.error("Error parsing existing RGB config JSON:", e);
            configList = [];
          }
        }

        const existingEntry = configList.find(
          (c) => c.name === this.customCycleName
        );

        let newId: number;

        if (existingEntry) {
          newId = existingEntry.id;
          console.log(
            `Updating existing RGB config with name: ${this.customCycleName} (ID: ${newId})`
          );
        } else {
          const maxId = configList.reduce((max, c) => Math.max(max, c.id), 0);
          newId = maxId + 1;
          console.log(`Generating new RGB config with ID: ${newId}`);
        }

        const newConfig = {
          id: newId,
          active: false,
          name: this.customCycleName,
          mode: "custom_cycle",
          steps_count: this.customColors.length,
          steps: this.customColors.map((color) => ({
            hex_code: color.hexCode.toUpperCase().startsWith("#")
              ? color.hexCode.toUpperCase()
              : `#${color.hexCode.toUpperCase()}`,
            duration_ms: Math.max(1, color.duration),
          })),
        };

        if (existingEntry) {
          const index = configList.findIndex((c) => c.id === newId);
          configList[index] = newConfig;
        } else {
          configList.forEach((obj) => {
            obj.active = false;
          });
          configList.push(newConfig);
        }

        if (send_to_main) {
          newConfig.active = true;
        }

        const finalJsonString = JSON.stringify(configList, null, 2);
        console.log(finalJsonString);

        if (send_to_main) {
          console.log("sent");
          invoke("transfer_rgb", {
            rgb: finalJsonString,
          });
        }

        return invoke("local_storage", {
          function: "save",
          option: STORAGE_KEY,
          value: finalJsonString,
        }).then(() => {
          console.log("Generated and Saved Custom RGB Config JSON:");
          console.log(finalJsonString);

          this.generatedConfigJson = finalJsonString;
        });
      })
      .catch((error) => {
        console.error(
          "An error occurred during RGB config generation or storage:",
          error
        );
      });
  }

  public delete_profile(profileId: number | string): void {
    if (typeof profileId !== "number") {
      console.warn(
        "Cannot delete profile: A custom profile ID must be selected."
      );
      return;
    }

    // Call the logic implemented previously, ensuring it takes a number
    this.delete_profile_logic(profileId as number);
    window.location.reload();
  }

  private delete_profile_logic(profileId: number) {
    const STORAGE_KEY = "rgb_profile";

    invoke("local_storage", {
      function: "get",
      option: STORAGE_KEY,
      value: "",
    })
      .then((existingJsonString: any) => {
        let configList: any[] = [];

        if (typeof existingJsonString === "string" && existingJsonString) {
          try {
            configList = JSON.parse(existingJsonString);
          } catch (e) {
            console.error(
              "Error parsing existing RGB config JSON during delete:",
              e
            );
            return;
          }
        }

        const initialCount = configList.length;
        const updatedConfigList = configList.filter((c) => c.id !== profileId);

        if (updatedConfigList.length === initialCount) {
          console.warn(`Profile with ID ${profileId} not found for deletion.`);
          return;
        }

        console.log(`Successfully deleted profile with ID: ${profileId}`);

        const finalJsonString = JSON.stringify(updatedConfigList, null, 2);

        return invoke("local_storage", {
          function: "save",
          option: STORAGE_KEY,
          value: finalJsonString,
        });
      })
      .then(() => {
        console.log("Updated config list saved to local storage.");
      })
      .catch((error) => {
        console.error("An error occurred during profile deletion:", error);
      });
  }

  public startColorCycle(): void {
    this.stopColorCycle();

    if (
      this.customColors.length < 1 ||
      !this.rgbEnabled ||
      this.rgbMode !== "custom"
    ) {
      return;
    }

    this.currentColorIndex = 0;

    // Initialize the first displayed color and the transition start color
    const initialRgb = this._updateRgbFromHex(this.customColors[0].hexCode);
    if (initialRgb) {
      this.currentStartRgb = initialRgb;
      this._rgbRed = initialRgb.r;
      this._rgbGreen = initialRgb.g;
      this._rgbBlue = initialRgb.b;
    }

    // Start the timer for the first transition
    this.currentStepStartTime = Date.now();

    this.colorCycleInterval = setInterval(
      () => this.updateColorTransition(),
      ANIMATION_INTERVAL
    );
  }

  private updateColorTransition(): void {
    if (
      this.customColors.length < 1 ||
      !this.rgbEnabled ||
      this.rgbMode !== "custom"
    ) {
      this.stopColorCycle();
      return;
    }

    const now = Date.now();

    // The transition is from the color in this.currentColorIndex TO the color in targetIndex
    const previousIndex = this.currentColorIndex;
    const targetIndex = (this.currentColorIndex + 1) % this.customColors.length;

    const currentConfig = this.customColors[previousIndex];
    const nextConfig = this.customColors[targetIndex];

    const duration = Math.max(1, currentConfig.duration);
    const elapsed = now - this.currentStepStartTime;
    const progress = Math.min(1, elapsed / duration);

    // START color is read from the explicitly saved state for this transition step
    const startR = this.currentStartRgb.r;
    const startG = this.currentStartRgb.g;
    const startB = this.currentStartRgb.b;

    // TARGET color is the color we are fading to (from the next config entry)
    const targetRgb = this._updateRgbFromHex(nextConfig.hexCode);

    if (!targetRgb) {
      this.stopColorCycle();
      return;
    }

    if (progress < 1) {
      // Interpolate smoothly
      this._rgbRed = startR + (targetRgb.r - startR) * progress;
      this._rgbGreen = startG + (targetRgb.g - startG) * progress;
      this._rgbBlue = startB + (targetRgb.b - startB) * progress;
    } else {
      // Transition complete: Set final color exactly
      this._rgbRed = targetRgb.r;
      this._rgbGreen = targetRgb.g;
      this._rgbBlue = targetRgb.b;

      // Set the START color for the next transition step to be this exact final color
      this.currentStartRgb = { r: targetRgb.r, g: targetRgb.g, b: targetRgb.b };

      // Move to the next index and reset the timer
      this.currentColorIndex = targetIndex;
      this.currentStepStartTime = now;
    }

    this.cdr.detectChanges();
  }

  public stopColorCycle(): void {
    if (this.colorCycleInterval) {
      clearInterval(this.colorCycleInterval);
      this.colorCycleInterval = null;
      this.currentStepStartTime = 0;
    }
  }

  public addCustomColor(): void {
    this.customColors.push({
      id: this.nextCustomColorId++,
      hexCode: "#FFFFFF",
      duration: 1000,
    });
    if (this.rgbMode === "custom" && this.rgbEnabled) {
      this.startColorCycle();
    }
  }

  public removeCustomColor(id: number): void {
    if (this.customColors.length > 1) {
      this.customColors = this.customColors.filter((color) => color.id !== id);

      if (this.rgbMode === "custom" && this.rgbEnabled) {
        this.startColorCycle();
      }
    }
  }

  public apply() {
    console.log("apply");
    if (this._rgbMode === "off") {
      invoke("execute", {
        program: "ectool",
        arguments: ["rgbkbd", "demo", "0"],
        reply: true,
      }).then((event) => {
        console.log(event);
      });
    }

    if (this._rgbMode === "static") {
      let hex = this.hexCodeInput.trim();

      // Normalize input: remove '#' if present
      if (hex.startsWith("#")) {
        hex = hex.slice(1);
      }

      // Validate hex
      if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
        console.error("Invalid hex color:", hex);
        return;
      }

      const ectoolHex = ("0x" + hex.toLowerCase()).toString().trim();
      console.log(ectoolHex);

      invoke("execute", {
        program: "ectool",
        arguments: ["rgbkbd", "clear", ectoolHex],
        reply: true,
      }).then((event: any) => {
        console.log(event);
      });
    }

    if (this._rgbMode == "flow") {
      invoke("execute", {
        program: "ectool",
        arguments: ["rgbkbd", "demo", "1"],
        reply: true,
      }).then((event) => {
        console.log(event);
      });
    }

    if (this._rgbMode == "dot") {
      invoke("execute", {
        program: "ectool",
        arguments: ["rgbkbd", "demo", "2"],
        reply: true,
      }).then((event) => {
        console.log(event);
      });
    }
  }

  get isCustomMode(): boolean {
    return (
      this.rgbMode != "off" &&
      this.rgbMode != "static" &&
      this.rgbMode != "flow" &&
      this.rgbMode != "dot"
    );
  }
}
