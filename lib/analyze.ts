// 分析编排层：规则引擎 + LLM → 最终 RiskReport
//
// 健壮性是第一原则：
//   规则引擎的结果是"硬事实"，永远可用；LLM 只负责锦上添花。
//   只要 LLM 失败/超时/返回垃圾，就用规则库内置文案兜底，产品照常出结果。

import { score, LEVEL_LABEL, LEVEL_NOTE } from "./scoring";
import { RULES } from "./rules";
import { buildMessages } from "./prompt";
import { chatJSON, getLLMConfig, LLMError, type LLMConfig } from "./llm";
import type { RiskReport, ScoringResult, JobType, RiskTag, AskQuestion, RiskLevel } from "./types";

export interface AnalyzeInput {
  text: string;
  jobType?: JobType;
  meta?: {
    jobTitle?: string;
    company?: string;
    salary?: string;
    city?: string;
    identity?: string;
  };
}

export interface AnalyzeResult {
  report: RiskReport;
  /** 本次结果是否用了 LLM；false 表示纯规则兜底 */
  llmUsed: boolean;
  /** 若 LLM 失败，记录原因（用于日志/调试，不必展示给用户） */
  llmError?: string;
}

/** LLM 返回的可解析部分（其余字段一律以规则引擎为准） */
export interface LLMPart {
  /** LLM 主判的整体等级，只能在规则下限之上升级 */
  assessedLevel?: string;
  riskReasons?: { tag: string; evidence: string; explanation: string; suggestion: string }[];
  /** 兼容 LLM 可能返回 string 或 {q,why} 两种形态 */
  questionsToAsk?: (string | { q?: string; why?: string })[];
  verificationChecklist?: string[];
  privacyWarning?: string[];
  summary?: string;
}

/** 从模型返回文本中尽力抽取 JSON（容忍 ```json 包裹、前后噪声） */
function extractJSON(raw: string): LLMPart | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as LLMPart;
  } catch {
    return null;
  }
}

const arr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "") : [];

/** 把 LLM 的话术（string 或 {q,why}）规整成 AskQuestion[]，丢弃空项 */
function normalizeQuestions(v: LLMPart["questionsToAsk"]): AskQuestion[] {
  if (!Array.isArray(v)) return [];
  const out: AskQuestion[] = [];
  for (const item of v) {
    if (typeof item === "string") {
      if (item.trim()) out.push({ q: item.trim() });
    } else if (item && typeof item.q === "string" && item.q.trim()) {
      const why = typeof item.why === "string" && item.why.trim() ? item.why.trim() : undefined;
      out.push({ q: item.q.trim(), why });
    }
  }
  return out;
}

/** 纯规则兜底报告：不依赖 LLM 也能完整渲染 */
export function fallbackReport(s: ScoringResult): RiskReport {
  // 按标签聚合命中证据
  const byTag = new Map<RiskTag, { evidence: string[]; rule: (typeof RULES)[number] }>();
  for (const h of s.hits) {
    const cur = byTag.get(h.rule.tag);
    if (cur) {
      if (!cur.evidence.includes(h.matchedText)) cur.evidence.push(h.matchedText);
    } else {
      byTag.set(h.rule.tag, { evidence: [h.matchedText], rule: h.rule });
    }
  }

  const riskReasons = Array.from(byTag.entries()).map(([tag, { evidence, rule }]) => ({
    tag,
    evidence: evidence.join("、"),
    explanation: `${rule.whyRisky}${rule.consequence}`,
    suggestion: rule.suggestion,
  }));

  const questions = buildQuestions(s);
  const checklist = buildChecklist(s);
  const privacyWarning = buildPrivacyWarning(s);

  return {
    riskLevel: s.level,
    riskScore: s.score,
    riskTags: s.tags,
    highlightedPhrases: s.highlightedPhrases,
    riskReasons,
    questionsToAsk: questions.slice(0, 5),
    verificationChecklist: checklist,
    privacyWarning,
    summary: buildSummary(s),
  };
}

/**
 * 规则兜底话术。话术强度与风险等级挂钩（见 prompt.ts 的"分级原则"）：
 * - low：不推试探话术，改推"问了加分"的常规面试问题；
 * - 其他等级：用规则种子话术 + 通用核实话术，并附"为什么这么问不冒犯"。
 * 每条都带 why，目的是让用户敢发——正规岗位本就经得起这些问题。
 */
