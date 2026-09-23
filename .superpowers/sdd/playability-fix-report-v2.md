# Playability Fix Report v2 (2026-09-23)

## Bugs found (ranked)

| Rank | Bug | Impact |
|------|-----|--------|
| Critical | `pnpm --filter @tcc/server dev` crashed: script called `npm run build --prefix` (pnpm-only repo) | Local join impossible |
| Critical | Own-core collision swallowed every shot fired from spawn/respawn center (`CORE_HIT_RADIUS` ≥ muzzle offset) | “Bullets miss / vanish” at HQ |
| High | Visor projectiles lacked `ammo`/`vx`/`vy` and arrived at 10Hz | Siege shells unreadable; jumpy fire feel |
| High | No self local prediction (lerp-only vs 20Hz authority) | Choppy movement |
| High | Empty selected clip blocked fire (siege=0 stuck) | Can't shoot until manual switch |
| High | Neutrals/airdrops only on minimap | Hard to find siege supply |
| High | AI stayed on siege after first siege pass; rarely shot tanks | Dead fillers / uneven fights |
| Med | Projectiles checked walls before tanks | Edge grazes felt unfair |
| Med | Discrete 20Hz projectile steps | Occasional tunneling |

## Fixes landed

- Server `dev` script → `pnpm -C ../shared run build && tsx watch …`
- Skip own-core projectile collision; 2× substeps; tanks before walls
- `tryFire` auto-fallback empty selected → Normal/Siege/HE
- Visor every tick + `ammo`/`vx`/`vy`; client extrapolates shells
- Self tank soft prediction + rubber-band; others keep lerp
- World markers for neutrals/airdrops
- AI engages nearby tanks, resets to Normal when patroling

## Verification

- `pnpm test` — 36 passed
- `pnpm typecheck` — shared/client/server OK
- Live: `curl /health` ok; colyseus.js join → move 138px → fire (siege 8→0, fallback to normal) → wallPatch → 12 players (AI fill)

## Residual gaps

- Reconnect still refresh-only (out of scope)
- Self prediction ignores walls (mild rubber-band near bricks)
- Cert/VPS ops not in this pass
- No dedicated projectile schema (still visor messages)

## Retest

```bash
git pull
# terminal 1
pnpm --filter @tcc/server dev
# terminal 2
pnpm --filter @tcc/client dev
# open http://localhost:5173/
```
