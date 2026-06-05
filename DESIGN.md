# DESIGN.md — 岗位避坑检测器(FlowFi 深色玻璃拟态版)

> 视觉与交互规范。**风格逆向自 FlowFi(深色午夜蓝 / 玻璃拟态 / 发光宝珠 / AI 金融科技),业务内核沿用「岗位避坑检测器」。**
>
> 设计哲学:**用高级的深色科技外壳建立信任,用克制而清晰的风险语义守住可信度。**
> 注意:这是一次「换肤」——配色 / 质感 / 字体全面深色化,但四档风险语义、AA 对比度、「不演危险」的业务约束 **必须保留**,只是重新映射到深色背景。

---

## 1. Visual Theme & Atmosphere

**定调一句话**:像一个冷静、专业的 AI 助手——深邃、聪明、可信,说到风险时绝对认真。

**氛围关键词**:深色科技 · 玻璃拟态 · AI 未来感 · 蓝紫发光 · 可信 · 不恐吓 · 移动优先

**设计语言**:Modern AI SaaS / Dark Glassmorphism / Premium Fintech(逆向自 FlowFi)

**设计哲学**:
- 产品面向 18–26 岁求职者。**深色 + 蓝紫光晕 + 玻璃质感**传达「这是一个智能、专业、靠谱的 AI 工具」,降低对「检测结果」的不信任。
- 本质仍是「风险提示工具」。**风险信息区域必须语义清晰、措辞冷静**,绝不用 emoji 卖萌或夸张动效去"演"危险——在深背景上,克制的高饱和语义色比闪烁更有说服力。
- 双层策略:**外壳科技高级**(深蓝基底、玻璃卡、蓝紫渐变 CTA、发光焦点、入场微动画)/ **内核克制**(风险等级、高危原文、暂停警告用严格的深色语义色 + 冷静措辞)。
- 移动端优先:用户主要在手机上求职,所有布局先保证 375px 宽下完美,再向上扩展。深色在移动端弱光环境下更护眼,是加分项。

---

## 2. Color Palette & Roles

