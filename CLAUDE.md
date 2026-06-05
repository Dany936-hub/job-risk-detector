# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

岗位避坑检测器（job-risk-detector）：Next.js 14 App Router 应用，面向年轻求职者，对粘贴的岗位描述/招聘聊天（或上传截图 OCR）做**话术风险体检**，识别收费陷阱、培训贷、刷单、站外引流、境外高薪、两卡等信号，输出风险等级 + 追问话术 + 核验清单。

产品红线（写代码/prompt 时必须守）：只做**风险提示**，不做**公司真伪定性**。禁止输出"诈骗/骗局/骗子/违法/这家公司是假的"等定性词——见 `lib/prompt.ts` 的 `sanitize()` 与 SYSTEM 第 3 条。

## 常用命令

```bash
npm run dev            # 本地开发 http://localhost:3000
npm run build          # 构建（prebuild 会自动跑 npm run check 防回归闸门）
npm run check          # 闸门：test:scoring + test:analyze + eval（规则层，确定性、零成本）
npm run test:scoring   # 判级引擎单元测试
npm run test:analyze   # 分析编排层 + LLM 主判契约测试
npm run eval           # 验证集评测（仅规则层）
npm run eval:llm       # 验证集评测（全链路，含真 LLM，消耗 token、有随机性）
npm run smoke          # 真实 LLM 冒烟（需 API Key）
npm run check:links    # 知识库来源死链巡检（依赖外网，不进闸门）
npm run check:freshness # 知识库时效告警（KB_UPDATED 超 6 个月退出码 1）
```

脚本全部用 `tsx` 直接跑 TypeScript（见 `scripts/`），无需预编译。

环境变量：`cp .env.local.example .env.local`，核心 `DEEPSEEK_API_KEY`（默认文字分析）、`QWEN_VL_API_KEY`（截图 OCR，不填则上传识别不可用）。`LLM_PROVIDER=deepseek|qwen` 切换文字模型。

## 核心架构：两层判级（安全优先）

风险等级由**规则层（确定性下限）+ LLM 主判（只升不降）**协同决定。这是全项目最重要的不变式，改任何判级相关代码都要守住：

1. **规则层** `lib/rules.ts` + `lib/scoring.ts`
   - `RULES` 是关键词规则数组，每条带 `severity`、可选 `floor:"block"`、`negators`、`contextBlock`、`ctx`（按岗位类型升降档）。
   - `score()` 扫描 → 反误伤过滤（否定辖域 `negatedLeft` / 语境白名单 `nearAny`）→ 场景调节 → `floor:block` 锁定 → 组合升级 → 输出 `ScoringResult`（含 `level` 下限、`locked`、命中明细、正向信号）。
   - **反规避归一化**：`denoise()` 去掉字符间插入的 `·`/空格/`*-_~` 等噪声后二次扫描，识别 `押·金`、`保 证 金` 这类拆字绕过。
   - `locked`（命中 `floor:block`）= 硬高危，LLM 与正向信号都无权下调。

2. **LLM 主判** `lib/prompt.ts` + `lib/analyze.ts`
   - `buildMessages()` 把 `ScoringResult` 当"既定事实"喂给 LLM，连同知识库（判断依据）。
   - LLM 返回 `assessedLevel`，`resolveLevel()` 收敛到 `[规则下限, block]`：**只升不降**，`locked` 强制 `block`。
   - `mergeReport()` 合并：规则命中标签恒保留，LLM 可新增标签（须有 evidence + 合法标签，防编造），高亮并入。

3. **LLM 失败兜底** `analyze()` 任何异常/解析失败 → `fallbackReport()` 纯规则渲染，产品照常出结果。`llmUsed:false` 标记。

**数据流**：`app/api/analyze/route.ts` → `analyze()` → `score()`（规则）+ `chatJSON()`（LLM）→ `mergeReport()` / `fallbackReport()` → `RiskReport`（前端渲染结构，见 `lib/types.ts`）。

### LLM 客户端 `lib/llm.ts`
DeepSeek 与 Qwen 都走 OpenAI 兼容 `/chat/completions`，同一套 fetch：强制 `response_format: json_object`、AbortController 超时、对超时/5xx/网络错误重试一次（auth/4xx 不重试）。只返回原始字符串，业务 JSON 解析交给 `analyze.ts` 的 `extractJSON()`（容忍 ```json 包裹与噪声）。

## 知识库：单一数据源

`app/knowledge/data.ts` 同时驱动两处：`/knowledge` 页面展示 + 喂给 LLM 作判断依据（`prompt.ts` 的 `knowledgeBlock()`）。全部来自人社部/公安部/最高检/教育部等官方公开发布，逐条带 `SOURCES`（org/title/date/url）可溯源。维护原则：只收录能在官方官网核实的内容，措辞贴近原文，**不编造文件名或条款**。

## 修改时的硬性规矩

- **改了规则 / prompt / 知识库后**：先 `npm run eval`（规则层）再 `npm run eval:llm`（看真实漏报率是否回升）。CI 闸门只守规则层确定性；LLM 漏报靠 `eval:llm` 手动盯（随机性，不进强制闸门）。
- **新增风险标签**：要同步四处——`lib/types.ts`（`RiskTag`）、`lib/analyze.ts`（`VALID_TAGS`）、`components/risk-meta.ts`、对应规则的 `tag`。
- **加规则**：只在 `lib/rules.ts` 追加规则对象即可，无需改判级引擎。
- **改 `floor:block` / 严重度 / 否定逻辑**：高危漏报是最致命的失败模式。`npm run check` 中任一高危样本掉到标注下限以下，构建直接失败。
- **隐私**：API 不回传/不保存用户原文与上传图片（`analyze` 路由只返回 report，OCR 识别完即丢）。改 API 时保持。

## 验证集

`scripts/eval-cases.ts`（43 条：高危/正常/边界/改写绕过四类），`scripts/eval.ts` 输出三指标：高危漏报率（最致命，基线 0%）、正常误报率（基线 0%）、分级完全一致（~60%，偏差多为"判得更严"）。