function buildQuestions(s: ScoringResult): AskQuestion[] {
  if (s.level === "low") {
    return [
      { q: "想了解下这个岗位的薪资构成是怎样的？固定薪、绩效和补贴大概各占多少？", why: "薪资构成是面试常规问题，问清楚反而显得你认真、专业。" },
      { q: "请问这个岗位的转正/考核标准大概是什么？", why: "关心成长路径是正向信号，正规公司乐于回答。" },
      { q: "方便介绍下团队规模和这个岗位日常主要负责的工作内容吗？", why: "了解工作内容是求职者本该问的，不会让人反感。" },
    ];
  }

  // 从命中规则收集种子话术，去重
  const seeds = Array.from(new Set(s.hits.flatMap((h) => h.rule.questions ?? [])));
  // 给种子话术配一句通用的"why"，打消顾虑
  const reassure =
    s.level === "block" || s.level === "high"
      ? "正规公司不会因为你礼貌地问这些而态度变差；会因此为难你的，本身就值得留意。"
      : "这是入职前的合理询问，正规公司都会正面回答，不会因此减分。";

  const out: AskQuestion[] = seeds.map((q) => ({ q, why: reassure }));

  if (out.length === 0) {
    out.push(
      { q: "请问该岗位是否需要缴纳任何押金、培训费或保证金？", why: "正规岗位入职不收费，问清楚是对自己负责，不会冒犯对方。" },
      { q: "请问是否可以通过招聘平台或公司企业邮箱继续沟通？", why: "走正规渠道沟通是合理要求，正规公司不会拒绝。" },
      { q: "请问入职后是否签订正式的劳动合同或实习协议？", why: "确认签约是求职者的基本权利，问了完全合理。" },
    );
  }
  return out;
}

function buildChecklist(s: ScoringResult): string[] {
  const base = [
    "核验公司全称与统一社会信用代码（企查查/天眼查/爱企查）",
    "搜索“公司名 + 避雷”“公司名 + 投诉”“公司名 + 不发工资”",
    "确认入职是否签订劳动合同或实习协议",
  ];
  const tags = new Set(s.tags);
  if (tags.has("收费/押金风险") || tags.has("培训贷/招转培风险")) {
    base.push("搜索“公司名 + 培训贷”“公司名 + 收费”，确认是否需要任何付费");
  }
  if (tags.has("面试地址异常")) {
    base.push("确认面试地址是否为公司正式办公地址，并提前告知亲友");
  }
  if (tags.has("刷单返利风险") || tags.has("下载陌生App风险")) {
    base.push("不下载来历不明的 App，不在任何 App 内充值或垫付");
  }
  return base.slice(0, 7);
}

function buildPrivacyWarning(s: ScoringResult): string[] {
  const tags = new Set(s.tags);
  const out: string[] = [];
  if (tags.has("隐私信息索取风险")) {
    out.push("绝不向任何人提供短信验证码、银行卡密码或进行刷脸验证。");
    out.push("正式录用并签约前，不提供身份证照片、银行卡号、详细家庭住址。");
  }
  if (tags.has("收费/押金风险") || tags.has("刷单返利风险")) {
    out.push("在完成核验前，不向招聘方支付任何费用、不垫付、不转账。");
  }
  if (out.length === 0) {
    out.push("在完成核验前，不建议提供身份证照片、银行卡号、验证码或进行任何转账。");
  }
  return out;
}

function buildSummary(s: ScoringResult): string {
  if (s.locked) {
    return `该内容命中"${s.tags.join("、")}"等高危信号，${LEVEL_NOTE.block} 在确认安全前请勿付款、转账或提供敏感信息。`;
  }
  if (s.level === "high") {
    return `该岗位命中多个风险信号（${s.tags.join("、")}），建议先用安全话术问清，完成核验后再决定是否继续。`;
  }
  if (s.level === "verify") {
    return `该岗位存在需核实的信息点（${s.tags.join("、")}），建议追问清楚后再继续，期间不要提供敏感信息。`;
  }
  return LEVEL_NOTE.low;
}

// 等级排序 & 合法风险标签集合（用于约束 LLM 主判结果）
const LEVELS: RiskLevel[] = ["low", "verify", "high", "block"];
const LEVEL_ORDER: Record<RiskLevel, number> = { low: 0, verify: 1, high: 2, block: 3 };
const VALID_TAGS = new Set<RiskTag>([
  "收费/押金风险", "培训贷/招转培风险", "刷单返利风险", "站外沟通风险",
  "下载陌生App风险", "隐私信息索取风险", "高薪低门槛", "岗位描述空泛",
  "合同/协议不明确", "面试地址异常", "企业信息不完整", "兼职日结高风险",
  "境外高薪风险", "两卡/账户出借风险",
  "传销风险", "扣押证件风险", "色情招聘风险", "试用期违规风险", "就业歧视",
]);

/** 把 LLM 的 assessedLevel 收敛到 [规则下限, block]：只升不降；locked 强制 block */
function resolveLevel(s: ScoringResult, assessed?: string): RiskLevel {
  if (s.locked) return "block";
  const floor = s.level;
  const a = assessed as RiskLevel;
  if (!LEVELS.includes(a)) return floor; // 非法/缺失 → 用规则下限
  return LEVEL_ORDER[a] > LEVEL_ORDER[floor] ? a : floor; // 只允许升级
}

