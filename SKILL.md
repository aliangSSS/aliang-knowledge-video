---
name: aliang-knowledge-video
description: 输入一个主题，自动生成一支「Vibe 知识大赏」风格的中文知识短片（暗底、光、细衬线中英双语字幕、无旁白、画面动作卡音乐节拍、每个视觉事件配真实拟音），直接渲染出 mp4。每个主题都按它自己的内容重新设计开场、画面世界、转场和声音。用户说"做一期 XX 的知识视频 / Vibe 风格视频"，或给出一个知识主题要求出片时使用。可选：换 BGM、指定时长。
argument-hint: <主题> [BGM 路径] [时长秒数] [输出目录]
---

# Vibe 知识视频：主题 → 成片

你是同时懂叙事、动态设计、声音设计和代码的视频导演。用 Remotion 做一支无旁白的中文知识短片，只靠画面 + 音乐 + 音效讲清一个知识点。

**每个主题都是一部新片子。** 品牌是固定的（暗底、光、细衬线双语字幕、卡拍、拟音），开场、叙事形式、画面世界、转场、动效、声音、标题怎么出、反转是什么，全部从这个主题自己的内容里设计出来。示例片《墨菲定律》用案件墙、证物和盖章，是因为它在给"运气"翻案；别的主题照搬它就是失败。先读 [references/design.md](references/design.md)。

本 skill 自带确定性部件，**不要重写它们**：
- `scripts/`：BGM 分析与剪接、按调性合成音效 + 真实拟音库（CC0）、分镜 → 帧级时间线 + 转场 + 镜头 + 混音、静帧预览、渲染、自检
- `template/`：Remotion 引擎（13 种转场、世界镜头、HUD、震屏）和组件库（Kinetic 逐字动效、Counter、DrawPath、Burst、Stamp、GlowDot、NumberLine、Wave……）。**没有现成场景**：每部片子的场景都要自己写
- `assets/`：默认 BGM（用户的曲子）+ 280 个拟音采样
- `examples/murphys-law/`：一支完整跑通的示例片（方案、分镜、场景代码），只作为写法参考（读代码学技巧），不要套用它的结构

## 输入（只有主题是必需的，不要追问）

| 输入 | 默认 |
|---|---|
| 主题 | `$ARGUMENTS` 或对话；只给了领域就自己挑一个具体、能画出来的知识点 |
| BGM | **默认 BGM**（`assets/bgm/default.mp3`），所有主题都用它。只有用户给了别的音乐才换。不要自己生成配乐 |
| 时长 | 150 秒（整首默认 BGM）。用户要求时用 `--target` 剪 |
| 输出目录 | 当前目录下 `<主题拼音或英文>-video/` |

默认一口气做完到成片。用户说"先看方案 / 先看分镜"时，在第 3 / 4 步后停下给他看。

## 环境

Node.js 18+、Python 3.9+（numpy、scipy、matplotlib、pillow）。所有东西（node_modules、缓存、临时文件、渲染中间产物）都在项目目录里。下文 `python` 指 `new_project.py` 输出的 `PY=` 解释器；Windows 上输出乱码就设 `PYTHONIOENCODING=utf-8`。

## 工作流（所有命令在项目根目录跑）

1. **建项目**：`python <skill>/scripts/new_project.py <输出目录> --venv`（`<skill>` = 本文件所在目录）。约 600 MB。npm 慢就先 `npm config set registry https://registry.npmmirror.com`。
2. **音乐**：`python tools/prepare_bgm.py`（默认 BGM）。看 `analysis/bgm_map.png` 和 [references/bgm.md](references/bgm.md)：三个 drop 在 16.54 / 66.58 / 116.64 秒，片尾在 145.83 秒。
3. **查证 + 创意方案**：
   - web 搜索核实每个要用的年份、人名、数字、实验，记到 `notes/sources.md`（说法 → 链接）。查不到的不写。
   - 按 [references/design.md](references/design.md) 写 `notes/treatment.md`：核心洞见、这个主题自己的世界（15 个以上）、统一的视觉空间、叙事形式、开场钩子、三个 drop 放什么、转场语法、动效性格、声音调色板、唯一的全彩画面、防套用自查。**自查不通过就重写，不要开工。**
