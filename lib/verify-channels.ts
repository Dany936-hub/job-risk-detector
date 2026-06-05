// 快捷核验渠道（单一数据源）
//
// 结果页的「快捷核验入口」按钮与「复制报告」里的核验渠道文本，都从这里取，
// 避免 URL 在两处各写一份、改一处漏一处。
//
// 注意：第三方/官方站的搜索 URL 可能随其改版失效，调整时只改这一个文件。

export interface VerifyChannel {
  group: "official" | "review";
  label: string;
  hint: string;
  badges?: string[];
  /** 给定公司名生成跳转链接；未填公司名时多数跳首页 */
  href: (company: string) => string;
}

const enc = encodeURIComponent;

export const VERIFY_CHANNELS: VerifyChannel[] = [
  {
    group: "official",
    label: "国家企业信用公示系统",
    hint: "官方工商登记，免费、无需登录。打开后在它的搜索框里输入公司名",
    badges: ["官方", "手动搜"],
    // 官方搜索带参数易变且有验证码，统一跳官网由用户手动搜
    href: () => "https://www.gsxt.gov.cn/",
  },
  {
    group: "official",
    label: "企查查",
    hint: "工商信息 / 参保人数 / 风险",
    badges: ["部分需登录"],
    href: (c) => (c ? `https://www.qcc.com/web/search?key=${enc(c)}` : "https://www.qcc.com/"),
  },
  {
    group: "official",
    label: "天眼查",
    hint: "注册资本 / 司法涉诉",
    badges: ["部分需登录"],
    href: (c) =>
      c ? `https://www.tianyancha.com/search?key=${enc(c)}` : "https://www.tianyancha.com/",
  },
  {
    group: "review",
    label: "小红书",
    hint: "求职避雷 / 面试劝退（时效性强）",
    href: (c) =>
      c
        ? `https://www.xiaohongshu.com/search_result?keyword=${enc(`${c} 避雷`)}`
        : "https://www.xiaohongshu.com/",
  },
  {
    group: "review",
    label: "职友集",
    hint: "公司点评 / 薪资 / 面试经验",
    href: (c) => (c ? `https://www.jobui.com/cmp?keyword=${enc(c)}` : "https://www.jobui.com/"),
  },
  {
    group: "review",
    label: "黑猫投诉",
    hint: "收费 / 退费 / 培训贷类投诉",
    href: (c) =>
      c ? `https://tousu.sina.com.cn/index/search/?keywords=${enc(c)}` : "https://tousu.sina.com.cn/",
  },
];
