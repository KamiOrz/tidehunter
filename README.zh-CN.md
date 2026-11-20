# Tidehunter · 潮汐猎手

[English](README.md) · **简体中文**

**[在线游玩](https://kamiorz.github.io/tidehunter/)** · [GitHub 仓库](https://github.com/KamiOrz/tidehunter)

一款第一人称水下潜猎游戏。在海带森林与岩石峡谷中游泳，寻找鱼群，同时留意氧气和附近的捕食者。

本作基于 **Maksymilian Dendura** 的 [Abyssal Garden](https://github.com/Noniv/abyssal-garden) 程序化海底场景开发，新增鱼类行为、飞行鱼箭、生命与氧气、积分，以及第一人称装备动画。保留原始 MIT 版权和许可。

![程序化海底世界](.github/screenshots/whale-fluke.jpg)

## 开始游玩

1. 使用支持 **WebGPU** 的浏览器打开 [在线游戏](https://kamiorz.github.io/tidehunter/)，推荐桌面版 Chrome 或 Edge。
2. 等待海底世界在设备上生成。
3. 点击 **开始潜猎**。首次交互后声音会启用。

无需账号、安装或后端。离线游玩可下载根目录的 [`index.html`](index.html)，用兼容浏览器打开。游戏与美术素材全部嵌入该文件，目前约 **2.2 MiB**。

WebGPU 需要安全的浏览器环境，例如公开 HTTPS 网站、`localhost`，或浏览器支持的本地文件。在仓库根目录运行以下命令，也可以通过 [http://localhost:8000](http://localhost:8000) 游玩：

```bash
python3 -m http.server 8000
```

如果提示 WebGPU 不可用，请尝试新版 Chrome 或 Edge，并确认浏览器已启用硬件加速。

## 界面语言

游戏支持 **English** 和 **简体中文**。在菜单中点击 **English / 中文** 可切换语言，不会重新开始潜水。

首次访问时，中文浏览器语言默认显示中文，其余语言默认显示英文。手动选择会保留到下次访问。也可以使用指定语言的链接：

- [English](https://kamiorz.github.io/tidehunter/?lang=en)
- [简体中文](https://kamiorz.github.io/tidehunter/?lang=zh)

## 操作

| 操作 | 键盘与鼠标 |
|---|---|
| 转动视角 | 进入场景后移动鼠标 |
| 游泳 | `W` `A` `S` `D` |
| 下潜 / 上浮 | `Q` / `E` |
| 加速 | 按住 `Shift` |
| 发射鱼箭 | 鼠标左键或 `空格`，按住可连续发射 |
| 暂停 / 菜单 | `Esc` 或 `≡` 按钮 |
| 静音 / 恢复声音 | `M` |
| 性能信息 | `H` |
| 切换海域视点 | `1`–`6` |
| 潜水结束后重开 | `R` 或再次下潜按钮 |
| 调整画质 | 菜单中的 **低 / 中 / 高**，会重新加载页面 |

**触屏：** 按住场景向前游泳，滑动转向，第二根手指加速；右下角按钮发射鱼箭。游戏以横屏显示，竖屏设备会旋转页面布局。触屏支持仍属实验性功能。

## 玩法

- 鱼枪自动上箭，每次 **0.8 秒**，鱼箭数量不限。食指、扳机与蓄力带有局部动画，上箭有进度条和音效。
- 鱼箭从画面中的枪口出发，以 **38 米/秒** 飞行。需要预判移动中的鱼，海底和岩壁会挡住鱼箭。
- 命中后鱼身保留鱼箭，随鱼移动和转向。较大的鱼需要多次命中。死亡后带箭翻滚、缓慢下沉约 **7 秒**；插在岩壁上的箭保留约 **12 秒**。
- 鱼群受惊或受伤后会逃跑；两种捕食鱼会接近并攻击潜水员。
- 每猎获 **8 条鱼**完成一轮，获得 **500 奖励分**、补满氧气，并恢复最多 **25 生命值**。
- 满氧可以在水下停留约 **3 分钟**。上浮到距水面 **4 米以内**会补充氧气。缺氧后会持续扣血。
- 生命值归零时潜水结束，可以重新开始。

共有 **12 种鱼类**，每次加载生成不同的外形比例和分布。高 / 中 / 低画质的活动鱼池上限分别为 **240 / 156 / 96**。鱼群会在玩家附近可游泳的区域补充；重开沿用本次访问的随机种子。

海底、悬崖、拱门与隧道有碰撞。装饰植物、沉船、鲸尾雕塑和松散道具可以穿过。

## 程序生成与美术素材

地形、海底景观、鱼类网格与花纹、飞行鱼箭和声音均由代码生成。场景直接使用 **WebGPU** 渲染，不依赖游戏引擎或 3D 库；声音由 **Web Audio API** 实时合成。

第一人称手与鱼枪使用 **AI 生成的摄影风格透明 PNG**，不是实拍照片，也不是可自由旋转的 3D 模型。它作为 2D 前景素材，支持食指、扳机、蓄力带局部变形，以及呼吸、游泳、后坐和上箭动画。鱼箭、鱼体、碰撞和插箭仍在 3D 中模拟。来源与提示词见 [美术素材说明](source/assets/README.md)。

画质档位会减少场景复杂度，运行时也会按帧耗时调整分辨率与绘制距离。浏览器会记住画质设置；设备负载较高时可以调低画质。

## 构建与开发

需要 **Node.js 18 或更新版本**：

```bash
cd source
npm ci
npm test
npm run build
```

`npm run build` 会生成仓库根目录的单文件 `index.html`。运行已经生成的文件无需再次构建或下载素材。

| 在 `source/` 中执行 | 作用 |
|---|---|
| `npm test` | 玩法与语言支持测试 |
| `npm run build` | 生成压缩的 `../index.html` |
| `npm run build:readable` | 生成方便调试的未压缩 `../index.html` |
| `npm run build:dev` | 生成独立的未压缩 `../dev.html`，附带开发工具 |

开发版中，`F` 开始一分钟自动巡游，`B` 运行巡游基准测试并报告帧耗时；设备支持时间戳查询时也会报告 GPU 耗时。巡游期间暂停玩法模拟。生产版不包含这些快捷键。

### 源码结构

| 文件 | 内容 |
|---|---|
| [`source/src/i18n.js`](source/src/i18n.js) | 中英文文案、语言选择、持久化与界面实时更新 |
| [`source/src/game-core.js`](source/src/game-core.js) | 鱼类 AI、连续碰撞、插箭、生命、氧气、积分与重生 |
| [`source/src/game.js`](source/src/game.js) | 鱼与鱼箭渲染、输入、特效和 HUD |
| [`source/src/weapon.js`](source/src/weapon.js) | 写实装备素材的局部动画、后坐、上箭显示与枪口对齐 |
| [`source/src/combat-audio.js`](source/src/combat-audio.js) | 发射、命中、撞岩、上箭和战斗反馈音效 |
| [`source/src/world.js`](source/src/world.js) | 海底布局、植被、珊瑚与景点生成 |
| [`source/src/shaders.js`](source/src/shaders.js) | 水面、材质、光照、雾和后期处理的 WGSL 着色器 |
| [`source/src/main.js`](source/src/main.js) | GPU 初始化、渲染、摄像机、地形碰撞、菜单与操作 |
| [`source/src/math.js`](source/src/math.js) | 噪声、随机数、Surface Nets 与网格构建工具 |
| [`source/src/quality.js`](source/src/quality.js) | 初始画质与保存的性能设置 |
| [`source/src/audio.js`](source/src/audio.js) | 程序化水下环境音 |
| [`source/src/dev.js`](source/src/dev.js) | 开发版巡游与基准测试 |
| [`source/template.html`](source/template.html) | 页面、菜单、加载界面、HUD 与样式 |
| [`source/build.mjs`](source/build.mjs) | 嵌入素材并打包为单个 HTML |

测试覆盖随机种子、上箭时间、鱼箭命中与岩壁遮挡、枪口汇聚、鱼体椭球判定、插箭跟随转向、死亡保持与重生、氧气、轮次奖励及语言行为。

## GitHub Pages 发布

仓库使用 **`main` 分支 / 根目录**，在线地址为 [kamiorz.github.io/tidehunter](https://kamiorz.github.io/tidehunter/)。根目录的 [`.nojekyll`](.nojekyll) 使它按普通静态文件发布。

更新源码后：

1. 在 `source/` 中运行测试与 `npm run build`。
2. 提交源码修改，**同时提交生成的根目录 `index.html`**。
3. 推送到 `main`，等待 GitHub Pages 部署完成。

所有运行时美术资源均嵌入 HTML，发布不依赖绝对素材路径或特定仓库名。

## 许可与署名

代码采用 [MIT 许可](LICENSE)，分发时需要保留版权和许可声明。

原始海底渲染器与世界来自 [Abyssal Garden](https://github.com/Noniv/abyssal-garden)，**Copyright © 2026 Maksymilian Dendura**。Tidehunter 增加了潜猎玩法、中英文界面、第一人称美术与动画。原始版权和完整许可证保留在 [`LICENSE`](LICENSE)，也嵌入生成的 HTML 中。

第一人称美术为 AI 生成，源文件、来源与生成提示词见 [`source/assets/README.md`](source/assets/README.md)。
