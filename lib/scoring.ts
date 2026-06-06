// 岗位避坑检测器 —— 判级引擎
//
// 职责：扫描原文 → 命中规则 → 反误伤过滤 → 场景调节 → floor 锁定 → 组合升级
//        → 输出整体风险等级"下限"（ScoringResult）。
//
// 该结果作为约束传给 LLM：LLM 可在"不低于此下限"的前提下补充解释与话术，
// 但 locked=true（floor:block 命中）时，LLM 无权下调等级。

import { RULES, COMBO_RULES } from "./rules";
import type {
  RiskRule,
  RuleHit,
  ScoringResult,
  Severity,
  RiskLevel,
  JobType,
  RiskTag,
} from "./types";

// 严重度 / 等级排序，便于取最大值与升降档
const ORDER: Record<Severity, number> = { low: 0, verify: 1, high: 2, block: 3 };
const LEVELS: RiskLevel[] = ["low", "verify", "high", "block"];

/** 邻近窗口大小：命中词前后多少字符内查找否定词/白名单词 */
const WINDOW = 12;

function bump(sev: Severity, delta: number): Severity {
  const i = Math.max(0, Math.min(LEVELS.length - 1, ORDER[sev] + delta));
  return LEVELS[i] as Severity;
}

/** 检查命中位置前后窗口内是否含有任一词（用于语境白名单 contextBlock） */
function nearAny(text: string, index: number, len: number, words?: string[]): boolean {
  if (!words || words.length === 0) return false;
  const start = Math.max(0, index - WINDOW);
  const end = Math.min(text.length, index + len + WINDOW);
  const window = text.slice(start, end);
  return words.some((w) => window.includes(w));
}

/** 否定辖域最大回看长度（字符） */
const NEGATOR_WINDOW = 10;
/**
 * 句子边界标点：否定辖域不跨越这些符号。
 * 注意：顿号"、"是并列连接符（如"无需押金、保证金"中否定辖域延续），
 * 故不计入边界；仅逗号/句号/分号等才截断否定辖域。
 */
const BOUNDARY = /[，。；！？,.;!?\n]/;

/**
 * 否定检测（基于中文否定辖域）：
 * 在命中词左侧最多 NEGATOR_WINDOW 字符内查找否定词，
 * 但要求否定词与命中词之间**不存在句子/短语边界标点**——
 * 即二者属于同一否定短语。
 *
 * 这样 "无需缴纳任何押金"（中间无标点）→ 判为否定；
 * 而 "无需经验高薪，加微信详聊"（中间有逗号）→ 不跨越，正常命中。
 */
function negatedLeft(text: string, index: number, words?: string[]): boolean {
  if (!words || words.length === 0) return false;
  const start = Math.max(0, index - NEGATOR_WINDOW);
  const left = text.slice(start, index); // 命中词左侧，不含命中词本身
  for (const w of words) {
    const at = left.lastIndexOf(w);
    if (at === -1) continue;
    // 否定词结尾到命中词之间的文本，不能含边界标点
    const between = left.slice(at + w.length);
    if (!BOUNDARY.test(between)) return true;
  }
  return false;
}

/** 扫描单条规则在文本中的所有命中（已做反误伤过滤） */
function scanRule(
  rule: RiskRule,
  text: string,
  jobType: JobType,
): { hits: RuleHit[]; positives: string[] } {
  const hits: RuleHit[] = [];
  const positives: string[] = [];

  for (const pattern of rule.patterns) {
    if (!pattern) continue;
    let from = 0;
    let idx = text.indexOf(pattern, from);
    while (idx !== -1) {
      // 反误伤第一层：左侧紧邻否定词 → 不计风险，转为正向信号
      if (negatedLeft(text, idx, rule.negators)) {
        positives.push(`已主动澄清：${pattern}（左侧含否定词，如“无需…”）`);
      }
      // 反误伤第二层：语境白名单 → 跳过（正常语境）
      else if (nearAny(text, idx, pattern.length, rule.contextBlock)) {
        // 正常语境，不计风险也不计正向
      } else {
        // 真实命中
        let eff = rule.severity;
        // 场景调节
        if (rule.ctx && jobType !== "未知") {
          const delta = rule.ctx[jobType as Exclude<JobType, "未知">];
          if (typeof delta === "number") eff = bump(eff, delta);
        }
        hits.push({
          rule,
          matchedText: pattern,
          index: idx,
          effectiveSeverity: eff,
        });
      }
      from = idx + pattern.length;
      idx = text.indexOf(pattern, from);
    }
  }

  return { hits, positives };
}

