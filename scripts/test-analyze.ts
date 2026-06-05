// 分析编排层验证（重点验证"LLM 不可用时纯规则兜底"路径）
// 运行：npx tsx scripts/test-analyze.ts
//
// 不需要真实 API Key：故意用无效配置，触发 LLM 失败，验证兜底报告完整可用。

import { analyze, fallbackReport, mergeReport } from "../lib/analyze";
import { score } from "../lib/scoring";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    pass++;
    console.log(`✅ ${name}`);
  } else {
    fail++;
    console.log(`❌ ${name}${detail ? `  → ${detail}` : ""}`);
  }
}

const badCfg = {
  baseURL: "https://invalid.local/v1",
  apiKey: "sk-fake",
  model: "deepseek-chat",
  timeoutMs: 1500,
  retries: 0,
};

async function main() {
  // —— 用例1：刷单骗局，LLM 不可用 → 纯规则兜底仍给出 block 报告 ——
  const scam =
    "招聘兼职刷单员，动动手指日入过百，下载App做任务，先垫付后返本金，加微信详聊。";
  const r1 = await analyze({ text: scam, jobType: "兼职" }, badCfg);

  check("LLM 失败时 llmUsed=false", r1.llmUsed === false, `llmUsed=${r1.llmUsed}`);
  check("有记录 llmError", !!r1.llmError, r1.llmError);
  check("兜底报告等级=block", r1.report.riskLevel === "block", r1.report.riskLevel);
  check("兜底报告有风险解释", r1.report.riskReasons.length > 0, `${r1.report.riskReasons.length} 条`);
  check("每条解释都有证据原文", r1.report.riskReasons.every((x) => x.evidence.length > 0));
  check("兜底报告有追问话术", r1.report.questionsToAsk.length >= 1);
  check("兜底报告有核验清单", r1.report.verificationChecklist.length >= 3);
  check("兜底报告有隐私提醒", r1.report.privacyWarning.length >= 1);
  check("兜底报告有 summary", r1.report.summary.length > 0);
  check("高亮片段非空", r1.report.highlightedPhrases.length > 0, r1.report.highlightedPhrases.join(","));

  // —— 用例2：正常实习岗 → low，兜底 summary 给"未发现≠安全"提醒 ——
  const normal =
    "招聘产品实习生，要求在校生每周到岗3天，负责竞品调研，签订实习协议，地点为公司总部。";
  const r2 = await analyze({ text: normal, jobType: "实习" }, badCfg);
  check("正常岗等级=low", r2.report.riskLevel === "low", r2.report.riskLevel);
  check(
    "low 报告 summary 含边界语义",
    r2.report.summary.includes("不等于") ||
      r2.report.summary.includes("未发现") ||
      r2.report.summary.includes("不代表"),
    r2.report.summary,
  );
  check("low 报告无风险解释", r2.report.riskReasons.length === 0, `${r2.report.riskReasons.length} 条`);

  // —— 用例3：fallbackReport 与 analyze 兜底一致 ——
  const s = score(scam, "兼职");
  const fb = fallbackReport(s);
  check("fallbackReport 等级与引擎一致", fb.riskLevel === s.level);

  // —— 用例4：mergeReport 防 LLM 编造未命中标签（间接验证：兜底标签恒等于引擎） ——
  check(
    "兜底标签恒等于引擎命中",
    JSON.stringify(r1.report.riskTags) === JSON.stringify(s.tags),
  );

  // —— 用例5：LLM 主判「只升不降」契约 ——
  // 5a) 正常岗(low)，LLM 判 high 且给出新增标签+证据 → 升级到 high，标签并入
  const sLow = score(normal, "实习");
  const upgraded = mergeReport(sLow, {
    assessedLevel: "high",
    riskReasons: [
      { tag: "岗位描述空泛", evidence: "竞品调研", explanation: "职责描述偏笼统，建议追问具体内容。", suggestion: "追问岗位日常。" },
    ],
  });
  check("LLM 可把 low 升级为 high", upgraded.riskLevel === "high", upgraded.riskLevel);
  check("LLM 新增标签被并入", upgraded.riskTags.includes("岗位描述空泛"));

  // 5b) 高危锁定(block)，即便 LLM 判 low 也不许下调
  const sBlock = score(scam, "兼职");
  const tryDown = mergeReport(sBlock, { assessedLevel: "low", riskReasons: [] });
  check("locked 时 LLM 不能下调 block", tryDown.riskLevel === "block", tryDown.riskLevel);

  // 5c) LLM 编造无证据的新增标签 → 被丢弃
  const fakeTag = mergeReport(sLow, {
    assessedLevel: "low",
    riskReasons: [
      { tag: "收费/押金风险", evidence: "", explanation: "凭空说有收费风险。", suggestion: "x" },
    ],
  });
  check("无证据的 LLM 新增标签被丢弃", !fakeTag.riskTags.includes("收费/押金风险"));

  console.log(`\n———— ${pass} 通过 / ${fail} 失败 ————`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