/** 等级变化后重算展示用风险分（与 scoring.computeScore 同口径，便于环形展示一致） */
function scoreForLevel(level: RiskLevel, hitCount: number, tagCount: number): number {
  const base: Record<RiskLevel, number> = { low: 10, verify: 40, high: 70, block: 90 };
  let v = base[level];
  v += Math.min(hitCount * 2, 10);
  v += Math.min(tagCount * 3, 12);
  return Math.min(100, v);
}

/**
 * 合并 LLM 主判与规则事实：
 * - 等级：LLM 只能在规则下限之上升级，locked 锁定 block；
 * - 标签：规则命中的恒保留，LLM 可新增（须有 evidence 且为合法标签）；
 * - 高亮：规则命中的高亮保留，LLM 新增标签的证据并入高亮。
 */
export function mergeReport(s: ScoringResult, llm: LLMPart): RiskReport {
  const fb = fallbackReport(s);
  const ruleTags = new Set<string>(s.tags);

  // riskReasons：规则命中标签 + LLM 新增（须合法标签 + 有证据，防编造）
  let reasons = (llm.riskReasons ?? [])
    .filter((r) => {
      if (!r || !r.explanation?.trim()) return false;
      if (ruleTags.has(r.tag)) return true; // 规则已命中：放行
      // LLM 新增标签：必须是合法标签且带原文证据
      return VALID_TAGS.has(r.tag as RiskTag) && !!String(r.evidence ?? "").trim();
    })
    .map((r) => ({
      tag: r.tag as RiskTag,
      evidence: String(r.evidence ?? ""),
      explanation: String(r.explanation),
      suggestion: String(r.suggestion ?? ""),
    }));
  // 若 LLM 漏了某些规则命中标签，用兜底补齐
  const covered = new Set(reasons.map((r) => r.tag));
  for (const r of fb.riskReasons) {
    if (!covered.has(r.tag)) reasons.push(r);
  }
  if (reasons.length === 0) reasons = fb.riskReasons;

  // 最终标签 = 规则标签 ∪ LLM 新增（保持规则在前）
  const finalTags = Array.from(new Set<RiskTag>([...s.tags, ...reasons.map((r) => r.tag)]));
  const llmAddedTags = finalTags.filter((t) => !ruleTags.has(t));

  // 等级：LLM 主判（只升不降）
  const level = resolveLevel(s, llm.assessedLevel);

  // 高亮：规则高亮 + LLM 新增标签的证据
  const llmEvidence = reasons
    .filter((r) => llmAddedTags.includes(r.tag) && r.evidence.trim())
    .map((r) => r.evidence.trim());
  const highlightedPhrases = Array.from(
    new Set([...s.highlightedPhrases, ...llmEvidence]),
  );

  const score = scoreForLevel(level, s.hits.length, finalTags.length);

  const questions = normalizeQuestions(llm.questionsToAsk);
  const checklist = arr(llm.verificationChecklist);
  const privacy = arr(llm.privacyWarning);

  return {
    riskLevel: level, // LLM 主判（不低于规则下限）
    riskScore: score,
    riskTags: finalTags, // 规则 ∪ LLM 新增
    highlightedPhrases,
    riskReasons: reasons,
    questionsToAsk: (questions.length ? questions : fb.questionsToAsk).slice(0, 5),
    verificationChecklist: (checklist.length ? checklist : fb.verificationChecklist).slice(0, 7),
    privacyWarning: privacy.length ? privacy : fb.privacyWarning,
    summary: llm.summary?.trim() || fb.summary,
  };
}

/**
 * 主入口。
 * @param input 用户输入
 * @param cfg   可注入 LLM 配置（测试用）；不传则读环境变量
 */
export async function analyze(
  input: AnalyzeInput,
  cfg?: LLMConfig,
): Promise<AnalyzeResult> {
  const jobType = input.jobType ?? "未知";
  const s = score(input.text, jobType);

  // 规则兜底永远先备好
  const fb = fallbackReport(s);

  try {
    const messages = buildMessages({ text: input.text, jobType, scoring: s, meta: input.meta });
    const raw = await chatJSON(messages, cfg ?? getLLMConfig());
    const parsed = extractJSON(raw);
    if (!parsed) {
      return { report: fb, llmUsed: false, llmError: "LLM 返回无法解析为 JSON" };
    }
    return { report: mergeReport(s, parsed), llmUsed: true };
  } catch (err) {
    const msg = err instanceof LLMError ? `${err.kind}: ${err.message}` : String(err);
    return { report: fb, llmUsed: false, llmError: msg };
  }
}