/** 检测正向可信信号（独立于具体规则） */
const POSITIVE_SIGNALS: { patterns: string[]; label: string }[] = [
  { patterns: ["签订劳动合同", "签劳动合同", "签订实习协议", "签实习协议"], label: "明确承诺签订书面协议" },
  { patterns: ["企业邮箱", "公司邮箱", "@"], label: "提供企业邮箱沟通方式" },
  { patterns: ["统一社会信用代码"], label: "提供统一社会信用代码" },
  { patterns: ["无需任何费用", "不收取任何费用", "不收费", "免费培训"], label: "明确不收取费用" },
  { patterns: ["五险一金", "缴纳社保", "购买社保"], label: "提及五险一金/社保" },
];

function detectPositives(text: string): string[] {
  const out: string[] = [];
  for (const sig of POSITIVE_SIGNALS) {
    if (sig.patterns.some((p) => text.includes(p))) out.push(sig.label);
  }
  return out;
}

/**
 * 主入口：对原文判级。
 * @param text 用户粘贴的岗位描述/聊天内容
 * @param jobType 用户填写的岗位类型（可选，默认"未知"）
 */
/**
 * 反规避归一化：去掉夹在字符间的分隔噪声（中点·、空格、*-_~等），
 * 用于二次扫描，识别"押·金""保 证 金"这类拆字/插符绕过。
 * 仅用于"是否命中"的判定，不用于高亮（高亮仍以原文为准）。
 *
 * 注意：不剥离 "." 与 "/"——它们是正常文本的高频字符（3.5k、A/B、网址 t.cn/x），
 * 剥离会把它们重组成原文不存在的关键词造成误报；而拆字绕过实际几乎只用
 * 中点/空格/全角符号，故无需为此牺牲准确率。
 */
function denoise(text: string): string {
  return text.replace(/[·•・\s*\-_~|\\]+/g, "");
}

/** denoise 剥离的噪声字符集合（与 denoise 正则保持同步），用于在原文中定位带噪片段 */
const NOISE_CHAR = /[·•・\s*\-_~|\\]/;

/**
 * 在原文中定位被噪声打散的 pattern，返回其带噪原文片段与起始下标。
 * 例如原文含 "押·金"、pattern 为 "押金" → 返回 { snippet: "押·金", index }。
 * 用于让去噪补扫命中也能在结果页正确高亮、并展示真实原文证据（而非干净 pattern）。
 * 找不到（理论上不会，因为调用前已确认 denoise 后命中）则返回 null。
 */
function locateNoisy(text: string, pattern: string): { snippet: string; index: number } | null {
  for (let start = 0; start < text.length; start++) {
    let ti = start;
    let pi = 0;
    while (pi < pattern.length && ti < text.length) {
      if (text[ti] === pattern[pi]) {
        ti++;
        pi++;
      } else if (NOISE_CHAR.test(text[ti])) {
        ti++; // 跳过噪声字符
      } else {
        break; // 非噪声且不匹配 → 此 start 失败
      }
    }
    if (pi === pattern.length) {
      return { snippet: text.slice(start, ti), index: start };
    }
  }
  return null;
}

