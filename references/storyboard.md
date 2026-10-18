# storyboard.json

全片唯一的真相来源。`tools/build.py` 把它和 `analysis/beats.json` 编译成帧级时间线 `src/data/timeline.json` 和混音 `public/audio/mix.wav`。**不要手写帧号或时间表**，只写"相对什么、卡什么"。完整示例：`<skill>/examples/murphys-law/storyboard.json`（结构只属于墨菲定律，看写法即可）。

```jsonc
{
  "meta": { "topic": "…", "insight": "…", "title": "…", "subtitle": "…", "en": "…",
            "sfxGain": 0,                 // 全部音效整体增减（dB）
            "autoDuck": true,             // 重击（stamp/hit/sub/thud…）时 BGM 自动让 3 dB
            "bg": { "center": "#0b0a09", "edge": "#020202", "stars": 60, "grain": 0.6 } },  // 或 false：World 自己画底
  "scenes": [ { "id": "…", "type": "…", "in": "pan", "cam": {…}, "props": {…}, "subs": […], "events": […] }, … ]
}
```

## scene

| 字段 | 说明 |
|---|---|
| `id` / `type` | 唯一短名 / `src/scenes/index.ts` 里注册的组件名（省略 = 同 id） |
| `anchor` | `"title"` `"reveal"` `"twist"` `"end"`（beats.json 的 hits）或秒数：场景**开始**钉在这个音乐点上 |
| `anchorOffset` | 秒。负数 = 提前开始（揭晓前留几秒铺垫，主事件用 `"at": "@reveal"` 落在 drop 上） |
| `minSec` / `lead` / `tail` | 最短时长 / 第一条字幕前留白（默认 0.8）/ 最后一条后留白（默认 1.0） |
| `in` | 进场转场，见下表。默认：有 anchor 的 = `cut`，其余 = `fade` |
| `cam` / `camTo` | 世界镜头 `{x, y, z}`（见 components.md 的 World）。不写就继承上一场的 `cam`。`camTo` = 场景结束时的镜头 |
| `drift` | 没写 `camTo` 时镜头慢推的比例，默认 0.02；0 = 不动 |
| `fadeIn` / `fadeOut` | 额外淡入淡出（秒），默认 0；最后一场默认 fadeOut 1.2 |
| `props` | 原样传给组件（`useScene().props`）。**场景里显示的所有中文都放这里**（字体预加载要用） |
| `subs` | `[{ "zh", "en", "at"?, "hold"?, "gap"? }]`。`at` = 相对场景开始的秒数 |

**时间怎么算**：字幕停留 = max(3.5, 中文字数 × 0.22 + 1.0) 秒；场景需要 = lead + 停留 + 间隔 + tail（或 minSec）。anchor 是固定点，其余场景按需要的时长分配，切点吸到 downbeat。

## 转场 `in`

`"pan"` 或 `{ "type", "dur", "align", "dir", "axis", "at", "bow", "sfx" }`

| type | 效果 | 默认时长 / 对齐 | 自动音效 |
|---|---|---|---|
| `cut` | 硬切（drop 上用） | — | — |
| `flash` | 硬切 + 2–3 帧暖白闪 | — | — |
| `fade` / `black` / `blur` | 交叉淡化 / 经过黑场 / 模糊交叉 | 0.5 / 0.8 / 0.6，居中 | — |
| `pan` | **镜头在 World 里飞到下一场的 `cam`**；`bow` 0–1 = 中途拉远多少 | 1.2，落在拍上 | swish（随方向声像） |
| `push` | 新画面把旧画面推出去（`dir` `axis`） | 0.7，落在拍上 | swish |
| `whip` | 极快甩镜 + 运动模糊 | 0.35 | swish |
| `zoom` | 冲进镜头：旧的放大飞过，新的从远处来（`at` 原点） | 0.6 | suck |
| `wipe` | 带金色光边的划变（`dir` `axis`） | 0.6 | swish |
| `iris` | 从一点圆形展开（`at`） | 0.8 | — |
| `rise` | 旧的上移淡出、新的从下面升起 | 0.6 | — |
| `glitch` | 抖动 + 色差，中点硬切 | 0.35，居中 | glitch |

"落在拍上" = 转场在场景开始那一帧（downbeat）完成。`"sfx": false` 关掉自动音效，`"sfx": "whoosh"` 或 `{type, gain, pan}` 换掉。build 会提醒：pan 但两个镜头一样、转场比相邻场景的一半还长。