```css
:root {
  /* —— 基础背景 / 表面(深色基底)—— */
  --bg-0: #070B14;                   /* rgb(7,11,20)   最外层最深底 / 暗角 */
  --bg: #0E1A2B;                     /* rgb(14,26,43)  主背景上层 */
  --bg-2: #13294A;                   /* rgb(19,41,74)  背景偏蓝中段 */
  --bg-gradient-hero:                /* 首页 Hero 径向氛围光 */
    radial-gradient(120% 100% at 50% 0%, #1B3A66 0%, #070B14 70%);
  --bg-soft: #0F1726;                /* rgb(15,23,38)  区块底,略提亮 */

  /* —— 玻璃表面(Glassmorphism)—— */
  --glass: rgba(255,255,255,0.06);   /* 玻璃卡片填充 */
  --glass-strong: rgba(255,255,255,0.10); /* 浮起 / hover 玻璃 */
  --glass-blur: 20px;                /* backdrop-filter 模糊半径 */

  /* —— 文字(深底反白)—— */
  --text: #FFFFFF;                   /* 主文字 / 大标题 */
  --text-muted: rgba(255,255,255,0.78);  /* 次要文字 / 正文 */
  --text-subtle: rgba(255,255,255,0.45);  /* 辅助 / 占位 / 三级 */

  /* —— 边框 / 分割线 —— */
  --border: rgba(255,255,255,0.10);  /* 玻璃描边 / 默认边框 */
  --border-strong: rgba(255,255,255,0.18); /* 强边框 / 输入框 */
  --hairline-top: rgba(255,255,255,0.15);  /* 卡片顶部 inset 高光 */

  /* —— 品牌主色(蓝→紫,逆向自 FlowFi)—— */
  --brand: #2F80ED;                  /* rgb(47,128,237)  主操作 / CTA */
  --brand-300: #5B9DF9;              /* rgb(91,157,249)  渐变高光 / hover */
  --brand-deep: #2266C9;             /* rgb(34,102,201)  按下态 */
  --brand-soft: rgba(47,128,237,0.14);    /* 主色浅玻璃底 */
  --accent: #8B5CF6;                 /* rgb(139,92,246)  辅色 紫 / 渐变尾 */
  --accent-soft: rgba(139,92,246,0.16);   /* 辅色浅玻璃底 / 聚焦环底 */
  --teal: #34D399;                   /* rgb(52,211,153)  正向数据 / 成功 */

  /* —— 风险语义色(深色重映射:文字/描边高饱和,底用深玻璃)—— */
  /* low 安全绿 */
  --risk-low: #34D399;               /* 文字 / 图标,深底上够亮 */
  --risk-low-bg: rgba(52,211,153,0.12);
  --risk-low-border: rgba(52,211,153,0.40);
  /* verify 需核验 黄 */
  --risk-verify: #FBBF24;            /* rgb(251,191,36) 深底上清晰 */
  --risk-verify-strong: #F5A623;
  --risk-verify-bg: rgba(251,191,36,0.12);
  --risk-verify-border: rgba(251,191,36,0.38);
  /* high 高风险 橙 */
  --risk-high: #FB923C;              /* rgb(251,146,60) */
  --risk-high-bg: rgba(251,146,60,0.12);
  --risk-high-border: rgba(251,146,60,0.40);
  /* block 强烈建议暂停 红 */
  --risk-block: #F87171;             /* rgb(248,113,113) 深底上稳重的红 */
  --risk-block-bg: rgba(248,113,113,0.12);
  --risk-block-border: rgba(248,113,113,0.42);

  /* —— 功能 —— */
  --highlight-bg: rgba(251,191,36,0.22);  /* 高危原文高亮(深底黄玻璃)*/
  --highlight-underline: #FB923C;          /* 高亮下划波浪 */
  --focus-ring: #8B5CF6;                    /* 聚焦环 = 辅色紫 */
  --success: #34D399;
  --shadow-color: 0,0,0;                    /* 深色阴影用纯黑 */
  --brand-shadow: 47,128,237;               /* 蓝色发光阴影 */
  --orb-glow: 91,124,255;                   /* 宝珠/焦点发光 */

  /* —— 渐变 —— */
  --grad-text: linear-gradient(90deg,#5B9DF9,#8B5CF6);  /* 标题强调词 */
  --grad-btn:  linear-gradient(180deg,#5B9DF9,#2F80ED);  /* 主 CTA */

  /* —— 圆角 —— */
  --radius-sm: 12px;
  --radius: 20px;
  --radius-lg: 28px;
  --radius-pill: 999px;
}
```