export function score(text: string, jobType: JobType = "未知"): ScoringResult {
  const allHits: RuleHit[] = [];
  const positivesSet = new Set<string>();

  // 1. 逐规则扫描
  for (const rule of RULES) {
    const { hits, positives } = scanRule(rule, text, jobType);
    allHits.push(...hits);
    positives.forEach((p) => positivesSet.add(p));
  }
  detectPositives(text).forEach((p) => positivesSet.add(p));

  // 1b. 反规避二次扫描：对去噪文本再扫一遍，只补"原文漏、去噪后命中"的，
  //     防止拆字/插符绕过关键词。命中证据用 pattern 本身（原文已被插符打散）。
  const cleaned = denoise(text);
  if (cleaned !== text) {
    const seen = new Set(allHits.map((h) => `${h.rule.id}::${h.matchedText}`));
    for (const rule of RULES) {
      for (const pattern of rule.patterns) {
        if (!pattern) continue;
        if (!cleaned.includes(pattern)) continue;
        if (text.includes(pattern)) continue; // 原文已能命中，跳过（避免重复/错位）
        // 否定词同样在去噪文本上判，避免“无需押·金”被误升级
        if (denoise(text).includes(`无${pattern}`) || rule.negators?.some((n) => cleaned.includes(`${n}${pattern}`))) {
          continue;
        }
        const key = `${rule.id}::${pattern}`;
        if (seen.has(key)) continue;
        seen.add(key);
        let eff = rule.severity;
        if (rule.ctx && jobType !== "未知") {
          const delta = rule.ctx[jobType as Exclude<JobType, "未知">];
          if (typeof delta === "number") eff = bump(eff, delta);
        }
        // 用原文里被打散的真实片段作为证据/高亮锚点，使结果页能正确高亮（indexOf 命中）
        const located = locateNoisy(text, pattern);
        allHits.push({
          rule,
          matchedText: located?.snippet ?? pattern,
          index: located?.index ?? -1,
          effectiveSeverity: eff,
        });
      }
    }
  }

  // 2. 整体等级下限 = 所有命中的最高有效严重度
  let level: RiskLevel = "low";
  for (const h of allHits) {
    if (ORDER[h.effectiveSeverity] > ORDER[level]) level = h.effectiveSeverity;
  }

  // 3. floor=block 锁定
  const locked = allHits.some((h) => h.rule.floor === "block");
  if (locked) level = "block";

  const tags = Array.from(new Set(allHits.map((h) => h.rule.tag))) as RiskTag[];

  // 4. 组合升级：≥3 个不同标签 → 至少 high
  if (!locked && tags.length >= COMBO_RULES.multiTag.threshold) {
    if (ORDER[level] < ORDER[COMBO_RULES.multiTag.minLevel]) {
      level = COMBO_RULES.multiTag.minLevel;
    }
  }

  // 5. 催促叠加：催促词 + 收费/培训/站外命中 → 升一档（不突破 block）
  if (!locked) {
    const hasUrgency = COMBO_RULES.urgency.urgencyPatterns.some((p) => text.includes(p));
    const hasTrigger = tags.some((t) =>
      (COMBO_RULES.urgency.triggerTags as readonly string[]).includes(t),
    );
    if (hasUrgency && hasTrigger) {
      level = LEVELS[Math.min(LEVELS.length - 1, ORDER[level as Severity] + 1)];
    }
  }

  // 6. 正向信号软下调：仅在未锁定且为 verify 时，可降到 low（绝不下调 high/block）
  const positiveSignals = Array.from(positivesSet);
  if (!locked && level === "verify" && positiveSignals.length >= 2) {
    level = "low";
  }

  // 7. 启发式风险分（仅展示用）
  const score = computeScore(level, allHits, tags.length);

  // 去重高亮片段
  const highlightedPhrases = Array.from(new Set(allHits.map((h) => h.matchedText)));

  return {
    level,
    score,
    tags,
    hits: allHits,
    highlightedPhrases,
    positiveSignals,
    locked,
  };
}

function computeScore(level: RiskLevel, hits: RuleHit[], tagCount: number): number {
  const base: Record<RiskLevel, number> = { low: 10, verify: 40, high: 70, block: 90 };
  let s = base[level];
  // 每多一个命中 +2，每多一个标签 +3，上限 100
  s += Math.min(hits.length * 2, 10);
  s += Math.min(tagCount * 3, 12);
  return Math.min(100, s);
}

/** 等级中文展示文案（对齐 PRD 功能3） */
export const LEVEL_LABEL: Record<RiskLevel, string> = {
  low: "暂未发现明显风险信号",
  verify: "需核验",
  high: "高风险",
  block: "强烈建议暂停",
};

/** 等级配套的"未发现≠安全"等克制措辞 */
export const LEVEL_NOTE: Record<RiskLevel, string> = {
  low: "⚠️ 这段内容里没有出现典型诈骗话术，但不代表公司一定真实可靠——公司真伪与口碑仍需你自行核验。",
  verify: "存在需要追问核实的信息点，请用安全话术问清后再决定是否继续。",
  high: "命中多个典型高危信号，建议谨慎，完成核验前不要提供敏感信息或付款。",
  block: "涉及交钱、验证码、刷单、下载陌生 App 等高危行为，强烈建议立即暂停沟通。",
};
