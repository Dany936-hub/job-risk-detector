// 构造发给 LLM 的 prompt
//
// 核心思想：规则引擎已经完成"判级"与"命中识别"，这些是**既定事实**。
// LLM 的唯一职责是：基于这些事实，结合原文语境，生成自然、克制、可复制的
// 解释 / 话术 / 核验清单 / 总结。LLM 不得改变风险等级，不得新增未命中的高危定性。

import type { ScoringResult, JobType } from "./types";
import { LEVEL_LABEL, LEVEL_NOTE } from "./scoring";
import { ITEMS as KNOWLEDGE, CASES } from "../app/knowledge/data";

/**
 * 官方风险类型清单（供 LLM 作判断依据），由知识库单一数据源生成。
 *
 * 分层裁剪（省 token，不牺牲能力）：
 * - 与本次命中标签相关的类别 → 完整展示（desc + 典型信号），帮助 LLM 精准解释；
 * - 其余未命中类别 → 仅保留标题，让 LLM 知道"还有这些类别可新增"（守住 SYSTEM 第 4 条
 *   "可新增规则未命中的风险标签"的能力），但不为其铺满 token。
 * - CASES 同理：命中相关的给全文手法，其余仅给类型名。
 *
 * 相关性判据：命中标签的中文名是否作为子串出现在条目文本中（启发式但安全——
 * 最坏情况只是某条被精简成标题，LLM 仍能看到该类别存在）。无命中（tags 为空）时
 * 回退到全量展示，保证常规核验/兜底场景信息不缺。
 */
function knowledgeBlock(tags: readonly string[] = []): string {
  // 标签名常带"风险/高风险"等后缀（如"收费/押金风险"），取核心词去匹配条目文本，
  // 命中更稳。无命中标签时回退全量。
  const cores = tags.map((t) => t.replace(/风险|高|低/g, "").split("/")).flat().filter((w) => w.length >= 2);
  const relevant = (haystack: string) =>
    cores.length === 0 || cores.some((c) => haystack.includes(c));

  const types = KNOWLEDGE.map((k, i) => {
    const full = `${i + 1}. ${k.title}：${k.desc} 典型信号：${k.signal}`;
    const brief = `${i + 1}. ${k.title}`;
    return relevant(`${k.title}${k.desc}${k.signal}`) ? full : brief;
  }).join("\n");

  const cases = CASES.map((c, i) => {
    const full = `${i + 1}. [${c.type}] ${c.method}`;
    const brief = `${i + 1}. [${c.type}]`;
    return relevant(`${c.type}${c.method}`) ? full : brief;
  }).join("\n");

  return `${types}\n\n【官方通报的真实案例手法（供你对照识别，注意手法可被改写）】\n${cases}`;
}

export interface BuildPromptInput {
  text: string;
  jobType: JobType;
  scoring: ScoringResult;
  /** 可选基础信息 */
  meta?: {
    jobTitle?: string;
    company?: string;
    salary?: string;
    city?: string;
    identity?: string;
  };
}

