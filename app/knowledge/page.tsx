import SiteNav from "@/components/site-nav";
import { ExternalLink } from "@/components/icons";
import { ITEMS, CASES, SOURCES, sourceLabel, KB_UPDATED } from "./data";

export const metadata = { title: "风险知识库 — 岗位避坑检测器" };

export default function KnowledgePage() {
  const sourceList = Object.values(SOURCES);
  return (
    <main className="hero-glow min-h-screen bg-bg">
      <SiteNav />
      <div className="mx-auto max-w-[940px] px-4 sm:px-6 pt-10 pb-24">
        <h1 className="font-display font-800 text-[32px] sm:text-[40px] mb-3">风险知识库</h1>
        <p className="text-text-muted text-[15px] leading-[1.7] mb-2">
          以下内容整理自人力资源社会保障部、公安部、最高检、教育部等官方公开发布的求职防骗提示，
          每条均标注来源与发布时间、可点击查证。认识这些套路，自己也能一眼识破。
        </p>
        <p className="text-[12px] text-text-subtle mb-5">知识库最后整理：{KB_UPDATED} · 招聘骗局持续演变，请同时以官方最新发布为准。</p>

        {/* 来源声明 */}
        <section className="card !p-5 mb-6">
          <h2 className="font-display font-700 text-[15px] mb-2">资料来源（均为官方公开发布）</h2>
          <p className="text-[12px] text-text-subtle leading-[1.6] mb-3">
            链接若打不开（官网常改版），可复制书名号《》内的标题，到对应机构官网或搜索引擎自行查证。
          </p>
          <ul className="space-y-2">
            {sourceList.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-start gap-1.5 text-[13px] leading-[1.6] text-brand-deep hover:underline"
                >
                  <ExternalLink width={14} height={14} className="mt-0.5 shrink-0" />
                  {sourceLabel(s)}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ITEMS.map((it) => (
            <section key={it.title} className="card !p-5 flex flex-col">
              <h2 className="font-display font-700 text-[16px] mb-2">{it.title}</h2>
              <p className="text-[14px] leading-[1.7] text-text-muted">{it.desc}</p>
              <p className="text-[13px] leading-[1.6] mt-2.5 text-text-subtle">
                典型信号：<span className="text-text">{it.signal}</span>
              </p>
              <p className="text-[13px] leading-[1.6] mt-2 text-text-muted">
                <b className="text-text">官方提醒：</b>{it.tip}
              </p>
              <a
                href={SOURCES[it.source].url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-[12px] text-brand-deep hover:underline"
              >
                <ExternalLink width={12} height={12} />
                依据：{sourceLabel(SOURCES[it.source])}
              </a>
            </section>
          ))}
        </div>

        {/* 官方通报的真实案例 */}
        <h2 className="font-display font-700 text-[22px] mt-12 mb-2">官方通报的真实案例</h2>
        <p className="text-text-muted text-[14px] leading-[1.7] mb-5">
          以下为官方公开通报的真实招聘侵权 / 诈骗手法，看清套路细节，更容易在现实中对号入座。
        </p>
        <div className="space-y-3">
          {CASES.map((c, i) => (
            <section key={i} className="card !p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="tag" data-sev="block">{c.type}</span>
              </div>
              <p className="text-[14px] leading-[1.7] text-text-muted">{c.method}</p>
              <a
                href={SOURCES[c.source].url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2.5 inline-flex items-center gap-1 text-[12px] text-brand-deep hover:underline"
              >
                <ExternalLink width={12} height={12} />
                依据：{sourceLabel(SOURCES[c.source])}
              </a>
            </section>
          ))}
        </div>

        <p className="text-[12px] text-text-subtle leading-relaxed mt-8">
          本知识库仅供识别参考，整理自官方公开提示，不对任何公司或岗位做真假定性。具体以官方原文为准；
          如官方后续更新，请以最新发布为准。
        </p>
      </div>
    </main>
  );
}
