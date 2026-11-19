# Tidehunter · 潮汐猎手

**[在线游玩](https://kamiorz.github.io/tidehunter/) · [GitHub 仓库](https://github.com/KamiOrz/tidehunter)**

一款第一人称水下潜猎游戏。海底、12 种鱼类、飞行中的鱼叉和音效仍由代码实时生成；手与鱼枪使用 AI 生成的摄影风格透明图像，保留手套织物、水珠、碳纤维与金属细节。素材直接嵌入单个 HTML，支持离线运行。本作基于 [Noniv/abyssal-garden](https://github.com/Noniv/abyssal-garden) 的程序化海底场景开发，新增潜猎玩法、鱼体插箭、写实武器动画与战斗音效。原场景作者为 **Maksymilian Dendura**；保留原始 MIT 版权和许可，下方英文部分保留原场景的技术说明。

## 在线运行与发布

在线版由 GitHub Pages 托管：**https://kamiorz.github.io/tidehunter/**。推荐使用支持 WebGPU 的 Chrome 或 Edge；首次进入会在本机生成海底场景。无需账号或安装，游戏没有后端，声音在开始潜水后启用。

发布目录是仓库根目录，入口为 `index.html`。更新源码后运行下方构建命令，将生成的 HTML 一起提交；GitHub Pages 使用 `main` 分支的 `/(root)` 发布。根目录的 `.nojekyll` 保证按静态文件提供，所有游戏资源均已嵌入 HTML，不依赖仓库名或路径重写。

## 游戏玩法

打开根目录 `index.html`，点击 **开始潜猎**。需要支持 WebGPU 的浏览器；也可在项目根目录运行 `python3 -m http.server 8000`，访问 `http://localhost:8000`。

- **WASD** 游泳，鼠标转向；**Q / E** 下潜 / 上浮，**Shift** 加速。
- **鼠标左键 / 空格** 发射鱼叉，按住连续发射；每次自动装填 0.8 秒，无限鱼叉。
- 鱼箭从枪口发射，以 38 米/秒飞行，带短尾流和气泡；移动目标需要预判，岩壁会挡住鱼箭。
- 发射时食指与扳机局部扣动、蓄力带回弹，自动上箭有进度条和上膛声。
- 命中后鱼身保留鱼箭，随鱼的移动和转向一起运动；死亡后带箭翻滚、缓慢下沉约 7 秒。岩壁上的箭保留约 12 秒。
- 鱼群受惊会逃跑，两种捕食鱼会接近并攻击潜水员。较大的鱼需要多次命中。
- 每猎获 8 条鱼完成一轮，获得 500 奖励分、补满氧气并恢复 25 生命值。
- 满氧可在水下停留约 3 分钟；上浮到距水面 4 米内自动补氧。缺氧会持续扣血。
- **Esc** 暂停，**M** 静音，**H** 性能信息，**1–6** 切换海域。死亡后点击 **再次下潜** 或按 **R** 重开。
- 触屏：按住场景游泳、滑动转向，使用右下角 **发射** 按钮射击。

每次加载生成新的鱼类外形比例和鱼群分布。高 / 中 / 低画质的活动鱼池上限分别为 **240 / 156 / 96**；猎获后的鱼会在玩家周围的可游泳区域补充。重开本轮沿用当前随机种子。

## 游戏源码与验证

`source/src/game-core.js` 是独立于渲染的固定步长玩法模拟：鱼类 AI、射击、连续碰撞、积分、生命、氧气与重生。`source/src/game.js` 负责程序化网格、WebGPU 绘制、输入和 HUD。

`source/src/weapon.js` 将写实第一人称图像作为局部变形动画：食指、扳机与蓄力带各自运动，鱼箭露出的尖端在发射后消失，上箭末段重新滑入，同时叠加呼吸、游泳和后坐。动画缓存只生成一次，发射不重新生成素材。原图保存在 `source/assets/speargun-hands.png`，来源及生成提示词见 `source/assets/README.md`。它是一张带透明通道的 2D 前景素材；鱼叉、命中和鱼类依然使用 3D 模拟。构建脚本将 PNG 嵌入 HTML，目前交付文件约 2.2 MiB，无需联网下载素材。`source/src/combat-audio.js` 分层合成扳机、弹性释放、水流、命中和上膛声音，复用主音量与静音控制。

```bash
cd source
npm ci
npm test
npm run build
```

测试覆盖随机种子、射击冷却、高速鱼箭命中、岩壁遮挡、枪口汇聚、鱼体椭球判定、插箭随转向与翻滚运动、死亡保持与重生、氧气和轮次奖励。最终仍输出单个 `index.html`。

---

**A dreamy underwater world you can swim through, right in your browser.**

Towering kelp forests, sunbeams pouring through a rippling surface, a sunken ship, manta rays gliding overhead.
The underwater world is made by code, with no external 3D models or sound files. The first-person hands and speargun use an embedded photographic-style image. The game is delivered as **one self-contained HTML file**.

![Kelp forest with a stone whale tail and a manta ray](.github/screenshots/whale-fluke.jpg)

## Try it

1. Download [`index.html`](index.html).
2. Open it in **Chrome** or **Edge** on a desktop computer.
3. Wait a few seconds while the world is built, then press **开始潜猎** and start swimming.

Nothing to install, and it works offline. It needs a browser with **WebGPU**. If you see *"This scene needs WebGPU"*, update your browser or switch to Chrome / Edge.

## What's down there

- **Kelp forests** that sway in the current and sparkle with tiny gold and green specks
- **Light rays** streaming down from a wavy surface, with shimmering caustics on the sea floor
- **A sunken wooden ship**, a **giant stone whale tail**, rock arches, canyons and floating boulders
- **Manta rays**, schools of fish, rising bubbles and drifting particles
- **A purple grotto** with glowing magenta ground cover, coral and barrel sponges
- **A soundscape** made up as you listen: a deep rumble, distant whale calls, soft chimes and bubbles

| | |
|---|---|
| ![Shipwreck](.github/screenshots/shipwreck.jpg) | ![Looking up through the kelp](.github/screenshots/kelp-forest.jpg) |
| ![Barrel sponges](.github/screenshots/sponge-garden.jpg) | ![Light rays over the kelp basin](.github/screenshots/light-rays.jpg) |

![The purple grotto](.github/screenshots/purple-grotto.jpg)

## Controls

| | Keyboard & mouse |
|---|---|
| Look around | Move the mouse |
| Swim | `W` `A` `S` `D` |
| Up / down | `E` / `Q` |
| Swim faster | Hold `Shift` |
| Jump to a viewpoint | `1` to `6` (the spots in the screenshots) |
| Menu | `Esc` releases the mouse and opens the menu with the list of controls; **Resume** takes you back |
| Sound on / off | `M` (sound starts when you dive in) |
| Performance stats | `H` |
| Detail level | **Low**, **Medium** or **High** in the menu (reloads the page) |

The seabed, cliffs and arches are solid: you glide along the rock instead of swimming into it, and you still fit through every tunnel and arch. Kelp, plants, corals, sponges, loose rocks, the floating boulders, the ship and the whale tail you can swim through.

**On a touchscreen:** hold one finger down to swim forward and slide it to steer. Put a second finger down to go faster. The `≡` button in the corner opens the menu. Phones always show the scene in landscape and start on Low or Medium detail. (Touch support is experimental.)

## Detail levels

The **Low**, **Medium** and **High** buttons in the menu pick the detail level; the current one is lit. Each level is the same world, built with less in it:

| Level | What it is | Picked on a first visit for |
|---|---|---|
| **High** | The full scene | Computers |
| **Medium** | Half of the leaves, sparkles and pebbles; small rocks, sponges and corals cast no shadows | Phones with 8 GB of memory |
| **Low** | A quarter of the leaves, no anti-aliasing, coarser rocks and corals, simpler lighting, 480p to start with | Other phones, and computers with 4 GB of memory or less |

If loading crashes the tab, or the graphics driver gives up, the page starts again one level lower. Your browser remembers the level, and the resolution and draw distance the scene settled on, for the next visit.

## How it works

- The seabed is sculpted on your graphics card every time the page opens, then decorated with about two million kelp leaves and plants, tens of thousands of rocks, and thousands of sponges, corals and fish.
- Everything is drawn with **WebGPU** directly. No game engine or 3D library is used.
- The ship, whale tail, mantas, fish and corals are built from simple mathematical shapes.
- The sound is synthesized live with the Web Audio API.
- It's built to run smoothly: about 180 fps at 2560×1440 on an RTX 5070 Ti. On slower hardware it aims for 60 fps by lowering first the resolution and then how far away plants and rocks are drawn, in small steps. The scene is already running, blurred, behind the start menu, so most of that tuning is done before you dive in. A low-end phone (Samsung Galaxy A16) reaches about 20 fps at 670×372 on Low.

## Make it your own

The readable source code is in the [`source`](source) folder. To change something and rebuild `index.html` you need [Node.js](https://nodejs.org) 18 or newer:

```bash
cd source
npm install
npm run build
```

This writes a new `index.html` next to this README. `npm run build:readable` writes an unminified version instead, which is easier to debug in the browser's developer tools.

`npm run build:dev` writes a separate `dev.html` with two extra tools that are not part of `index.html`: `F` flies the camera along a one-minute path through the whole world, and `B` runs that flight as a benchmark and reports frame and GPU times.

| File | What's inside |
|---|---|
| [`source/src/world.js`](source/src/world.js) | The world layout: rock walls, arches, tunnels, kelp forests, sponge gardens, fish schools, mantas, the ship and the whale tail. **A good place to start.** |
| [`source/src/shaders.js`](source/src/shaders.js) | The look: water and fog colors, lighting, kelp, rocks, the water surface and light rays (WGSL shader code) |
| [`source/src/main.js`](source/src/main.js) | The renderer, the camera, the controls, the six viewpoints and the camera path the world is laid out around |
| [`source/src/audio.js`](source/src/audio.js) | The soundscape |
| [`source/src/quality.js`](source/src/quality.js) | The detail levels: which one a device starts on, and what is remembered between visits |
| [`source/src/math.js`](source/src/math.js) | Noise, random numbers and mesh-building helpers |
| [`source/src/dev.js`](source/src/dev.js) | Development tools (fly-through and benchmark), only in `dev.html` |
| [`source/template.html`](source/template.html) | The page around the scene: loading bar, start menu, links and their styles |

Some easy first tweaks:

- **Water color:** `WCOL` (blue-green water) and `PCOL` (purple grotto) near the top of the shared scene code in `shaders.js`
- **Sunlight color:** `SUNC` right next to them
- **Brightness and light rays:** `EXPO` and `RAYS` in `main.js`
- **Swimming speed:** search for `26 : 7` in `main.js` (fast speed : normal speed)

## License

[MIT](LICENSE): free to use, change and share, including in your own projects.

The original underwater renderer and world are from [Abyssal Garden](https://github.com/Noniv/abyssal-garden), copyright (c) 2026 Maksymilian Dendura. Tidehunter adds the spearfishing game and first-person artwork/animation. The original copyright and full license are retained in `LICENSE` and embedded in the generated HTML. Artwork provenance is documented in [`source/assets/README.md`](source/assets/README.md).
