import { AmmoType, type PlayerInput } from "@tcc/shared";

export function normalizeInput(message: Partial<PlayerInput> | undefined): PlayerInput {
  const select =
    message?.selectAmmo === AmmoType.Normal ||
    message?.selectAmmo === AmmoType.Siege ||
    message?.selectAmmo === AmmoType.HE
      ? message.selectAmmo
      : null;
  return {
    up: !!message?.up,
    down: !!message?.down,
    left: !!message?.left,
    right: !!message?.right,
    fire: !!message?.fire,
    selectAmmo: select,
  };
}

export function idleInput(): PlayerInput {
  return { up: false, down: false, left: false, right: false, fire: false, selectAmmo: null };
}
