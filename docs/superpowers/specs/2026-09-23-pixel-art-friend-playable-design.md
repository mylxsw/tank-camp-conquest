# Stage A 像素风「朋友可玩」视觉与手感 — 设计说明

- 日期：2026-09-23
- 状态：待用户审阅
- 仓库：https://github.com/mylxsw/tank-camp-conquest
- 前提：规则与 Stage A（可分享链接、无账号/合规/正式运营）不变；本文件只覆盖**观感与可读性**升级。

## 1. 一句话

把当前「色块原型」换成**程序生成的经典像素贴图**，让朋友打开网页就能认出坦克、砖墙、钢墙、水、草、炮弹和营地核心，并配上够用的命中反馈；不引入外包美术、大图包或 gameplay 规则变更。

## 2. 目标与成功标准

朋友打开后应满足：

1. **一眼可读**：地形种类、己方/敌方/空核心、自己的坦克朝向都能在 2 秒内分清。
2. **像老坦克大战**：俯视像素格子感，不是矢量色块斑点。
3. **手感够玩**：沿用现有插值移动；射击有简单闪光/受击闪；砖墙破碎仍与服务器 `wallPatch` 同步。
4. **进房仍知怎么玩**：开局目标句 + 操作提示保留（可轻微美化，不砍）。

不在本轮：精美原画、完整音效包、账号、重连以外的新系统、服务端规则大改、VPS 代运维。

## 3. 美术方案（已锁定）

**程序生成像素贴图**（Phaser `textures.generate` / 离屏 canvas 写入像素阵列）：

| 资源键（建议） | 尺寸 | 用途 |
| --- | --- | --- |
| `tile-ground` | 16×16 或对齐 `TILE_SIZE` | 默认地面底色（略噪点） |
| `tile-brick` / `tile-brick-damaged` | 同上 | 砖墙满血 / 残血 |
| `tile-steel` | 同上 | 钢墙 |
| `tile-water` | 同上 | 水（可 2 帧轻动画，可选） |
| `tile-grass` | 同上 | 草（半透明盖层或整格） |
| `tank-body-*` | ~28×28 | 按阵营色着色的车身；炮管可同图或独立 `tank-barrel` |
| `shell-normal` / `shell-siege` | 小圆/菱 | 普通弹 vs 攻城弹 |
| `core-empty` / `core-self` / `core-enemy` | ~28×28 | 营地核心（旗帜/鹰徽式像素，非纯圆） |
| `fx-muzzle` / `fx-hit` | 小 | 枪口火花、受击星点（短寿命） |

着色规则：

- **己方**：偏黄/绿高亮（与现 HUD 一致方向）。
- **敌方**：红系。
- **空核心**：灰白。
- **AI**：与敌方同系或略暗，避免第三套难辨色盲冲突即可。

实现约束：

- 不新增 npm 美术依赖；贴图在 `BootScene` 或独立 `PixelAtlas` 模块于启动时生成一次。
- `MapRenderer` / `TankSprite` / `CampRenderer` / `ProjectileRenderer` 改为 `Image`/`Sprite`（或带 texture 的 tile），去掉纯色 `Rectangle`/`Circle` 作为主视觉（标签文字可保留）。
- 砖墙 `hp` 低于阈值时切 `tile-brick-damaged`；`hp<=0` 移除（已有 `wallPatch`）。

## 4. 手感与反馈（本轮最小集）

- 保持现有 tank 位置 lerp；不引入完整客户端预测（Stage A 不做）。
- 本地开火瞬间播 `fx-muzzle`（朝向炮口）。
- 炮弹命中墙/坦克时尽量用已有网络事件或本地碰撞消失瞬间播 `fx-hit`；若服务端暂无专用事件，以「弹体消失 + 墙 hp 变化」触发即可。
- HUD / 断线 toast / 操作提示：保留中文文案；可加像素风边框，非必须。

## 5. 文件影响（预期）

新建：

- `packages/client/src/render/PixelAtlas.ts`（生成并注册纹理）

修改：

- `BootScene.ts`（先生成 atlas 再进游戏）
- `MapRenderer.ts`、`TankSprite.ts`、`CampRenderer.ts`、`ProjectileRenderer.ts`
- 必要时 `GameScene.ts`（挂 FX、深度排序）
- `README.md` 一句「像素风 Stage A」说明

测试：

- 现有 `@tcc/shared` 单测与 typecheck 仍须通过。
- 人工：本地 `dev` 或 Docker 打开，确认地形/坦克/核心/炮弹可读，砖可被打掉并同步。

## 6. 明确不做

- 手绘 PNG 大图集、Spine、3D。
- 改 Colyseus 房间规则、营位数、弹药经济（除非为反馈必须的极小钩子）。
- 代用户操作 VPS / DNS。

## 7. 验收清单（朋友可玩）

- [ ] 截图中墙/水/草/钢可区分
- [ ] 坦克有车身+炮口朝向，己/敌颜色分明
- [ ] 核心不像「墙斑点」
- [ ] 打砖有残血贴图变化，打穿后格子空出
- [ ] 开火/受击有短暂 FX
- [ ] 进房仍有目标句与操作提示
- [ ] 推送到 `origin/master`，用户可 `git pull` / 重部署后给朋友测
