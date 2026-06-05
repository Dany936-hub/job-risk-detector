// 客户端可安全引用的风险展示元数据（不引入服务端 analyze/llm）
import type { RiskLevel } from "@/lib/types";
import { AlertTriangle, OctagonStop, Info, ShieldCheck } from "./icons";

export interface RiskMeta {
  label: string;
  note: string;
  /** 对应 CSS data-level */
  level: RiskLevel;
  Icon: typeof Info;
}

export const RISK_META: Record<RiskLevel, RiskMeta> = {
  low: {
    label: "暂未发现明显风险信号",
    note: "这只代表你贴的这段招聘内容里没有出现典型的诈骗话术，并不代表这家公司一定真实、靠谱——公司是否真实存在、口碑如何，需要你点下方链接自行核验。",
    level: "low",
    Icon: ShieldCheck,
  },
  verify: {
    label: "需核验",
    note: "存在需要追问核实的信息点，请用下面的安全话术问清后，再决定是否继续。",
    level: "verify",
    Icon: Info,
  },
  high: {
    label: "高风险",
    note: "命中多个典型高危信号，建议谨慎。完成核验前不要提供敏感信息或付款。",
    level: "high",
    Icon: AlertTriangle,
  },
  block: {
    label: "强烈建议暂停",
    note: "涉及交钱、验证码、刷单、下载陌生 App 等高危行为，强烈建议立即暂停沟通。",
    level: "block",
    Icon: OctagonStop,
  },
};

/** 每类风险的「依据来源」，展示在风险解释里增强可信度（按标签映射，非逐规则） */
export const TAG_SOURCE: Record<string, string> = {
  "收费/押金风险": "人社部《求职风险提示》",
  "培训贷/招转培风险": "人社部《警惕招聘培训贷陷阱》",
  "刷单返利风险": "公安部反诈中心提示",
  "站外沟通风险": "招聘平台官方《防骗指南》",
  "下载陌生App风险": "公安部反诈中心提示",
  "隐私信息索取风险": "《个人信息保护法》相关提示",
  "高薪低门槛": "人社部《求职风险提示》",
  "岗位描述空泛": "招聘平台官方《防骗指南》",
  "合同/协议不明确": "《劳动合同法》相关提示",
  "面试地址异常": "招聘平台官方《防骗指南》",
  "企业信息不完整": "国家企业信用信息公示系统",
  "兼职日结高风险": "人社部《求职风险提示》",
  "境外高薪风险": "最高检《海外淘金的招聘骗局》",
  "两卡/账户出借风险": "公安部“断卡”行动",
  "传销风险": "公安部《传销犯罪典型案例》",
  "扣押证件风险": "人社部《就业服务与就业管理规定》",
  "色情招聘风险": "教育部求职防骗提示",
  "试用期违规风险": "《劳动合同法》试用期规定",
  "就业歧视": "人社部《就业服务与就业管理规定》",
};

/** 标签严重度：用于 tag 上色（只给 high/block 标签描边） */
export const TAG_SEVERITY: Record<string, "high" | "block" | undefined> = {
  "收费/押金风险": "block",
  "培训贷/招转培风险": "block",
  "刷单返利风险": "block",
  "下载陌生App风险": "block",
  "隐私信息索取风险": "block",
  "站外沟通风险": "high",
  "面试地址异常": "high",
  "合同/协议不明确": "high",
  "兼职日结高风险": "high",
  "境外高薪风险": "high",
  "两卡/账户出借风险": "block",
  "传销风险": "block",
  "扣押证件风险": "high",
  "色情招聘风险": "high",
  "试用期违规风险": "high",
};
