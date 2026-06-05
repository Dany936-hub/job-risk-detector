// 判级引擎验证脚本
// 运行：npx tsx scripts/test-scoring.ts
// 覆盖：真骗局命中 / 正常岗位不误伤 / 反误伤否定句 / 场景调节 / 组合升级

import { score, LEVEL_LABEL } from "../lib/scoring";
import type { JobType, RiskLevel } from "../lib/types";

interface Case {
  name: string;
  text: string;
  jobType?: JobType;
  expectLevel: RiskLevel;
  expectTagsInclude?: string[];
  expectLocked?: boolean;
}

const cases: Case[] = [
  {
    name: "刷单骗局（应锁 block）",
    text: "招聘兼职刷单员，动动手指日入过百，下载App做任务，先垫付后返本金，加微信详聊。",
    jobType: "兼职",
    expectLevel: "block",
    expectTagsInclude: ["刷单返利风险", "下载陌生App风险", "站外沟通风险"],
    expectLocked: true,
  },
  {
    name: "培训贷（应锁 block）",
    text: "零基础培训后包就业，可教育分期零元入学，学完安排工作，名额有限尽快报名。",
    expectLevel: "block",
    expectTagsInclude: ["培训贷/招转培风险"],
    expectLocked: true,
  },
  {
    name: "索要验证码（应锁 block，无降级例外）",
    text: "入职流程：把你收到的手机验证码发我核对一下身份即可。",
    expectLevel: "block",
    expectTagsInclude: ["隐私信息索取风险"],
    expectLocked: true,
  },
  {
    name: "反误伤：明确无需押金（不应命中收费）",
    text: "正规公司招聘，无需缴纳任何押金、保证金，签订劳动合同，缴纳五险一金。统一社会信用代码91110...",
    jobType: "全职",
    expectLevel: "low",
    expectLocked: false,
  },
  {
    name: "正常实习岗（low）",
    text: "招聘产品实习生，要求大三大四在校生，每周到岗3天，负责竞品调研与需求文档，签订实习协议，地点为公司总部。",
    jobType: "实习",
    expectLevel: "low",
    expectLocked: false,
  },
  {
    name: "站外沟通+高薪低门槛（verify/high，不锁）",
    text: "无需经验高薪诚聘，加微信详聊，工作内容简单详情面议。",
    jobType: "全职",
    expectLevel: "high", // 站外 verify + 空泛 verify + 高薪 verify = 3标签 → 升 high
    expectLocked: false,
  },
  {
    name: "场景调节：同样文案兼职更严",
    text: "无需经验高薪，日结400，轻松日入。",
    jobType: "日结",
    expectLevel: "high",
    expectLocked: false,
  },
  {
    name: "考勤App反误伤（全职降级，不应 high）",
    text: "入职后需下载钉钉用于考勤打卡，链接下载安装即可。签订劳动合同。",
    jobType: "全职",
    expectLevel: "low",
    expectLocked: false,
  },
  {
    name: "面试地址异常（high）",
    text: "明天到附近的如家酒店面试，地址到了再说。",
    expectLevel: "high",
    expectTagsInclude: ["面试地址异常"],
  },
];

let pass = 0;
let fail = 0;

for (const c of cases) {
  const r = score(c.text, c.jobType ?? "未知");
  const errs: string[] = [];

  if (r.level !== c.expectLevel) {
    errs.push(`等级 期望=${c.expectLevel}(${LEVEL_LABEL[c.expectLevel]}) 实际=${r.level}(${LEVEL_LABEL[r.level]})`);
  }
  if (c.expectLocked !== undefined && r.locked !== c.expectLocked) {
    errs.push(`锁定 期望=${c.expectLocked} 实际=${r.locked}`);
  }
  if (c.expectTagsInclude) {
    for (const t of c.expectTagsInclude) {
      if (!r.tags.includes(t as any)) errs.push(`缺少标签: ${t}`);
    }
  }

  if (errs.length === 0) {
    pass++;
    console.log(`✅ ${c.name}  →  ${r.level}(${LEVEL_LABEL[r.level]}) score=${r.score} tags=[${r.tags.join("、")}]`);
  } else {
    fail++;
    console.log(`❌ ${c.name}`);
    errs.forEach((e) => console.log(`     ${e}`));
    console.log(`     实际 tags=[${r.tags.join("、")}] hits=${r.hits.length} positives=[${r.positiveSignals.join("、")}]`);
  }
}

console.log(`\n———— ${pass} 通过 / ${fail} 失败 / 共 ${cases.length} ————`);
process.exit(fail > 0 ? 1 : 0);
