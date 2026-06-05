// 把 RiskReport 转成可复制纯文本（详细版 / 简洁版）
import type { RiskReport } from "@/lib/types";
import { RISK_META } from "./risk-meta";
import { VERIFY_CHANNELS } from "@/lib/verify-channels";

export function reportToText(r: RiskReport, kind: "full" | "brief", company = ""): string {
  const meta = RISK_META[r.riskLevel];
  const L: string[] = [];
  L.push(`【岗位风险检测报告】`);
  L.push(`风险等级：${meta.label}`);
  if (r.riskTags.length) L.push(`命中标签：${r.riskTags.join("、")}`);
  L.push("");
  L.push(r.summary);

  if (kind === "brief") {
    L.push("");
    if (r.questionsToAsk.length) {
      L.push("建议向招聘方追问：");
      r.questionsToAsk.slice(0, 3).forEach((x) => L.push(`· ${x.q}`));
    }
    L.push("");
    L.push("—— 由「岗位避坑检测器」生成，仅供风险提示");
    return L.join("\n");
  }

  // full
  if (r.riskReasons.length) {
    L.push("");
    L.push("▍风险点解释");
    r.riskReasons.forEach((x) => {
      L.push(`◆ ${x.tag}${x.evidence ? `（${x.evidence}）` : ""}`);
      L.push(`  ${x.explanation}`);
      if (x.suggestion) L.push(`  建议：${x.suggestion}`);
    });
  }
  if (r.questionsToAsk.length) {
    L.push("");
    L.push("▍安全追问话术");
    r.questionsToAsk.forEach((x) => {
      L.push(`· ${x.q}`);
      if (x.why) L.push(`  （${x.why}）`);
    });
  }
  if (r.verificationChecklist.length) {
    L.push("");
    L.push("▍核验清单");
    r.verificationChecklist.forEach((c) => L.push(`□ ${c}`));
  }
  if (r.privacyWarning.length) {
    L.push("");
    L.push("▍敏感信息保护提醒");
    r.privacyWarning.forEach((p) => L.push(`! ${p}`));
  }
  // 核验渠道（自行查证公司真伪/口碑，AI 不代查）
  const c = company.trim();
  L.push("");
  L.push("▍核验渠道（请自行查证，AI 不代查公司真伪）");
  VERIFY_CHANNELS.forEach((ch) => L.push(`· ${ch.label}：${ch.href(c)}`));
  L.push("");
  L.push("—— 由「岗位避坑检测器」生成，仅供风险提示，不构成法律判断");
  return L.join("\n");
}
