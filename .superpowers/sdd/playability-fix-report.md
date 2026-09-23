# Playability Fix Report (2026-09-23)

## Root causes

1. **Starting siege ammo = 0** (`START_SIEGE_AMMO`). New players could not damage cores meaningfully (normal does only `floor(25/5)=5` and needs many hits). HUD “攻城 0” was expected; “普通 0” was either burn-down or nested-schema sync risk.
2. **Walls before cores** in `advanceProjectiles`. Camp brick rings ate projectiles aimed at HQs; 1-tile gaps + small core radius + 20Hz steps made core hits unreliable. Own-core / protection (was 30–60s) also correctly blocked damage.
3. **Colyseus nested `TankSchema`**: `syncPlayer` reassigned `row.tank` every tick; in-place mutation is safer for ammo/hp field patches.
4. **Readability**: tanks were flat squares; cores looked like gray wall dots; no control legend.
5. **Choppy movement**: client snapped to 20Hz Colyseus state with no interpolation.

## Fixes

| Area | Change |
|------|--------|
| Ammo | `START_NORMAL_AMMO=60`, `START_SIEGE_AMMO=8` |
| Core hit | Check cores **before** walls; `CORE_HIT_RADIUS=TILE_SIZE` |
| Walls | 3-tile-wide cardinal entrances on camp rings |
| Protection | 15–30s (was 30–60s) for faster first siege window |
| Sync | Mutate nested tank schema in place (no reassignment) |
| Visual | Tank body+barrel by dir; bullseye cores + “核心” label; distinct brick/steel/water/grass colors |
| UX | Chinese control hint + color legend on HUD |
| Motion | Client lerp toward server pose for all tanks |

## Controls (wired)

- **Desktop**: WASD / arrows move; Space / J fire; `1` Normal, `2` Siege, `3` HE; Tab toggles Normal↔Siege
- **Mobile** (coarse pointer): D-pad bottom-left; 射 / 弹 bottom-right

## Verification

- `pnpm --filter @tcc/shared test` — 32 passed
- `pnpm -r run typecheck` — shared/client/server OK
- server + client production builds OK

## Residual

- Brick destruction not mirrored on client static `mapStatic` walls (visual only).
- No local input prediction (lerp only); self still waits on server tick for true position.
- Projectiles still ~10Hz via visor (not schema); can look jumpy.
- Destructible brick HP / wall rebuild not synced dynamically.
