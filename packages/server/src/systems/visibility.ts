import {
  computeVisibility as computeVisibilityShared,
  type RoomSimState,
  type VisibleSnapshot,
} from "@tcc/shared";

/** Thin server wrapper around shared pure visibility. */
export function computeVisibility(
  state: RoomSimState,
  viewerId: string,
): VisibleSnapshot {
  return computeVisibilityShared(state, viewerId);
}

export type { VisibleSnapshot };
