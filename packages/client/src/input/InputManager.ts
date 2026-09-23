import Phaser from "phaser";
import type { AmmoType } from "@tcc/shared";
import { DesktopInput } from "./DesktopInput.js";
import { TouchInput } from "./TouchInput.js";

/** Client-side input sample; shape matches shared `PlayerInput`. */
export interface ClientInputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;
  selectAmmo: AmmoType | null;
}

function detectPreferTouch(preferTouch: boolean): boolean {
  if (preferTouch) return true;
  if (typeof window === "undefined") return false;
  const coarse =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  return coarse;
}

export class InputManager {
  private desktop = new DesktopInput();
  private touch: TouchInput | null = null;
  private useTouch: boolean;

  constructor(scene: Phaser.Scene, preferTouch: boolean) {
    this.useTouch = detectPreferTouch(preferTouch);
    this.desktop.attach(scene);
    if (this.useTouch) {
      this.touch = new TouchInput();
      this.touch.attach(scene);
    }
  }

  sample(): ClientInputState {
    if (this.useTouch && this.touch) return this.touch.sample();
    return this.desktop.sample();
  }

  destroy(): void {
    this.touch?.destroy();
  }
}
