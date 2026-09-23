import { decideAiInput, type PlayerInput, type RoomSimState } from "@tcc/shared";

export function refreshAiInputs(
  state: RoomSimState,
  inputs: Record<string, PlayerInput>,
  now: number,
  rand: () => number,
): void {
  for (const p of Object.values(state.players)) {
    if (!p.isAi || p.eliminated) continue;
    inputs[p.playerId] = decideAiInput(state, p.playerId, now, rand);
  }
}