**角色说明**:
- `--brand`(蓝)/`--accent`(紫)只用于**主操作、品牌点缀、装饰渐变**,**不**用于风险表达——避免和风险橙混淆。
- 风险四色是**信息色**,只出现在风险等级卡、标签、警告区,绝不挪作装饰。
- 深色重映射原则:**风险色的"文字/图标/描边"用高饱和亮色(深底上才看得清),"底"用同色 12% 透明玻璃**。务必在 `--bg`(#0E1A2B)上复核所有风险文字 ≥ AA 对比度。
- **禁止纯黑 `#000` 背景**——FlowFi 是带蓝调的深色(`#070B14`/`#0E1A2B`),纯黑会发闷掉档次。

---

## 3. Typography Rules

```css
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;700&display=swap');

:root {
  --font-display: 'Poppins', 'Noto Sans SC', system-ui, sans-serif;  /* 标题,圆润几何,逆向自 FlowFi */
  --font-body: 'Inter', 'Noto Sans SC', system-ui, -apple-system, sans-serif; /* 正文 */
}
```

| 层级 | 字号 / 行高 | 字重 | 字间距 | 用途 |
|---|---|---|---|---|
| Display | 36px / 1.1(移动)· 72px / 1.05(桌面) | 800 | -0.02em | 首页主标题(含渐变强调词) |
| H1 | 26px / 1.25 | 700 | -0.01em | 结果页风险等级标题 |
| H2 | 20px / 1.35 | 700 | -0.01em | 区块标题 |
| H3 | 17px / 1.4 | 600 | 0 | 卡片小标题 |
| Body | 17px / 1.6 | 400 | 0 | 正文(`--text-muted`) |
| Body-sm | 14px / 1.65 | 400 | 0 | 辅助说明、隐私提示 |
| Label | 12–13px / 1.4 | 600 | 0.04em | 标签、eyebrow(大字距小标签) |
| Mono-num | 等宽数字 / 1 | 700 | 0 | 风险分数、大数字 |

**特殊处理**:
- **渐变文字**:首页 H1 关键词用 `background:var(--grad-text); -webkit-background-clip:text; color:transparent;` + *italic*(参考图 "Thinks Ahead" 的做法)。
- **中文规则**:正文 `line-height ≥ 1.7`、`letter-spacing:0.02em`;`Noto Sans SC` 在 fallback 链,标题混排 Poppins 在前。
- **禁止字体**:Times New Roman、宋体系统默认、任何 cursive 手写体(要可信,不要俏皮)。

---

## 4. Component Stylings

### 主按钮 Primary(开始检测 / Download)
```css
.btn-primary {
  font-family: var(--font-display); font-weight: 600; font-size: 17px;
  color: #fff; background: var(--grad-btn);
  padding: 16px 32px; border-radius: var(--radius-pill); border: none;
  box-shadow: 0 8px 30px rgba(var(--brand-shadow), 0.45);  /* 蓝色发光 */
  cursor: pointer; transition: transform .18s cubic-bezier(.34,1.56,.64,1),
              box-shadow .18s ease, filter .18s ease;
  min-height: 48px;
}
.btn-primary:hover { filter: brightness(1.06); transform: translateY(-2px);
  box-shadow: 0 12px 36px rgba(var(--brand-shadow), 0.55); }
.btn-primary:active { transform: translateY(0) scale(.98); }
.btn-primary:focus-visible { outline: 3px solid var(--accent-soft); outline-offset: 2px; }
.btn-primary:disabled { background: var(--glass-strong); color: var(--text-subtle);
  box-shadow: none; cursor: not-allowed; transform: none; }
```

### 次按钮 Secondary(玻璃态,如 See How It Works / 再测一个)
```css
.btn-secondary {
  font-family: var(--font-display); font-weight: 600; font-size: 16px;
  color: var(--text); background: var(--glass);
  -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
  padding: 14px 28px; border-radius: var(--radius-pill);
  border: 1px solid var(--border);
  transition: all .18s ease; min-height: 48px; cursor: pointer;
}
.btn-secondary:hover { background: var(--glass-strong); border-color: var(--border-strong); }
.btn-secondary:active { transform: scale(.98); }
.btn-secondary:focus-visible { outline: 3px solid var(--accent-soft); outline-offset: 2px; }
.btn-secondary:disabled { opacity: .5; cursor: not-allowed; }
```

### 玻璃卡片 Card(通用)
```css
.card {
  background: var(--glass);
  -webkit-backdrop-filter: blur(var(--glass-blur)); backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--border);
  border-radius: var(--radius); padding: 24px;
  box-shadow: 0 20px 60px rgba(var(--shadow-color), 0.45),
              inset 0 1px 0 var(--hairline-top);  /* 顶部高光边 */
  transition: box-shadow .2s ease, transform .2s ease, border-color .2s ease;
}
.card:hover { background: var(--glass-strong); border-color: var(--border-strong);
  transform: translateY(-2px); }
```

### 导航 Navbar(浮动玻璃胶囊,逆向自 FlowFi)
```css
.navbar {
  display: flex; align-items: center; gap: 28px;
  padding: 8px 8px 8px 16px; margin: 0 auto;
  background: rgba(10,12,18,0.85);
  -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: var(--radius-pill);
  /* logo(圆形宝珠)+ 品牌名 + 导航项 + 右侧主CTA */
}
.navbar a { color: var(--text); font: 500 16px var(--font-body); }
```

### 风险等级卡 RiskLevelCard(核心组件,按等级变色)
```css
.risk-card {
  border-radius: var(--radius-lg); padding: 24px;
  border: 1.5px solid; position: relative; overflow: hidden;
  -webkit-backdrop-filter: blur(var(--glass-blur)); backdrop-filter: blur(var(--glass-blur));
}
/* 四档:深玻璃底 + 高饱和描边/标题色 */
.risk-card[data-level="low"]   { background: var(--risk-low-bg);    border-color: var(--risk-low-border); }
.risk-card[data-level="verify"]{ background: var(--risk-verify-bg); border-color: var(--risk-verify-border); }
.risk-card[data-level="high"]  { background: var(--risk-high-bg);   border-color: var(--risk-high-border); }
.risk-card[data-level="block"] { background: var(--risk-block-bg);  border-color: var(--risk-block-border); }
/* 标题用等级色 */
.risk-card[data-level="low"]    .risk-title { color: var(--risk-low); }
.risk-card[data-level="verify"] .risk-title { color: var(--risk-verify); }
.risk-card[data-level="high"]   .risk-title { color: var(--risk-high); }
.risk-card[data-level="block"]  .risk-title { color: var(--risk-block); }
.risk-card .risk-title { font: 700 26px/1.25 var(--font-display); }
/* 正文回到反白,保证可读 */
.risk-card .risk-desc { color: var(--text-muted); font-size: 15px; line-height: 1.7; }
```

### 风险标签 Tag / 徽章 Badge
```css
.tag { display: inline-flex; align-items: center; gap: 6px;
  font: 600 12px/1 var(--font-body); letter-spacing: .04em;
  padding: 7px 12px; border-radius: var(--radius-pill);
  border: 1px solid var(--border); background: var(--glass); color: var(--text-muted); }
.tag[data-sev="block"] { color: var(--risk-block); background: var(--risk-block-bg); border-color: var(--risk-block-border); }
.tag[data-sev="high"]  { color: var(--risk-high);  background: var(--risk-high-bg);  border-color: var(--risk-high-border); }
/* 正向数据徽章(如 +2.5%)用青绿 */
.tag[data-sev="positive"] { color: var(--teal); }
```

### 高危原文高亮 Highlight
```css
.hl { background: var(--highlight-bg); padding: 1px 4px; border-radius: 4px;
  font-weight: 600; color: var(--text); box-decoration-break: clone;
  text-decoration: underline wavy var(--highlight-underline);
  text-underline-offset: 3px; }
```

### 输入框 Textarea / Input(玻璃态)
```css
.field { width: 100%; font: 400 16px/1.7 var(--font-body); color: var(--text);
  background: var(--glass); border: 1.5px solid var(--border-strong);
  border-radius: var(--radius); padding: 16px;
  -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
  transition: border-color .18s, box-shadow .18s; }
.field::placeholder { color: var(--text-subtle); }
.field:hover { border-color: var(--brand-300); }
.field:focus { outline: none; border-color: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-soft); }
```

### 可复制话术行 CopyItem
```css
.copy-item { display:flex; gap:12px; align-items:flex-start;
  padding:14px 16px; border:1px solid var(--border); border-radius: var(--radius);
  background: var(--glass); transition: border-color .18s, background .18s; }
.copy-item:hover { border-color: var(--accent); background: var(--accent-soft); }
.copy-btn { color: var(--brand-300); font-weight:600; white-space:nowrap; }
.copy-btn[data-copied="true"] { color: var(--success); }
```

---

## 5. Layout Principles

- **页面背景**:`body` 用 `--bg-0` 打底,Hero 区叠 `--bg-gradient-hero` 径向光 + 四角暗角(vignette),聚焦中央。
- **容器**:移动 100% − 32px padding;桌面正文区 `max-width: 720px` 居中(工具不需要宽屏,窄列更聚焦);首页 Hero 内容区可至 `1100–1200px`。
- **间距梯度**(8pt 基准):4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96。
- **导航**:浮动玻璃胶囊,水平居中,而非贴边长条(FlowFi 关键特征)。
- **结果页区块纵向堆叠**,区块间距 24px(移动)/ 32px(桌面)。
- **风险等级卡永远置顶**,是用户第一眼焦点。
- 移动端单列;桌面端单列居中(不分栏,保持线性阅读)。

---

## 6. Depth & Elevation

深色 + 玻璃 + 发光取代浅色阴影。三种深度手段:**模糊层级、阴影、蓝色发光(glow)**。

| 层级 | 用途 | 效果 |
|---|---|---|
| 0 | 页面底 | `--bg-0` + 暗角 |
| 1 | 玻璃卡片静止 | `0 20px 60px rgba(0,0,0,.45)` + `inset 0 1px 0` 高光边 |
| 2 | 卡片 hover | 同上 + `translateY(-2px)` + 描边提亮 |
| 3 | 主按钮 / CTA | `0 8px 30px rgba(47,128,237,.45)` 蓝色发光 |
| 4 | 发光焦点(宝珠 / 检测中动画) | `0 0 80px rgba(91,124,255,.55)` |
| 5 | 弹窗 / 浮层 | `0 24px 70px rgba(0,0,0,.55)` |

**glow 纪律**:发光要**低透明度、大模糊半径、克制**。一旦过曝或过饱和立刻显俗。

---

## 7. Animation & Interaction(档位 L2)

**依赖**:纯 CSS + IntersectionObserver(不引 GSAP)。

```css
/* 入场:fadeInUp,结果页各区块滚动进入时 stagger */
@keyframes fadeInUp { from { opacity:0; transform: translateY(16px); } to { opacity:1; transform: none; } }
.reveal { opacity:0; }
.reveal.in { animation: fadeInUp .5s cubic-bezier(.22,.61,.36,1) forwards; }
/* stagger:inline --i 控制 delay: calc(var(--i)*70ms) */

/* 风险等级卡入场:轻微 scale 弹入,但克制(block 不抖动不闪) */
@keyframes riskPop { from { opacity:0; transform: scale(.96); } to { opacity:1; transform: none; } }
.risk-card.in { animation: riskPop .45s cubic-bezier(.34,1.4,.64,1) forwards; }

/* 首页渐变文字流动 */
@keyframes gradientFlow { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
.grad-text { background: var(--grad-text); background-size:200% auto;
  -webkit-background-clip:text; background-clip:text; color:transparent;
  animation: gradientFlow 6s ease infinite; font-style: italic; }

/* 复制成功:sparkle */
@keyframes pop { 0%{transform:scale(1)} 40%{transform:scale(1.18)} 100%{transform:scale(1)} }
.copy-btn[data-copied="true"] .icon { animation: pop .35s ease; }

/* 发光焦点呼吸(宝珠 / loading)——极缓慢,克制 */
@keyframes orbBreath { 0%,100%{box-shadow:0 0 60px rgba(var(--orb-glow),.45)} 50%{box-shadow:0 0 90px rgba(var(--orb-glow),.6)} }
.orb { animation: orbBreath 4s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  *, .reveal.in, .risk-card.in, .grad-text, .orb {
    animation: none !important; opacity: 1 !important; transform: none !important; }
  .reveal { opacity: 1 !important; }
  .grad-text { color: var(--brand-300); }
}
```

**L2 必含动效落点**:
1. 首页 H1 — 渐变流动文字(关键词 蓝→紫)
2. 区块 H2 — 滚动进入 fadeInUp
3. 正文 / 标签 — stagger reveal
4. 元素级 — 主按钮磁吸上浮 + 复制 sparkle
5. 交互构件 — 风险卡 riskPop 入场
6. 背景 — 首页径向蓝光晕 + 淡网格 + 可选发光焦点元素(宝珠 / 抽象球,缓慢呼吸)

**loading 态**:检测中用三段式文案轮播("正在识别风险信号 → 正在生成报告 → 正在生成追问话术")+ 一个发光脉冲点 / 缓慢旋转的小光球,不要花哨大 spinner。

---

## 8. Do's and Don'ts

**Do**:
1. 背景用带蓝调的深色(`#070B14`/`#0E1A2B`)+ 暗角,不用纯黑。
2. 主操作 CTA 用蓝→紫渐变全圆角胶囊 + 蓝色发光。
3. 卡片玻璃化(半透明 + `backdrop-filter` + 浅描边 + 顶部高光边)。
4. 风险等级卡永远第一屏可见,四档语义色严格(深底用高饱和文字/描边 + 12% 透明底)。
5. 高危原文必须高亮,让用户"看见证据"。
6. 配色锁在 蓝 / 紫 / 青 + 四档风险色,移动端先行,触摸目标 ≥ 44px。
7. 措辞克制:说"高风险信号",不说"诈骗"。
8. 复制成功给即时反馈(变绿 + sparkle + "已复制")。
9. `block` 等级用稳重的红 + 清晰建议,传达"认真"而非"惊悚"。

**Don't**:
1. ❌ 不用纯黑 `#000` 背景(发闷掉档次),不用浅色 / 暖色基底。
2. ❌ 不用 emoji 表达风险等级(🚨💀),会消解可信度。
3. ❌ 风险橙 `--risk-high` 和品牌蓝紫不可混用同一元素。
4. ❌ `block` 警告不闪烁、不抖动、不红屏——克制才可信。
5. ❌ 不用实心不透明卡片(丢了玻璃感就丢了高级感)。
6. ❌ glow 不过曝、不过饱和;阴影不硬不纯黑生硬边。
7. ❌ 不引入暖色 / 高饱和橙红绿装饰,破坏深蓝氛围。
8. ❌ CTA 不用直角 / 小圆角(立刻廉价),一律全圆角胶囊。
9. ❌ 不硬编码颜色 hex,一律走 CSS 变量。
10. ❌ 不让动画拖慢"看报告",单次 reveal ≤ 0.5s。

---

## 9. Responsive Behavior

| 断点 | 行为 |
|---|---|
| ≤ 600px(移动,主战场) | 单列;容器左右 16px;H1 36px;按钮全宽;可选信息字段折叠为手风琴;导航胶囊收为汉堡 |
| 601–1024px(平板) | 单列居中,max-width 640px |
| ≥ 1025px(桌面) | 单列居中,max-width 720px;首页 Hero H1 72px;可选信息字段两列网格 |

- 所有触摸目标 ≥ 44×44px。
- 移动端无横向溢出(高亮长词 `box-decoration-break: clone` + `word-break`)。
- `prefers-reduced-motion` 全量降级(§7)。
- **深色为唯一主题**:本版即深色,`prefers-color-scheme: light` 第一版不做浅色(保持单一高级外观,避免风险色在浅背景下重新校验)。
- 玻璃模糊兜底:不支持 `backdrop-filter` 的浏览器,玻璃面回退为 `--bg-soft` 不透明底 + 描边。

---

*Style reverse-engineered from FlowFi (Dark Glassmorphism Fintech reference). Motion effects derived from [vue-bits](https://github.com/DavidHDev/vue-bits) by DavidHDev (MIT).*
