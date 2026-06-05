// 岗位避坑检测器 —— 核心类型定义
// 对齐 PRD 9.6 模型输出结构

/** 风险标签：对齐 PRD 12 类 */
export type RiskTag =
  | "收费/押金风险"
  | "培训贷/招转培风险"
  | "刷单返利风险"
  | "站外沟通风险"
  | "下载陌生App风险"
  | "隐私信息索取风险"
  | "高薪低门槛"
  | "岗位描述空泛"
  | "合同/协议不明确"
  | "面试地址异常"
  | "企业信息不完整"
  | "兼职日结高风险"
  | "境外高薪风险"
  | "两卡/账户出借风险"
  | "传销风险"
  | "扣押证件风险"
  | "色情招聘风险"
  | "试用期违规风险"
  | "就业歧视";

/** 整体风险等级（四档，对齐 PRD 功能3） */
export type RiskLevel = "low" | "verify" | "high" | "block";

/** 单条规则命中时的基础严重度 */
export type Severity = "low" | "verify" | "high" | "block";

/** 用户填写的岗位类型，用于场景调节 */
export type JobType = "全职" | "实习" | "兼职" | "远程" | "日结" | "未知";

/** 一条风险规则 */
export interface RiskRule {
  /** 唯一 id，如 fee-01 */
  id: string;
  /** 所属风险标签 */
  tag: RiskTag;
  /** 命中关键词（任一命中即触发，除非被否定/白名单拦截） */
  patterns: string[];
  /** 基础严重度 */
  severity: Severity;
  /**
   * 是否强制锁定整体等级下限。
   * 设为 "block" 时，命中后整体直接锁到 block，LLM 与正向信号都无权下调。
   */
  floor?: "block";
  /**
   * 否定前缀词：命中 pattern 后，若邻近窗口内出现这些词，则视为"主动澄清"，
   * 不计入风险，反而计为一个正向信号。
   */
  negators?: string[];
  /** 语境白名单词：邻近窗口内出现这些词则跳过命中（正常语境，非风险） */
  contextBlock?: string[];
  /**
   * 场景调节：按岗位类型升/降档。
   * 例：{ 兼职: 1, 日结: 1 } 表示兼职/日结时严重度升一档。
   * 负数表示降档（仅用于"可能误读"的规则，如考勤App、正规背调）。
   */
  ctx?: Partial<Record<Exclude<JobType, "未知">, number>>;
  /** 为什么可疑 */
  whyRisky: string;
  /** 可能造成的后果 */
  consequence: string;
  /** 用户下一步该怎么做 */
  suggestion: string;
  /** 关联的安全追问话术（可被报告复用） */
  questions?: string[];
}

/** 规则命中结果 */
export interface RuleHit {
  rule: RiskRule;
  /** 命中的原文片段（用于高亮） */
  matchedText: string;
  /** 在原文中的起始位置 */
  index: number;
  /** 经场景调节后的实际严重度 */
  effectiveSeverity: Severity;
}

/** 判级引擎输出（送给 LLM 作为"下限约束"，也直接用于兜底渲染） */
export interface ScoringResult {
  /** 整体风险等级（下限） */
  level: RiskLevel;
  /** 0-100 风险分（启发式，仅供展示） */
  score: number;
  /** 命中的标签去重列表 */
  tags: RiskTag[];
  /** 全部命中明细 */
  hits: RuleHit[];
  /** 命中的高危原文片段（去重，用于高亮） */
  highlightedPhrases: string[];
  /** 检测到的正向信号（如"明确无需费用""承诺签合同"） */
  positiveSignals: string[];
  /** 是否因 floor=block 命中而锁定（LLM 不可下调） */
  locked: boolean;
}

/**
 * 一条追问话术。
 * - q：可直接复制发给招聘方的问题本身
 * - why：为什么这么问不会冒犯（让用户敢用）。正规岗位经得起这类问题，
 *        这条注解就是用来打消"问了会不会得罪 HR"的顾虑。
 */
export interface AskQuestion {
  q: string;
  why?: string;
}

/** 最终报告结构（对齐 PRD 9.6，前端渲染用） */
export interface RiskReport {
  riskLevel: RiskLevel;
  riskScore: number;
  riskTags: RiskTag[];
  highlightedPhrases: string[];
  riskReasons: {
    tag: RiskTag;
    evidence: string;
    explanation: string;
    suggestion: string;
  }[];
  questionsToAsk: AskQuestion[];
  verificationChecklist: string[];
  privacyWarning: string[];
  summary: string;
}
