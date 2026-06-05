// 端到端冒烟测试：真实调用 DeepSeek/Qwen，检查 JSON 合法率与解释质量
//
// 前置：在 .env.local 中填好 DEEPSEEK_API_KEY（或 LLM_PROVIDER=qwen + QWEN_API_KEY）
// 运行：npx tsx scripts/smoke-llm.ts
//
// 它会跑若干真实风格样本，对每条输出：
//   - LLM 是否成功（llmUsed）
//   - 风险等级是否与规则引擎一致（必然一致，因为等级由规则决定）
//   - LLM 生成的解释/话术/清单是否齐全、是否引用了原文证据
// 末尾给出 LLM 成功率统计。

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { analyze } from "../lib/analyze";
import { LEVEL_LABEL } from "../lib/scoring";
import type { JobType } from "../lib/types";

// —— 简易 .env.local 加载（避免引入 dotenv 依赖）——
function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !line.trim().startsWith("#")) {
        const val = m[2].replace(/^["']|["']$/g, "");
        if (val && !process.env[m[1]]) process.env[m[1]] = val;
      }
    }
  } catch {
    // 没有 .env.local 也允许，靠系统环境变量
  }
}
loadEnv();

const provider = (process.env.LLM_PROVIDER ?? "deepseek").toLowerCase();
const keyName = provider === "qwen" ? "QWEN_API_KEY" : "DEEPSEEK_API_KEY";
if (!process.env[keyName]) {
  console.error(`❌ 未检测到 ${keyName}。请在 .env.local 中填写后重试。`);
  process.exit(1);
}
console.log(`使用供应商：${provider}\n`);

interface Sample {
  name: string;
  text: string;
  jobType?: JobType;
}

const samples: Sample[] = [
  {
    name: "正常实习岗",
    jobType: "实习",
    text: "招聘产品运营实习生，要求大三大四在校生，每周到岗3-4天，负责社区内容运营与数据整理，base 北京，签订实习协议，实习津贴150-200/天。",
  },
  {
    name: "高薪兼职（疑似刷单）",
    jobType: "兼职",
    text: "招线上兼职，无需经验，手机就能做，日入300-500，动动手指点赞关注即可，做任务返佣，先加微信详聊，下载我们的App接单。",
  },
  {
    name: "培训贷/招转培",
    jobType: "全职",
    text: "诚招Java开发，零基础也可，培训后包就业，月薪过万。培训费可教育分期，先学后付，名额有限尽快报名，详情加微信。",
  },
  {
    name: "收费陷阱",
    jobType: "全职",
    text: "急招文员，待遇优厚。入职前需缴纳800元保证金和服装费，转正后退还。请先交完款再安排上岗。",
  },
  {
    name: "边界样本（含否定澄清）",
    jobType: "全职",
    text: "招聘行政专员，公司正规，无需缴纳任何押金、保证金，入职即签订劳动合同并缴纳五险一金。统一社会信用代码91110108XXXXXXXX。",
  },
];

function gradeReport(r: Awaited<ReturnType<typeof analyze>>) {
  const rep = r.report;
  const issues: string[] = [];
  // 命中标签的解释覆盖度
  const reasonTags = new Set(rep.riskReasons.map((x) => x.tag));
  for (const t of rep.riskTags) {
    if (!reasonTags.has(t)) issues.push(`解释漏标签:${t}`);
  }
  // 解释是否引用证据
  if (rep.riskTags.length > 0 && rep.riskReasons.some((x) => !x.evidence)) {
    issues.push("有解释缺证据");
  }
  if (rep.riskTags.length > 0 && rep.questionsToAsk.length < 3) issues.push("话术不足3条");
  if (rep.verificationChecklist.length < 3) issues.push("核验清单不足3条");
  if (!rep.summary) issues.push("缺summary");
  return issues;
}

async function main() {
  let llmOk = 0;
  for (const s of samples) {
    const r = await analyze({ text: s.text, jobType: s.jobType });
    const rep = r.report;
    const issues = gradeReport(r);
    if (r.llmUsed) llmOk++;

    console.log(`━━━ ${s.name} ━━━`);
    console.log(
      `LLM=${r.llmUsed ? "✅" : `❌(${r.llmError})`}  等级=${rep.riskLevel}(${LEVEL_LABEL[rep.riskLevel]}) 分=${rep.riskScore}`,
    );
    console.log(`标签：${rep.riskTags.join("、") || "（无）"}`);
    console.log(`高亮：${rep.highlightedPhrases.join(" | ") || "（无）"}`);
    if (rep.riskReasons[0]) {
      const rr = rep.riskReasons[0];
      console.log(`解释示例：[${rr.tag}] 证据"${rr.evidence}" → ${rr.explanation}`);
    }
    console.log(`追问话术(${rep.questionsToAsk.length})：${rep.questionsToAsk[0]?.q ?? "—"}`);
    console.log(`summary：${rep.summary}`);
    console.log(issues.length ? `⚠️ 质量问题：${issues.join("；")}` : `质量：✅ 齐全`);
    console.log();
  }

  console.log(`════ LLM 成功率：${llmOk}/${samples.length} ════`);
  if (llmOk < samples.length) {
    console.log("提示：失败项已自动用规则兜底，产品仍出结果；但需排查 key/网络/模型 JSON 稳定性。");
  }
}

main().catch((e) => {
  console.error("冒烟脚本异常：", e);
  process.exit(1);
});
