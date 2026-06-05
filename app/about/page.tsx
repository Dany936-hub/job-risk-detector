import SiteNav from "@/components/site-nav";

export const metadata = { title: "关于我们 — 岗位避坑检测器" };

export default function AboutPage() {
  return (
    <main className="hero-glow min-h-screen bg-bg">
      <SiteNav />
      <div className="mx-auto max-w-[820px] px-4 sm:px-6 pt-10 pb-24">
        <h1 className="font-display font-800 text-[32px] sm:text-[40px] mb-3">关于我们</h1>
        <p className="text-text-muted text-[15px] leading-[1.7] mb-8">
          岗位避坑检测器，是一个面向年轻求职者的招聘风险提示工具，尤其是缺乏经验、容易踩坑的应届生和实习生。
        </p>

        <Section title="我们想解决的问题">
          <p className="text-[15px] leading-[1.7]">
            招聘诈骗的套路——收费、培训贷、刷单返利、站外引流——往往藏在话术里，老手一眼识破，新手浑然不觉。
            我们希望把这些「看不见的坑」在投递前显性化，让你少一点信息差。
          </p>
        </Section>

        <Section title="我们的边界">
          <ul className="space-y-2 text-[15px] leading-[1.7]">
            <li>· 我们做<b className="text-text">话术风险体检</b>，不做<b className="text-text">公司背景调查</b>。</li>
            <li>· 我们只提供风险提示，<b className="text-text">不对任何公司或岗位做真假定性</b>，也不构成法律判断。</li>
            <li>· 最终决定请结合自身判断与官方渠道核验。</li>
          </ul>
        </Section>

        <Section title="规则从哪里来">
          <p className="text-[15px] leading-[1.7] text-text-muted">
            风险规则参考了人社部、各大招聘平台的官方防骗指南与公开的求职风险提示，并持续维护更新。
          </p>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card !p-6 mb-5">
      <h2 className="font-display font-700 text-[18px] mb-3">{title}</h2>
      {children}
    </section>
  );
}
