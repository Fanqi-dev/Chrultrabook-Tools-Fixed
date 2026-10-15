import { Injectable } from "@angular/core";
import { profile } from "./profiles";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { FanCurveResult } from "./fan-control";

@Injectable({
  providedIn: "root",
})
export class FanService {
  public profiles_list: profile[] = [];
  readonly ready = this.boot();

  private async boot(): Promise<void> {
    const res = await invoke<string>("get_fan_json");
    const profiles: profile[] = JSON.parse(res);
    if (!Array.isArray(profiles)) {
      throw new Error("Invalid fan profiles");
    }
    this.profiles_list = profiles;
  }
  getProfiles(): profile[] {
    return this.profiles_list;
  }

  getProfileArrayByName(name: string) {
    return this.profiles_list.find((profile) => profile.name === name);
  }

  getProfileByIndex(index: number) {
    return this.profiles_list[index];
  }

  getProfileIndexByName(name: string) {
    let objIndex = -1;
    for (let i = 0; i < this.profiles_list.length; i++) {
      if (this.profiles_list[i].name === name) {
        objIndex = i;
        return objIndex;
        break;
      }
    }
    return -1;
  }

  addProfile(name: string) {
    let id = 0;
    for (const key in this.profiles_list) {
      id = Math.max(id, this.profiles_list[key].id + 1);
    }
    const newProfile = {
      id: id,
      name: name,
      array: [0, 10, 25, 40, 60, 80, 95, 100, 100, 100, 100, 100, 100],
      selected: false,
      disabled: true,
      class: "transparent",
      img_class: "btn-outline-info",
      img: "\uF4CB",
    };
    this.profiles_list.push(newProfile);
    const jsonString = JSON.stringify(this.profiles_list);
    invoke("local_storage", {
      function: "save",
      option: "profiles",
      value: jsonString,
    });
  }

  editProfileName(i: number, name: string) {
    this.profiles_list[i].name = name;
    this.save_to_rust();
  }

  editFanCurves(i: number, array: any) {
    this.profiles_list[i].array = [...array];
    this.save_to_rust();
  }

  saveSelected(index: number) {
    for (let i = 0; i < this.profiles_list.length; i++) {
      this.profiles_list[i].selected = false;
    }
    this.profiles_list[index].selected = true;
    this.save_to_rust();
  }

  getSelected() {
    for (let i = 0; i < this.profiles_list.length; i++) {
      if (this.profiles_list[i].selected === true) {
        return [this.profiles_list[i].name, this.profiles_list[i].array];
      }
    }
    return " ";
  }

  /** Persist curve and selection together, then update the editor's saved state. */
  async saveCurve(index: number, array: number[], apply: boolean): Promise<void> {
    if (!this.profiles_list[index]) {
      throw new Error("Select a fan profile before saving");
    }
    const profiles = this.profiles_list.map((item, i) => ({
      ...item,
      array: i === index ? [...array] : [...item.array],
      selected: apply ? i === index : item.selected,
    }));
    await invoke("local_storage", {
      function: "save",
      option: "profiles",
      value: JSON.stringify(profiles),
    });
    profiles.forEach((item, i) => Object.assign(this.profiles_list[i], item));
  }

  async applyCurve(name: string, array: number[]): Promise<void> {
    const requestId = crypto.randomUUID();
    let resolveResult!: (result: FanCurveResult) => void;
    const result = new Promise<FanCurveResult>((resolve) => { resolveResult = resolve; });
    const unlisten = await getCurrentWebviewWindow().listen<FanCurveResult>(
      "fan_curve_applied", (event) => {
        if (event.payload.requestId === requestId) resolveResult(event.payload);
      },
    );
    const timeout = setTimeout(() => resolveResult({ requestId, applied: false }), 8000);
    try {
      await invoke("transfer_fan_curves", { curves: { requestId, name, array: [...array] } });
      if (!(await result).applied) throw new Error("Main window did not apply the fan curve");
    } finally {
      clearTimeout(timeout);
      unlisten();
    }
  }

  deleteProfile(i: number) {
    this.profiles_list.splice(i, 1);
    this.save_to_rust();
  }

  save_to_rust() {
    invoke("local_storage", {
      function: "save",
      option: "profiles",
      value: JSON.stringify(this.profiles_list),
    });
  }
}