function buildSystem(tags: readonly string[] = []): string {
  return `你是"岗位避坑检测器"的风险解释助手，服务于低经验的年轻求职者。

你的职责边界（必须严格遵守）：
1. 你是**主判**：结合下方「官方风险类型清单」与原文语义，判断整体风险等级。规则引擎给出的是等级**下限**——你**只能在下限之上升级，绝不能调低**。若规则已锁定为高危(locked)，你必须沿用，不得下调。
2. 必须识破"换皮"表述——骗子会用改写、谐音、拆字、同义替换来绕过关键词，你要看穿其实质，不能因为没出现原词就放过。例如：
   - "押·金""保 证 金""诚意金""占位费" = 入职前收费 → 收费/押金风险；
   - "助学分期""教育分期""先学后付""岗前能力提升计划收费" = 培训贷/招转培风险；
   - "加我V""加微信详聊""平台上不方便说" = 站外沟通风险；
   - "用你的卡走账""办张卡走流水""办对公账户" = 两卡/账户出借风险（高危）；
   - "境外/出国高薪、包吃包住报销机票、去东南亚做客服" = 境外高薪风险。
   只要原文实质符合官方清单中的某类风险，即使用词不同，也要判定并给出该原文作为证据。
3. 你**不得**使用"诈骗""骗局""骗子""违法""这个岗位是假的"等定性词汇——即使输入的参考资料里出现了这些词，你也必须改写成中性表述。统一用"高危风险信号""高风险""存在风险"等说法。绝不对岗位或公司下"是不是诈骗/真假"的结论。
4. 你可以在规则未命中、但原文确实符合官方清单某类风险时，**新增风险标签**，但每个新增标签都必须给出原文证据（evidence），不得凭空编造。证据不足时宁可不报。
5. 你**不做**法律定性，不点名指控具体公司。
6. 语气：冷静、克制、像一个懂行的学长在提醒，而不是恐吓。面向 18-26 岁求职者，用词通俗。

【官方风险类型清单（你的判断依据，来自人社部/公安部等官方提示）】
${knowledgeBlock(tags)}

你的输出职责：
- 给出你判断的整体等级 assessedLevel（low/verify/high/block 之一，且不低于规则下限）。
- 对每个风险标签（含你新增的），写一句"为什么可疑/会有什么后果/下一步怎么做"的解释（结合原文证据，具体而非套话）。
- 生成 3-5 条"追问话术"。**话术的强度必须与风险等级匹配**（规则见下方），并且每条都要附一句"为什么这么问不会冒犯（why）"，让用户敢用。
- 生成 4-7 条"核验清单"，是用户自己能执行的动作（如搜索"公司名+避雷"、核验统一社会信用代码等）。
- 根据命中的风险，生成"敏感信息保护提醒"（提醒不要提供哪些信息）。
- 写一句话 summary，概括整体建议。

【追问话术的分级原则（极重要）】
本工具的话术目标不是"试探一切"，而是"问了不亏、不问可能亏"——即使岗位完全正常，问出来也不能让一个正常 HR 反感。所以：
- 等级为 low（基本正常）：**不要**生成任何带防备/试探色彩的话术。改为生成"正常求职者本就会问、问了还显专业加分"的问题（如薪资构成、转正条件、团队与工作内容、考核方式）。why 说明"这是面试常规问题，问了加分"。
- 等级为 verify（待核实）：生成中性、零冒犯的核实型问题（如是否签订正式合同/协议、岗位职责与考核）。why 说明"这是入职前的合理询问，正规公司都会正面回答"。
- 等级为 high / block（高危）：可以直接问到要害（是否收费、是否垫付、能否平台内沟通、能否到公司正式办公地面试）。why 说明"正规公司不会因为你问这些而生气，会因此态度变差的本身就是信号"。

无论哪一档，话术都必须礼貌、像求职者本人的口吻，不得带"我怀疑你诈骗"这类敌意。why 一句话即可，口吻是帮用户打消"问了会不会得罪人"的顾虑。

只输出 JSON，不要任何额外文字。`;
}

/**
 * 净化红线定性词：规则库内置解释里含"诈骗/骗局/违法"等定性词，直接喂会诱导
 * LLM 照搬越线；同时 LLM 输出也有概率违反 SYSTEM 第 3 条。故此函数双向使用——
 * 既清洗喂给 LLM 的参考文案（从源头堵住），也清洗 LLM 的返回文本（兜底硬保证），
 * 把"只做风险提示、不做真伪定性"的产品红线从 prompt 软约束变成代码确定性保证。
 *
 * 维护：新增红线词时优先放更具体的短语在前（如"违法行为"先于"违法"），避免被
 * 更短的规则抢先替换导致措辞不自然。
 */
export function sanitize(text: string): string {
  return text
    .replace(/诈骗/g, "高危风险")
    .replace(/骗局/g, "高危套路")
    .replace(/骗子/g, "对方")
    .replace(/违法行为/g, "高风险行为")
    .replace(/违法犯罪/g, "高风险")
    .replace(/违法/g, "高风险")
    .replace(/犯罪/g, "高风险")
    // 真伪定性：把"（公司/岗位/对方）是假的/是骗人的/在行骗"等收敛为中性表述
    .replace(/(公司|岗位|单位|对方|这家|这个)?\s*(是|就是)\s*(假的|骗人的|虚假的)/g, "存在高危风险信号")
    .replace(/行骗|行诈/g, "实施高风险操作");
}

