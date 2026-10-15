import { ChangeDetectorRef, Component } from "@angular/core";
import { RouterLink, RouterOutlet } from "@angular/router";
import { invoke } from "@tauri-apps/api/core";

@Component({
  selector: "app-keyboard-extra",
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  templateUrl: "./keyboard-extra.component.html",
  styleUrl: "./keyboard-extra.component.scss",
})
export class KeyboardExtraComponent {
  remap: string = "active";
  rgb_class: string = "";

  current_title: string = "Keyboard Remapping";
  current_img: string = "../../assets/keyboard/keyboard.svg";

  rgb_enabled: boolean = false;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    invoke("execute", {
      program: "ectool",
      arguments: ["rgbkbd", "getconfig"],
      reply: true,
    }).then((event) => {
      let output: any = event;
      let split = output.split(" ")[0].toLowerCase();

      console.log(split);
      if (split == "ec") {
        console.log("disabled");
        this.rgb_enabled = true;
        this.cdr.detectChanges();
      }
    });
  }

  removeActive() {
    this.remap = " ";
    this.rgb_class = " ";
  }

  keyboard_remap() {
    this.removeActive();
    this.remap = "active";
    this.current_title = "Keyboard Remapping";
    this.current_img = "../../assets/keyboard/keyboard.svg";
  }

  rgb() {
    this.removeActive();
    this.rgb_class = "active";
    this.current_title = "RGB Lighting Control";
    this.current_img = "../../assets/activity_light/activity.svg";
  }
}
