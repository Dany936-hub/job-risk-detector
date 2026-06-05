import SiteNav from "@/components/site-nav";

export const metadata = { title: "使用说明 — 岗位避坑检测器" };

export default function GuidePage() {
  return (
    <main className="hero-glow min-h-screen bg-bg">
      <SiteNav />
      <div className="mx-auto max-w-[820px] px-4 sm:px-6 pt-10 pb-24">
        <h1 className="font-display font-800 text-[32px] sm:text-[40px] mb-3">使用说明</h1>
        <p className="text-text-muted text-[15px] leading-[1.7] mb-8">
          这是一个帮你在投递前看清招聘话术风险的工具。它检测的是「招聘内容里的套路」，
          <b className="text-text">不联网核查公司真伪</b>——公司是否真实、口碑如何，需要你结合核验渠道自行查证。
        </p>

        <Section title="三步用起来">
          <ol className="space-y-3 text-[15px] leading-[1.7]">
            <Step n={1} t="粘贴或上传">
              把岗位描述、招聘 JD 或与 HR 的聊天内容粘贴进去；也可以直接「上传截图识别（可多张）」，由 AI 读出文字。
            </Step>
            <Step n={2} t="补充信息（选填）">
              填写公司名、薪资、岗位类型、你的身份等，能提高判断准确度。公司名还会自动带入后续的核验链接。
            </Step>
            <Step n={3} t="看报告 + 自行核验">
              报告会标出风险等级、命中的高危话术、安全追问话术和核验清单。按清单和快捷入口自己查证后，再决定是否继续。
            </Step>
          </ol>
        </Section>

        <Section title="风险等级怎么看">
          <ul className="space-y-2 text-[15px] leading-[1.7]">
            <li><b className="text-text">暂未发现明显风险信号</b>：内容里没有典型诈骗话术，但不代表公司一定靠谱。</li>
            <li><b className="text-text">需核验</b>：有需要追问核实的信息点。</li>
            <li><b className="text-text">高风险</b>：命中多个典型高危信号，谨慎。</li>
            <li><b className="text-text">强烈建议暂停</b>：涉及交钱、验证码、刷单、下载陌生 App 等，建议立即停止沟通。</li>
          </ul>
          <p className="text-text-muted text-[13px] mt-3">风险评分越高越危险（0–100），它是辅助参考，最终请结合等级与原文判断。</p>
        </Section>

        <Section title="它不能做什么">
          <ul className="space-y-2 text-[15px] leading-[1.7] text-text-muted">
            <li>· 不联网核查公司是否真实存在（请用报告里的「国家企业信用公示系统」等渠道自查）。</li>
            <li>· 不对任何公司或岗位做「真假 / 诈骗」的定性结论。</li>
            <li>· 不构成法律判断，仅提供风险提示。</li>
          </ul>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card !p-6 mb-5">
      <h2 className="font-display font-700 text-[18px] mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Step({ n, t, children }: { n: number; t: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] font-700"
        style={{ background: "var(--brand-soft)", color: "var(--brand-deep)" }}>{n}</span>
      <span><b className="text-text">{t}</b>　{children}</span>
    </li>
  );
}