## event

场景里的命名时刻。组件用 `ev("name")` / `at("name")` 读，音效、闪白、震屏、压低 BGM 都挂在它上面，所以画面和声音永远同一帧。

| 字段 | 说明 |
|---|---|
| `at` | 数字 = 相对场景开始的秒数；或 `"start"` `"end"` `"sub1.in"` `"sub1.out"` `"@reveal"`（音乐锚点）/ 前面某个事件名；可接 `"+0.5"`（秒）或 `"-2b"`（拍）。例：`"end-2b"` `"steps+14b"` |
| `snap` | `beat`（默认）/ `half` / `quarter` / `downbeat` / `accent` / `none` |
| `repeat` | `{ "count": 10, "every": 0.5 }`：每 0.5 拍一次 → `ev().fs`，音效每次都响 |
| `roll` | `[1, 1, 0.5, 0.5, 0.25, 0.25]`：加速滚动，**落在 at 上** → `ev().ticks`，`ev().f` = 落点 |
| `sfx` / `tickSfx` | `"stamp"` 或 `{ "type", "gain", "pan", "variant", "offset", "note", "dur" }` 或数组（同时响 = 一个设计好的复合声） |
| `shake` | `true` / 像素幅度 / `{ "amp", "n" }`：从这一帧开始震屏 |
| `flash` | `true`（3 帧）或帧数：全屏暖白闪 |
| `duck` | `true` 或 `{ "pre", "post", "db" }`：BGM 在事件前压低（默认 BGM 的 drop 前已经自带真空，一般不用） |

画面帧取 floor：画面最多比声音早不到 1 帧，永远不会晚。

## 音效

**真实拟音**（Kenney CC0，`tools/samples.py`，每个约 5 个变体，重复使用时自动轮换）：

| 材料 | alias |
|---|---|
| 重击 / 印章 | `stamp` `punch` `thud` `soft` `explosion` `boom_low` |
| 木 / 纸 / 板 | `knock` `wood` `plank` `tap` |
| 金属 / 玻璃 / 瓷 | `metal` `metal_light` `metal_heavy` `metal_sci` `clink` `glass` `shatter` `plate` `tin` `bell_hit` `pick` |
| 脚步 | `step` `step_wood` `step_soft` `step_grass` `step_snow` |
| 界面 / 电子 | `click` `select` `switch` `toggle` `ui_tick` `confirm` `error` `question` `glitch` `scratch` `scroll` `pluck` `drop` `bong` `open` `close` `maximize` `minimize` `back` `ui_glass` `computer` |
| 科幻 / 机械 | `thruster` `forcefield` `laser` `laser_big` `laser_retro` `door_open` `door_close` |

**合成**（按 BGM 调性的五声音阶）：`bell` `chime`（`note` = 级数，`"up"`/`"down"` + `base` 逐级上行）、`pop` `glide`（`note`→`to`）、`tick` `riser`（在事件处结束）、`hit`（低频 + 和弦长尾）、`sub`（纯低频）、`swish`（气流，转场）、`suck`（反向吸入，在事件处结束）、`noise` `whoosh` `rain`。

响度已按类型对 BGM 校准。单个用 `gain`（dB），整体用 `meta.sfxGain`。`pan` -1（左）… 1（右），或 `[a, b]` 从 a 扫到 b。

**选声音的原则**：按画面里东西的材料选（纸 → scratch / tap，木 → knock，金属 → metal，按钮 → click），重要时刻叠两三层（`["stamp", {"type": "sub"}]`），同一时刻最多两个"不同的"声音。

## build_report 里的警告怎么修

| 警告 | 修法 |
|---|---|
| `A…B 需要 Xs 但只有 Ys` | 两个音乐锚点之间塞太多：删字幕、合并场景，或挪到下一个锚点之后 |
| `内容偏少` | 加字幕 / 场景，或给场景加 `minSec` |
| `字幕只停 Xs` / `超过 22 字` / `间隔只有 Xs` | 场景被挤 / 拆成两条 / 挪开 `at` |
| `有帧落在场景外` | repeat 的 count / every 太大，或 at 太靠后 |
| `被挪了 Xs` | 拍子网格和你想的不一样，改 `at` 或换 snap |
| `转场太长` / `pan 但两个镜头一样` | 缩短 `dur` / 给 cam 不同位置或改用 push |
| `0.1s 内有 3 个以上音效` | 删一个，或挪半拍 |