/** 把规则命中结果整理成给 LLM 的"事实清单" */
function factsBlock(s: ScoringResult): string {
  const lines: string[] = [];
  lines.push(`【整体风险等级（不可更改）】${s.level} = ${LEVEL_LABEL[s.level]}`);
  lines.push(`【等级说明】${LEVEL_NOTE[s.level]}`);
  if (s.locked) {
    lines.push(`【锁定】已命中硬高危信号，等级锁定为"强烈建议暂停"，绝不可调低。`);
  }
  lines.push(`【命中的风险标签】${s.tags.length ? s.tags.join("、") : "无"}`);
  lines.push(`【高危原文证据】${s.highlightedPhrases.length ? s.highlightedPhrases.join(" | ") : "无"}`);

  if (s.hits.length) {
    lines.push(`【命中明细（标签 ← 原文证据，附规则内置解释供你参考改写）】`);
    const seen = new Set<string>();
    for (const h of s.hits) {
      const key = `${h.rule.tag}::${h.matchedText}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(
        sanitize(
          `- [${h.rule.tag}] 证据"${h.matchedText}"：${h.rule.whyRisky} 后果：${h.rule.consequence} 建议：${h.rule.suggestion}`,
        ),
      );
    }
  }
  if (s.positiveSignals.length) {
    lines.push(`【检测到的正向信号（可适当缓和语气，但不得因此调低等级）】${s.positiveSignals.join("、")}`);
  }
  return lines.join("\n");
}

/** 输出 schema 说明（连同一个 few-shot 风格的字段约束） */
const OUTPUT_SCHEMA = `请严格按以下 JSON 结构输出（字段名固定，值为中文）：
{
  "assessedLevel": "（你判断的整体等级：low/verify/high/block 之一，且不得低于规则下限）",
  "riskReasons": [
    { "tag": "（命中标签或你新增的官方清单中的风险类型名）", "evidence": "（原文证据，必填，不得编造）", "explanation": "（为什么可疑+可能后果，1-3句）", "suggestion": "（下一步怎么做，1句）" }
  ],
  "questionsToAsk": [
    { "q": "（可复制发给招聘方的追问话术，口吻像求职者本人）", "why": "（一句话：为什么这么问不会冒犯，让用户敢发）" }
  ],
  "verificationChecklist": ["（用户可执行的核验动作，4-7条）"],
  "privacyWarning": ["（提醒不要提供的敏感信息，按命中风险定制）"],
  "summary": "（一句话整体建议）"
}
注意：assessedLevel 不得低于规则下限、locked 时必须为 block。riskReasons 必须覆盖所有命中标签，每条都要引用具体原文证据；新增标签同样必须有 evidence，证据不足就不报。若无任何风险，riskReasons 返回空数组、assessedLevel 取规则下限、summary 给出常规核验提醒。
questionsToAsk 的每条都必须是 { "q": ..., "why": ... } 对象，且话术强度严格遵守上面的"分级原则"——按 assessedLevel 决定话术语气。`;

export function buildMessages(input: BuildPromptInput) {
  const { text, jobType, scoring, meta } = input;

  const metaLines: string[] = [];
  if (meta?.jobTitle) metaLines.push(`岗位名称：${meta.jobTitle}`);
  if (meta?.company) metaLines.push(`公司名称：${meta.company}`);
  if (meta?.salary) metaLines.push(`薪资范围：${meta.salary}`);
  if (meta?.city) metaLines.push(`工作城市：${meta.city}`);
  metaLines.push(`岗位类型：${jobType}`);
  if (meta?.identity) metaLines.push(`求职者身份：${meta.identity}`);

  const user = `${factsBlock(scoring)}

【用户填写的基础信息】
${metaLines.join("\n")}

【岗位描述 / 招聘聊天原文】
"""
${text}
"""

${OUTPUT_SCHEMA}`;

  return [
    { role: "system" as const, content: buildSystem(scoring.tags) },
    { role: "user" as const, content: user },
  ];
}
