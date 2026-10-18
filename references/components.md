# 引擎与组件

模板里**没有现成场景**，只有引擎和积木。每部片子的场景都按它自己的方案写（design.md）。每个文件开头的注释写了参数。

## 场景怎么写

```tsx
// src/scenes/Exhibit.tsx
import { AbsoluteFill } from "remotion";
import { Kinetic, Meta, Stamp } from "../components";
import { lastIdx, pulse, ramp, spring } from "../lib/anim";
import { useScene } from "../lib/timeline";
import { C, FONT } from "../lib/theme";

export const Exhibit: React.FC = () => {
  const { f, props: p, ev, at, has, dur } = useScene(); // f = 场景内帧号（进场转场期间是负数）
  const hit = ev("hit").f;                               // storyboard 里的事件，已经卡在拍上
  const steps = has("steps") ? ev("steps").fs : [];      // repeat 事件的每一帧
  const k = lastIdx(f, steps);                           // 当前走到第几步
  return (
    <AbsoluteFill>
      {/* ramp(f, a, b) 0→1；spring(f, at, 18, 0.4) 带回弹；pulse(f, at, 10) 一次闪 */}
      <Meta corner="tl">{p.meta}</Meta>
    </AbsoluteFill>
  );
};
```

然后在 `src/scenes/index.ts` 的 `SCENES` 里注册，storyboard 里 `"type": "Exhibit"`。一部片子的场景多了可以按幕放在 `Act1.tsx` `Act2.tsx` 里。

`useScene()`：`f` `t` `dur` `props` `ev(name)` → `{f, fs, ticks}`（不存在就报错）、`at(name, 默认秒数)`、`has(name)`、`since(frame)`、`sub(i)` → 第 i 条字幕的 `{in, out}` 帧、`cam`（这一场的镜头）。

## World：贯穿全片的空间（可选）

`src/World.tsx` 画在世界坐标里（像素，(0,0) 是默认视图的中心，z=1 时 1 世界像素 = 1 屏幕像素），镜头 `{x, y, z}` 看向 (x, y)、放大 z 倍。场景在 storyboard 里设 `cam`，`"in": "pan"` 让镜头在两场之间飞过去。

- 场景是按"镜头 = 自己的 cam"时的屏幕坐标画的；镜头动时引擎自动把场景内容跟着世界一起移动。
- 世界里的一个物件在某场景里的屏幕位置：`960 + (x - cam.x) * cam.z`，`540 + (y - cam.y) * cam.z`。
- World 里拿到：`useCurrentFrame()`（绝对帧）、`useCamera()`、`TL`（`TL.scenes.find(s => s.id === "x")` 读别的场景的事件，让世界里的细节和场景同步，比如盖章、红线）。
- 世界里的静态缩略图和场景里的动态版本要互补淡入淡出（pan 期间场景只在最后 28% 出现：`panIn` / `panOut`，从 `lib/transitions` 引入）。
- 不需要贯穿空间就让 World 返回 null。

## HUD

`<Meta>`（角落元信息）和 `<Hud>`（任何要钉在屏幕上的东西：计数器、进度）不随镜头移动。

## 积木（`src/components`，从 `../components` 引入）

| 组件 | 用途 |
|---|---|
| `Kinetic` | 逐字动效：`rise` `blur` `scale` `drop`（重力回弹）`slam`（重）`type` `scramble`（乱码解码）`wave` `split`；`gold` 金色关键词、`exit` 退场 |
| `Counter` | 滚动数字 |
| `DrawPath` | 一条线从头画到尾，带发光的头（红线、轨迹、信号、路线）；`sag` 下垂 |
| `Burst` | 粒子迸发（冲击、火花、墨点、水花） |
| `Stamp` | 印章砸下：先大后压扁回弹，旧墨迹斑点；配 `sfx: "stamp"` + `shake` |
| `GlowDot` | 发光点 |
| `LightStreak` | 带拖尾的光点沿一条线滑过 |
| `ParticleText` | 粒子汇聚成字 |
| `NumberLine` | 尺子数轴（金色区间、绯红遮罩、可缩放） |
| `FormulaCard` / `Label` | 衬线斜体公式 + 双语小标签（`x_{i}` `2^{n}`） |
| `TypeLine` | 逐字打出 + 闪烁光标 |
| `Wave` | 波形（`noise` 0→1 从平静到杂乱） |
| `NoiseMask` | 文字被噪声方块侵蚀 |
| `LineArt` | 线稿：mountains / skyline / tower / antenna / probe |
| `DataCard` / `Dots` / `Ring` | 数据卡 / 进度点 / 扩散光环 |
| `TvSnow` / `ColorField` | 雪花 / 高饱和全彩场（全彩只用一次） |
| `Background` | 全局底色（`meta.bg` 配置） |

`lib/anim.ts`：`ramp` `win` `pulse` `settle`（数字回弹）`spring` `fall` `lastIdx` `rng` `hash` `lerp` `clamp` 和缓动。

这些是积木，不是答案：每个主题需要的画面大多要你自己用 SVG / div / canvas 画（收银台、吐司、滑车、细胞、电路……）。

## 规矩

- **时间只从事件来**：关键动作用 `ev()` / `at()` 取帧，不写死"第 45 帧"（改文案后会重排）。动作本身的时长（淡入 15 帧）可以写死。
- **确定性**：随机用 `rng(seed)` / `hash(i, j, seed)`，禁止 `Math.random` / `Date` / CSS transition。canvas 在 `useLayoutEffect` 里按 `f` 画。
- **样式**：颜色字体字号用 `lib/theme.ts`；只有强调的东西发光；每屏强调色 ≤ 2 种。
- **布局**：主信息在 40% 高度附近；y > 810 留给字幕；左右至少 120px。
- **文字**：场景里出现的中文都放在 storyboard 的 props 里（字体预加载）。
- **不要重复全局层**：背景、字幕、闪白、震屏、调试叠层是全局的（`Video.tsx`）。
- 每次改完：`npx tsc --noEmit`，再 `python tools/preview.py <关键帧>` 看图。
- 改了 skill 自带的引擎文件（lib / components / Video.tsx），重跑 `new_project.py <项目> ` 会刷新它们，不碰你的 scenes 和 World。
