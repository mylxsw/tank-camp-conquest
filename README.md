# 营地坦克割据

浏览器常驻房间的俯视坦克割据游戏（设计阶段）。

本仓库目前包含：

- [设计说明](docs/superpowers/specs/2026-09-23-tank-camp-conquest-design.md)
- [实现计划](docs/superpowers/plans/2026-09-23-tank-camp-conquest.md)

## 一句话

打开网页即玩：占营、抢资源与攻城弹、拆核吞营；名下营地全丢才出局；成绩写入浏览器本地。

## 第一版要点

- 单房固定 32 营；满员开新房；可 AI 垫场
- 不缩圈，靠中立点 / 空投 / 攻城弹驱动冲突
- 桌面键盘 + 手机触控
- 技术方向：TypeScript monorepo（shared + Colyseus + Phaser 3）

实现尚未开工；文档定稿后再按计划执行。
