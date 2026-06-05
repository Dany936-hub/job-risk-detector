# 岗位避坑检测器

面向年轻求职者的招聘风险提示工具：粘贴岗位描述 / 招聘聊天内容（或上传截图），识别收费陷阱、培训贷、刷单返利、站外引流、境外高薪、两卡等高危信号，生成可复制的安全追问话术与核验清单。

> 本工具做的是**话术风险体检**，不做**公司背景调查**；只提供风险提示，不对任何公司或岗位做真假定性。

## 快速开始

```bash
npm install
cp .env.local.example .env.local   # 填入 LLM API Key
npm run dev                        # http://localhost:3000
```

环境变量见 `.env.local.example`。核心：
- `DEEPSEEK_API_KEY`（默认 LLM，文字分析）
- `QWEN_VL_API_KEY`（截图 OCR，视觉模型；不填则"上传截图识别"不可用）

## 判级架构（重要）

两层协同，**安全优先**：

1. **规则层（`lib/rules.ts` + `lib/scoring.ts`）**：确定性关键词规则，决定风险等级的**下限**。含「反规避归一化」，能识别 `押·金`、`保 证 金` 这类拆字/插符绕过。
2. **LLM 主判（`lib/prompt.ts` + `lib/analyze.ts`）**：结合官方知识库语义判断，**只能在规则下限之上升级，绝不能下调**；规则锁定的高危（`floor:block`）不可被下调。
3. **LLM 失败时**自动回退到纯规则兜底，产品照常出结果。

风险知识库（`app/knowledge/data.ts`）是单一数据源：既在 `/knowledge` 页展示，又喂给 LLM 作判断依据。全部来自人社部、公安部、最高检、教育部等官方公开发布，逐条可溯源。

## 验证体系（如何证明"判得多准"）

验证集衡量对**已知套路**的识别力（样本基于官方案例手法构造，非真实抓取数据，不等同真实世界准确率）。

```bash
npm run eval        # 规则层评测：确定性、零成本、可进 CI
npm run eval:llm    # 全链路评测：含真 LLM，会消耗 token、结果有随机性
```

- 样本：`scripts/eval-cases.ts`（43 条，含 高危 / 正常 / 边界 / 改写绕过 四类）
- 评测器：`scripts/eval.ts`，输出三个关键指标：

| 指标 | 含义 | 当前基线（全链路，DeepSeek） |
| --- | --- | --- |
| **高危漏报率** | 真高危被判成低于 high（最致命） | **0%**（25/25） |
| **正常误报率** | 正常岗被判出风险（伤信任） | **0%**（9/9） |
| 分级完全一致 | 等级与标注完全一致 | ~60%（偏差多为"判得更严"，非漏报） |

> 改了规则 / prompt / 知识库后，务必重跑 `npm run eval:llm` 看漏报率是否回升。

## 防回归闸门

`npm run build` 前会自动执行 `npm run check`（= 单元测试 + 规则层 eval）。
**任一高危样本掉到其标注下限以下，构建直接失败**——漏报无法偷偷溜回。

```bash
npm run check       # 单独跑闸门：test:scoring + test:analyze + eval（规则层）
```

注意：CI 闸门只守**规则层**（确定性）。LLM 层漏报靠 `npm run eval:llm` 手动盯（它有随机性，不宜进强制闸门）。

## 来源死链巡检

知识库来源是官方 URL，会随官网改版失效。`npm run check:links` 遍历 `SOURCES` 所有链接：

```bash
npm run check:links   # 发现确认死链(404/连接失败)则退出码 1
```

- 404/410/连接失败 = **死链**（退出码 1，需更换来源）。
- 403/429/521/超时 = **可疑**（多为政府站反爬或抖动，非真死，仅告警，需人工在浏览器复核）。

依赖外网，**不进 build 强制闸门**，适合手动或定时 CI（如每周）运行。发现死链后更新 `app/knowledge/data.ts` 的 URL，可优先选中央部委本部官网（更稳）。

## 时效性提醒

知识库内容是**人工核实维护**的（不做自动抓取并入——那与"可溯源、不捏造"冲突）。`npm run check:freshness` 在 `KB_UPDATED`（`app/knowledge/data.ts`）距今过久时告警：

```bash
npm run check:freshness              # 超 6 个月则退出码 1
KB_MAX_MONTHS=3 npm run check:freshness
```

它**不改内容**，只提醒"该去复查官方有没有新发布了"。适合定时 CI（如每月）。复核更新流程见脚本输出与下方维护准则。

## 测试 / 脚本一览

| 命令 | 作用 |
| --- | --- |
| `npm run check` | 防回归闸门（build 前自动跑） |
| `npm run test:scoring` | 判级引擎单元测试 |
| `npm run test:analyze` | 分析编排层 + LLM 主判契约测试 |
| `npm run eval` / `eval:llm` | 验证集评测（规则层 / 全链路） |
| `npm run smoke` | 真实 LLM 冒烟（需 API Key） |

## 维护准则

- **扩知识库**：只收录能在官方 / 政府官网核实的内容，措辞贴近原文，不编造文件名或条款。来源链接易失效，调整时只改 `app/knowledge/data.ts`。
- **加规则**：在 `lib/rules.ts` 追加规则对象即可，无需改判级引擎；新增风险标签需同步 `lib/types.ts`、`lib/analyze.ts`(VALID_TAGS)、`components/risk-meta.ts`。
- **改判级逻辑后**：先 `npm run eval` 看规则层，再 `npm run eval:llm` 看真实漏报率。
