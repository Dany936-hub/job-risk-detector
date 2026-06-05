import SiteNav from "@/components/site-nav";

export const metadata = { title: "隐私说明 — 岗位避坑检测器" };

export default function PrivacyPage() {
  return (
    <main className="hero-glow min-h-screen bg-bg">
      <SiteNav />
      <div className="mx-auto max-w-[820px] px-4 sm:px-6 pt-10 pb-24">
        <h1 className="font-display font-800 text-[32px] sm:text-[40px] mb-3">隐私说明</h1>
        <p className="text-text-muted text-[15px] leading-[1.7] mb-8">
          我们知道招聘内容里可能包含敏感信息，因此把隐私保护放在第一位。以下是我们对你数据的处理方式。
        </p>

        <Section title="我们不保存你的原文和图片">
          <p className="text-[15px] leading-[1.7]">
            你粘贴的文字、上传的截图，只用于本次检测，处理完即丢弃，<b className="text-text">不写入数据库、不做留存</b>。
            检测结果通过浏览器本地（sessionStorage）传递，关闭页面即清除。
          </p>
        </Section>

        <Section title="检测过程会用到第三方模型">
          <p className="text-[15px] leading-[1.7]">
            为了生成风险解释与话术，内容会发送给大模型服务商（如 DeepSeek / 通义千问）进行一次性处理；
            截图识别会发送给视觉模型做文字提取。请在粘贴 / 上传前，
            <b className="text-text">先打码手机号、身份证号、微信号、银行卡号等敏感信息</b>。
          </p>
        </Section>

        <Section title="无需登录、不收集账号">
          <p className="text-[15px] leading-[1.7]">
            打开即用，不需要注册或登录，我们不收集你的账号、手机号或任何身份信息。
          </p>
        </Section>

        <Section title="你的建议反馈">
          <p className="text-[15px] leading-[1.7] text-text-muted">
            结果页底部的「这个判断有帮助吗」仅用于改进判断质量，不关联任何个人身份。
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
