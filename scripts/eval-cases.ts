// 验证集（基于官方案例手法构造，非真实抓取数据）
//
// 说明：本数据由官方通报的真实手法改写而成，答案明确、可控；
// 它衡量的是"对已知套路的识别力"，不等同于真实世界准确率。
//
// 字段：
// - text：招聘文案 / 聊天内容
// - jobType：岗位类型（影响场景调节）
// - expectLevel：理想等级（人工标注的"应有判定"）
// - ruleFloorMin：规则层(score)至少应达到的等级下限（用于测规则兜底，
//   有些靠语义/改写的样本规则层可能命中不到，这类设为 "low"，只在全链路考核）
// - kind：clean(正常) | risk(高危) | borderline(边界) | evasion(改写绕过)

import type { RiskLevel, JobType } from "../lib/types";

export interface EvalCase {
  id: string;
  text: string;
  jobType: JobType;
  expectLevel: RiskLevel;
  ruleFloorMin: RiskLevel;
  kind: "clean" | "risk" | "borderline" | "evasion";
}

export const EVAL_CASES: EvalCase[] = [
  // ============ 高危：典型套路（规则应能兜住） ============
  {
    id: "risk-shuadan",
    text: "招聘线上兼职，无需经验，动动手指点赞关注即可，做任务返佣，日入300-500，先垫付后返本金，加微信详聊。",
    jobType: "兼职", expectLevel: "block", ruleFloorMin: "block", kind: "risk",
  },
  {
    id: "risk-peixundai",
    text: "招新媒体运营，零基础可入职。面试后老师说你经验不足，需先参加44天岗前培训，培训费19800元，可教育分期先学后付，培训后包就业。名额有限尽快报名。",
    jobType: "全职", expectLevel: "block", ruleFloorMin: "block", kind: "risk",
  },
  {
    id: "risk-fee",
    text: "录用通知：恭喜通过面试，入职前需缴纳保证金2000元、服装费800元，交完款安排上岗，费用转个人微信。",
    jobType: "全职", expectLevel: "block", ruleFloorMin: "block", kind: "risk",
  },
  {
    id: "risk-app",
    text: "诚聘兼职，手机就能做，下载我们的App接单做任务，完成即结算，先充值激活会员再做单。",
    jobType: "兼职", expectLevel: "block", ruleFloorMin: "block", kind: "risk",
  },
  {
    id: "risk-overseas",
    text: "境外高薪招聘，月薪2万起，工作轻松，包吃包住报销机票专人接送，做客服即可，无需经验，赴东南亚工作。",
    jobType: "全职", expectLevel: "high", ruleFloorMin: "high", kind: "risk",
  },
  {
    id: "risk-liangka",
    text: "招聘兼职，办张银行卡和电话卡走个账就能拿钱，日结200，正规流水，安全无风险。",
    jobType: "日结", expectLevel: "high", ruleFloorMin: "block", kind: "risk",
  },
  {
    id: "risk-neitui",
    text: "内部渠道，保证推荐入职某国企，缴纳服务费5.8万元，先交定金1.8万，未录用全额退款，名额有限。",
    jobType: "全职", expectLevel: "high", ruleFloorMin: "low", kind: "risk",
  },

  // ============ 改写/绕过：测 LLM 语义识别（规则层多半漏，floor=low） ============
  {
    id: "evasion-fee",
    text: "入职流程很简单，先交个押·金（可退），走完流程就上岗，金额不多。",
    jobType: "全职", expectLevel: "high", ruleFloorMin: "low", kind: "evasion",
  },
  {
    id: "evasion-peixundai",
    text: "我们有岗前能力提升计划，费用支持助学分期、先上岗后还款，完成后安排到合作公司工作。",
    jobType: "全职", expectLevel: "high", ruleFloorMin: "low", kind: "evasion",
  },
  {
    id: "evasion-zhanwai",
    text: "你好，平台上不方便细说，方便的话加我V：（已打码）我们详细聊岗位待遇。",
    jobType: "未知", expectLevel: "verify", ruleFloorMin: "low", kind: "evasion",
  },

  // ============ 边界：有一两个待核实点，但非高危 ============
  {
    id: "border-vague",
    text: "招聘储备干部，待遇优厚月入过万，工作内容面谈，有意者电话联系。",
    jobType: "全职", expectLevel: "verify", ruleFloorMin: "low", kind: "borderline",
  },
  {
    id: "border-rixin",
    text: "招日结小时工，餐厅帮厨，120元一天，做满当天结，地点市中心某餐厅。",
    jobType: "日结", expectLevel: "verify", ruleFloorMin: "low", kind: "borderline",
  },

  // ============ 正常：不应被误报 ============
  {
    id: "clean-intern",
    text: "招聘产品实习生，要求在校生每周到岗3天，负责竞品调研与需求整理，签订实习协议，工作地点为公司总部，实习补贴150元/天。",
    jobType: "实习", expectLevel: "low", ruleFloorMin: "low", kind: "clean",
  },
  {
    id: "clean-fulltime",
    text: "招聘前端开发工程师，本科及以上，3年经验，负责Web前端开发，薪资15-25k，五险一金，双休，签订正式劳动合同，公司地址张江高科。",
    jobType: "全职", expectLevel: "low", ruleFloorMin: "low", kind: "clean",
  },
  {
    id: "clean-clarify",
    text: "招聘客服专员，无需缴纳任何押金或费用，入职即签劳动合同并缴纳五险一金，月薪6-8k，欢迎应届生。",
    jobType: "全职", expectLevel: "low", ruleFloorMin: "low", kind: "clean",
  },

  // ============ 高危·更多类型（规则应能兜住） ============
  {
    id: "risk-fee-train",
    text: "入职需先缴纳培训费3000元、建档费500元，培训合格后正式上岗，费用走个人账户。",
    jobType: "全职", expectLevel: "block", ruleFloorMin: "block", kind: "risk",
  },
  {
    id: "risk-privacy",
    text: "办理入职，请把身份证正反面照片、银行卡号和短信验证码发我建档，今天就能入职。",
    jobType: "全职", expectLevel: "block", ruleFloorMin: "block", kind: "risk",
  },
  {
    id: "risk-kouzheng",
    text: "入职后身份证和毕业证原件交公司统一保管，办完社保再还你。",
    jobType: "全职", expectLevel: "high", ruleFloorMin: "low", kind: "risk",
  },
  {
    id: "risk-zhanwai-app",
    text: "岗位不错，加我微信详聊，然后下载我们公司App注册账号开始接单。",
    jobType: "兼职", expectLevel: "block", ruleFloorMin: "block", kind: "risk",
  },
  {
    id: "risk-chuanxiao",
    text: "招聘合伙人，连锁经营模式，交2980元成为会员，发展下线越多分成越高，躺着也能赚。",
    jobType: "全职", expectLevel: "block", ruleFloorMin: "low", kind: "risk",
  },
  {
    id: "risk-seqing",
    text: "招聘高薪生活助理，月入3万，需陪同领导出差应酬，形象气质佳优先，无需经验。",
    jobType: "全职", expectLevel: "high", ruleFloorMin: "low", kind: "risk",
  },
  {
    id: "risk-jiashiyong",
    text: "试用期6个月，试用期工资2000元不缴社保，转正再说，先干着看表现。",
    jobType: "全职", expectLevel: "high", ruleFloorMin: "low", kind: "risk",
  },
  {
    id: "risk-rixin-fee",
    text: "日结兼职，工资日结无押金，但需先交100元服装押金，做满一周退还。",
    jobType: "日结", expectLevel: "block", ruleFloorMin: "block", kind: "risk",
  },
  {
    id: "risk-overseas-2",
    text: "出国务工，柬埔寨高薪招聘网管，月薪3万包吃包住报销机票，专人接送，不限学历。",
    jobType: "全职", expectLevel: "high", ruleFloorMin: "high", kind: "risk",
  },
  {
    id: "risk-liangka-2",
    text: "轻松兼职，把你的银行卡借给我们走个流水，每天给你200，正规公司不违法。",
    jobType: "兼职", expectLevel: "block", ruleFloorMin: "block", kind: "risk",
  },
  {
    id: "risk-shuadan-2",
    text: "招聘点赞员，关注主播点赞即可返现，先做小任务返佣，后期任务佣金更高需垫付本金。",
    jobType: "兼职", expectLevel: "block", ruleFloorMin: "block", kind: "risk",
  },
  {
    id: "risk-neitui-2",
    text: "有内部关系可操作进事业编，先交8万定向服务费，办不成全额退，名额仅剩2个速定。",
    jobType: "全职", expectLevel: "high", ruleFloorMin: "low", kind: "risk",
  },

  // ============ 改写 / 绕过（规则多半漏，靠 LLM 或反规避归一化） ============
  {
    id: "evasion-fee-2",
    text: "入职走个流程，交个保 证 金就行，可退的，金额很小。",
    jobType: "全职", expectLevel: "high", ruleFloorMin: "low", kind: "evasion",
  },
  {
    id: "evasion-fee-3",
    text: "需要先交一点诚·意·金表示你想来的诚意，入职后会返还。",
    jobType: "全职", expectLevel: "high", ruleFloorMin: "low", kind: "evasion",
  },
  {
    id: "evasion-train-2",
    text: "公司提供岗前能力提升，费用可以先上岗后还款、分期无压力，学完直接上岗。",
    jobType: "全职", expectLevel: "high", ruleFloorMin: "low", kind: "evasion",
  },
  {
    id: "evasion-zhanwai-2",
    text: "这个平台聊不方便，留个扣扣或者微信，我把详细的发你。",
    jobType: "未知", expectLevel: "verify", ruleFloorMin: "low", kind: "evasion",
  },
  {
    id: "evasion-shuadan",
    text: "新型居家任务，帮商家做数据优化，完成一单结一单，前几单秒到账，大单需先备货款。",
    jobType: "兼职", expectLevel: "high", ruleFloorMin: "low", kind: "evasion",
  },

  // ============ 边界：需核实但非高危 ============
  {
    id: "border-vague-2",
    text: "招聘管培生，发展空间大，薪资面议，具体工作内容入职后安排，长期招聘。",
    jobType: "全职", expectLevel: "verify", ruleFloorMin: "low", kind: "borderline",
  },
  {
    id: "border-company",
    text: "我们是一家创业公司，岗位是运营，待遇可以，公司名字入职再告诉你。",
    jobType: "全职", expectLevel: "verify", ruleFloorMin: "low", kind: "borderline",
  },
  {
    id: "border-address",
    text: "面试地点在城东某小区3号楼502，明天上午过来，带上身份证。",
    jobType: "全职", expectLevel: "verify", ruleFloorMin: "low", kind: "borderline",
  },
  {
    id: "border-highpay",
    text: "招聘销售，月入轻松过万，多劳多得上不封顶，无责底薪3000，有无经验均可。",
    jobType: "全职", expectLevel: "verify", ruleFloorMin: "low", kind: "borderline",
  },
  {
    id: "border-remote",
    text: "远程线上岗位，在家办公时间自由，按项目结算，需自备电脑，先做个测试任务。",
    jobType: "远程", expectLevel: "verify", ruleFloorMin: "low", kind: "borderline",
  },
  {
    id: "border-discrim",
    text: "招聘文员，仅限女性，限35岁以下，已婚已育优先，本地户籍，月薪5-6k。",
    jobType: "全职", expectLevel: "verify", ruleFloorMin: "verify", kind: "borderline",
  },

  // ============ 正常：不应误报 ============
  {
    id: "clean-backend",
    text: "招聘后端工程师，Java方向，5年经验，负责核心系统开发，薪资25-40k，14薪，五险一金，签订劳动合同，工作地点北京中关村。",
    jobType: "全职", expectLevel: "low", ruleFloorMin: "low", kind: "clean",
  },
  {
    id: "clean-teacher",
    text: "招聘高中数学老师，师范类本科以上，有教师资格证，提供编制，签订正式合同，五险一金加公积金，欢迎应届毕业生。",
    jobType: "全职", expectLevel: "low", ruleFloorMin: "low", kind: "clean",
  },
  {
    id: "clean-parttime",
    text: "招聘周末展会兼职，负责引导和登记，时薪25元，按小时结算，工作地点国家会展中心，公司现场对接，无需任何费用。",
    jobType: "兼职", expectLevel: "low", ruleFloorMin: "low", kind: "clean",
  },
  {
    id: "clean-intern-2",
    text: "招聘运营实习生，每周到岗4天，协助内容排期与数据统计，签订三方实习协议，实习补贴180元每天，地点公司总部。",
    jobType: "实习", expectLevel: "low", ruleFloorMin: "low", kind: "clean",
  },
  {
    id: "clean-remote",
    text: "招聘远程文案编辑，按月发薪8-12k，签订劳动合同，提供五险一金，公司为正规注册企业可查统一社会信用代码。",
    jobType: "远程", expectLevel: "low", ruleFloorMin: "low", kind: "clean",
  },
  {
    id: "clean-clarify-2",
    text: "招聘前台，明确入职不收取任何费用、不押证件，月薪5-6k，做五休二，签合同缴社保。",
    jobType: "全职", expectLevel: "low", ruleFloorMin: "low", kind: "clean",
  },
];
