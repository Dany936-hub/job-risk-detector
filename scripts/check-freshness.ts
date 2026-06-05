// 知识库时效性提醒
//
// 不自动更新内容（新内容必须人工核实、改写、标来源，详见维护准则），
// 只在 KB_UPDATED 距今过久时告警，提醒"该去复查官方有没有新发布了"。
//
// 用法：
//   npx tsx scripts/check-freshness.ts          # 超 6 个月告警(退出码 1)
//   KB_MAX_MONTHS=3 npx tsx scripts/check-freshness.ts
//
// 适合定时 CI（如每月）运行，或手动跑。

import { KB_UPDATED } from "../app/knowledge/data";

const MAX_MONTHS = Number(process.env.KB_MAX_MONTHS ?? 6);

// KB_UPDATED 形如 "2026-06"
const m = /^(\d{4})-(\d{2})$/.exec(KB_UPDATED.trim());
if (!m) {
  console.error(`❌ KB_UPDATED 格式应为 YYYY-MM，当前为「${KB_UPDATED}」`);
  process.exit(1);
}

const [, y, mo] = m;
const updated = new Date(Number(y), Number(mo) - 1, 1);
const now = new Date();
const months =
  (now.getFullYear() - updated.getFullYear()) * 12 + (now.getMonth() - updated.getMonth());

console.log(`知识库最后整理：${KB_UPDATED}，距今约 ${months} 个月（阈值 ${MAX_MONTHS} 个月）`);

if (months > MAX_MONTHS) {
  console.log(
    `\n⚠️  知识库已超过 ${MAX_MONTHS} 个月未更新。招聘骗局持续演变，请：\n` +
      `   1. 复查人社部 / 公安部 / 最高检 / 教育部 等官网是否有新发布；\n` +
      `   2. 核实后更新 app/knowledge/data.ts（含新增条目与 KB_UPDATED）；\n` +
      `   3. 顺手跑 npm run check:links 排查死链。\n` +
      `———— 时效性提醒：建议更新 ————`,
  );
  process.exit(1);
}

console.log("———— ✅ 时效性在阈值内 ————");
process.exit(0);
