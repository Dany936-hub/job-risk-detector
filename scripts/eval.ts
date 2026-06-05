// 验证集评测：量化"判得多准"。
//
// 用法：
//   npx tsx scripts/eval.ts          # 只跑规则层(score)，确定性、零成本
//   npx tsx scripts/eval.ts --llm    # 额外跑全链路(analyze 含真 LLM)
//
// 指标：
//   漏报率：high/block 样本被判为低于应有等级（最致命）
//   误报率：clean 样本被判出风险（伤信任）
//   规则下限达标率：score().level 是否 >= ruleFloorMin
//   分级准确率：等级与 expectLevel 完全一致的比例（仅全链路有意义）

import { score } from "../lib/scoring";
import { analyze } from "../lib/analyze";
import { EVAL_CASES, type EvalCase } from "./eval-cases";
import type { RiskLevel } from "../lib/types";

const ORDER: Record<RiskLevel, number> = { low: 0, verify: 1, high: 2, block: 3 };
const isHazard = (c: EvalCase) => ORDER[c.expectLevel] >= ORDER.high; // high/block 视为高危
const isClean = (c: EvalCase) => c.expectLevel === "low";

function pct(n: number, d: number) {
  return d === 0 ? "—" : `${((n / d) * 100).toFixed(1)}%`;
}

// ============ 规则层评测 ============
function evalRuleLayer() {
  console.log("\n========== 规则层 (score) ==========");
  let floorOk = 0;
  let hazardMiss = 0; // 高危样本里，规则下限没达到 high 的数量（规则兜底视角）
  let hazardTotal = 0;
  const fails: string[] = [];

  for (const c of EVAL_CASES) {
    const lvl = score(c.text, c.jobType).level;
    const ok = ORDER[lvl] >= ORDER[c.ruleFloorMin];
    if (ok) floorOk++;
    else fails.push(`${c.id}: 规则=${lvl} < 期望下限 ${c.ruleFloorMin}`);

    // 规则兜底的"漏报"：标注为应能被规则兜住的高危(ruleFloorMin>=high)，却没兜住
    if (ORDER[c.ruleFloorMin] >= ORDER.high) {
      hazardTotal++;
      if (ORDER[lvl] < ORDER.high) hazardMiss++;
    }
  }

  console.log(`规则下限达标率：${pct(floorOk, EVAL_CASES.length)}（${floorOk}/${EVAL_CASES.length}）`);
  console.log(`规则可兜底的高危·漏兜数：${hazardMiss}/${hazardTotal}（${pct(hazardMiss, hazardTotal)} 漏兜）`);
  if (fails.length) {
    console.log("未达标样本：");
    fails.forEach((f) => console.log(`  ✗ ${f}`));
  }
  return fails.length === 0;
}

// ============ 全链路评测（真 LLM） ============
async function evalFullLayer() {
  console.log("\n========== 全链路 (analyze + 真 LLM) ==========");
  let exact = 0;
  let hazardMiss = 0; // 高危被判成低于 high
  let hazardTotal = 0;
  let falsePos = 0; // clean 被判出风险（>low）
  let cleanTotal = 0;
  const rows: string[] = [];

  for (const c of EVAL_CASES) {
    const { report } = await analyze({ text: c.text, jobType: c.jobType });
    const got = report.riskLevel;
    if (got === c.expectLevel) exact++;

    if (isHazard(c)) {
      hazardTotal++;
      if (ORDER[got] < ORDER.high) hazardMiss++;
    }
    if (isClean(c)) {
      cleanTotal++;
      if (ORDER[got] > ORDER.low) falsePos++;
    }
    const mark = got === c.expectLevel ? "✓" : "≈";
    rows.push(`  ${mark} ${c.id.padEnd(20)} 期望=${c.expectLevel.padEnd(6)} 实际=${got}`);
  }

  rows.forEach((r) => console.log(r));
  console.log(`\n分级完全一致：${pct(exact, EVAL_CASES.length)}（${exact}/${EVAL_CASES.length}）`);
  console.log(`🔴 高危漏报率：${pct(hazardMiss, hazardTotal)}（${hazardMiss}/${hazardTotal}）`);
  console.log(`🟡 正常误报率：${pct(falsePos, cleanTotal)}（${falsePos}/${cleanTotal}）`);
  // 漏报是底线：高危一个都不能被判成低于 high
  return hazardMiss === 0;
}

async function main() {
  const withLLM = process.argv.includes("--llm");
  console.log(`验证集：${EVAL_CASES.length} 条（构造样本，衡量对已知套路的识别力）`);

  const rulePass = evalRuleLayer();
  let llmPass = true;
  if (withLLM) llmPass = await evalFullLayer();
  else console.log("\n（加 --llm 可额外跑全链路真 LLM 评测）");

  const ok = rulePass && llmPass;
  console.log(`\n———— ${ok ? "✅ 通过" : "⚠️ 有未达标项"} ————`);
  process.exit(ok ? 0 : 1);
}

main();