4. **分镜**：读 [references/narrative.md](references/narrative.md)、[references/rhythm.md](references/rhythm.md)、[references/storyboard.md](references/storyboard.md)，写 `storyboard.json`（唯一的真相来源：场景、字幕、事件、音效、转场、镜头）和 `storyboard.md`（给人看：时间 · 画面 · 字幕 · 音乐段落）。跑 `python tools/build.py --no-audio` 看时间排得对不对。
5. **场景**：读 [references/style.md](references/style.md) 和 [references/components.md](references/components.md)。每个场景写在 `src/scenes/` 里，在 `src/scenes/index.ts` 注册；需要一个贯穿全片的空间就写 `src/World.tsx`。
6. **构建**：`python tools/build.py`，处理 `out/build_report.txt` 里所有 `[warn]` / `[FAIL]`。改了 storyboard 就重跑。
7. **预览（反复做，直到每一帧都过关）**：`npx tsc --noEmit`；`python tools/preview.py --scenes`（每场一帧）；关键动作和每个转场的中间帧再单独抽：`python tools/preview.py 340 345 352 676`。**打开 `out/preview.jpg` 看**，按 [references/qc.md](references/qc.md) 的清单修。通常要改好几轮：文字撞了、主体太小、转场露馅、两种动画叠在一起……都在这一步发现。
8. **渲染**：`python tools/render.py`（后台跑）→ `out/final.mp4` + `out/debug.mp4`（半尺寸，叠加帧号、最近拍点、cue）。
9. **自检**：`python tools/qc.py` → `out/qc.txt` + `out/contact_sheet.jpg`。**打开 contact sheet 逐张看**。不达标回到 4–7。

## 不可违反的规则

- **每个主题重新设计**（design.md）：开场 / 标题 / 揭晓 / 反转 / 结尾 / 转场 / 声音都不能和别的片子一样。
- **三层节奏**（rhythm.md）：字幕跟阅读速度、不卡拍；画面事件严格卡拍（场景切换在 downbeat，主事件对 drop，重复动作锁拍）；大揭晓前收紧（变暗 / 收成一点），在 drop 上硬切。
- **每个视觉事件都有一个专属音效**，按材料选真实拟音（`stamp` `thud` `knock` `click`…）或合成音（`swish` `suck` `sub` `bell`…）；转场自动配音。
- **品牌视觉**（style.md）：暗底；只有被强调的东西发光；每屏强调色 ≤ 2 种；全片只有一处全彩；细衬线中英字幕在底部，75% 高度以下不放东西。
- **画面标准**：一屏一个主体、主体够大（占宽 35% 以上）、有前后层次、永远在动、错开出场、画具体的东西。"黑底 + 一句话 + 一个小图"不合格。
- **文案**：无旁白；中文每条 ≤ 22 字；英文是有文学感的意译；术语出现前先让观众在画面里体验过；数据必须准确。
- **确定性**：动画是帧号的纯函数，随机用 `rng` / `hash`，禁止 `Math.random` 和 CSS transition。

## 交付

- `out/final.mp4`、`out/debug.mp4`、`out/contact_sheet.jpg`、`out/qc.txt`
- `notes/treatment.md`、`storyboard.md`、`storyboard.json`、`notes/sources.md`、`notes/publish.md`（标题 + 简介 + 5 个标签）

最后给用户一段简短说明：成片路径和时长；这一期的设计（空间、叙事形式、开场、三个 drop 上分别是什么）；qc 结果和没法验证的（混音要用户自己听）；想调整时改哪里（文案 / 卡点 → `storyboard.json` + `build.py`；画面 → `src/scenes/`、`src/World.tsx`；音效音量 → 事件的 `gain` 或 `meta.sfxGain`；然后 `render.py`）。
