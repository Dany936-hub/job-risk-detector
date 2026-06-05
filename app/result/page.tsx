"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { RiskReport, JobType } from "@/lib/types";
import { RISK_META, TAG_SEVERITY, TAG_SOURCE } from "@/components/risk-meta";
import { EXAMPLE_REPORT } from "@/components/example-report";
import {
  Copy, Check, MessageQuestion, ListChecks, Lock, Refresh,
  CheckCircle, Search, Info, ExternalLink,
} from "@/components/icons";
import { reportToText } from "@/components/report-text";
import { VERIFY_CHANNELS } from "@/lib/verify-channels";
import SiteNav from "@/components/site-nav";

type Phase = "loading" | "done" | "error";

interface InputPayload {
  text: string;
  jobType: JobType;
  meta?: Record<string, string>;
}

const LOADING_STEPS = ["正在识别岗位风险信号", "正在生成风险报告", "正在生成安全追问话术"];

export default function ResultPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [report, setReport] = useState<RiskReport | null>(null);
  const [errMsg, setErrMsg] = useState("");
  const [stepIdx, setStepIdx] = useState(0);
  const [sourceText, setSourceText] = useState("");
  const [company, setCompany] = useState("");
  const started = useRef(false);

  // loading 文案轮播
  useEffect(() => {
    if (phase !== "loading") return;
    const t = setInterval(() => setStepIdx((i) => (i + 1) % LOADING_STEPS.length), 1100);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // 示例模式
    if (sessionStorage.getItem("jrd:example")) {
      sessionStorage.removeItem("jrd:example");
      setReport(EXAMPLE_REPORT);
      setSourceText("");
      // 给一点 loading 感，但很短
      setTimeout(() => setPhase("done"), 600);
      return;
    }

    const raw = sessionStorage.getItem("jrd:input");
    if (!raw) {
      router.replace("/");
      return;
    }
    const payload = JSON.parse(raw) as InputPayload;
    setSourceText(payload.text);
    setCompany(payload.meta?.company?.trim() ?? "");

    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "检测失败");
        setReport(data.report as RiskReport);
        setPhase("done");
      })
      .catch((e) => {
        setErrMsg(e.message || "检测失败，请稍后重试");
        setPhase("error");
      });
  }, [router]);

  if (phase === "loading") return <LoadingView step={LOADING_STEPS[stepIdx]} />;
  if (phase === "error") return <ErrorView msg={errMsg} onRetry={() => router.replace("/")} />;
  if (!report) return null;

  return <ReportView report={report} sourceText={sourceText} company={company} onAgain={() => router.push("/")} />;
}

/* ———————————————————————————— Loading ———————————————————————————— */
function LoadingView({ step }: { step: string }) {
  return (
    <main className="hero-glow min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <div className="flex justify-center gap-1.5 mb-5">
          <span className="loading-dot" style={{ animationDelay: "0ms" }} />
          <span className="loading-dot" style={{ animationDelay: "150ms" }} />
          <span className="loading-dot" style={{ animationDelay: "300ms" }} />
        </div>
        <p className="font-display font-600 text-[17px]">{step}…</p>
        <p className="text-[13px] text-text-subtle mt-2">通常需要几秒钟</p>
      </div>
    </main>
  );
}

/* ———————————————————————————— Error ———————————————————————————— */
function ErrorView({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  return (
    <main className="hero-glow min-h-screen flex items-center justify-center px-4">
      <div className="card text-center max-w-[400px]">
        <p className="font-display font-700 text-[18px] mb-2">检测没能完成</p>
        <p className="text-text-muted text-[14px] mb-5">{msg}</p>
        <button className="btn-primary" onClick={onRetry}><Refresh width={18} height={18} />返回重试</button>
      </div>
    </main>
  );
}

/* ———————————————————————————— Report ———————————————————————————— */
function ReportView({ report, sourceText, company, onAgain }: { report: RiskReport; sourceText: string; company: string; onAgain: () => void }) {
  const meta = RISK_META[report.riskLevel];
  const Icon = meta.Icon;

  return (
    <main className="hero-glow min-h-screen bg-bg">
      <SiteNav />
      <div className="mx-auto max-w-content px-4 sm:px-6 pt-8 pb-24">
        {/* 风险等级卡 */}
        <section className="risk-card in" data-level={report.riskLevel}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Icon width={26} height={26} />
              <span className="font-display font-800 text-[22px] sm:text-[26px]">{meta.label}</span>
            </div>
            <RiskScoreRing score={report.riskScore} level={report.riskLevel} />
          </div>
          <p className="risk-desc mt-3 text-[15px] leading-[1.7]">{report.summary}</p>
          <p className="risk-desc mt-2 text-[13px] opacity-80">{meta.note}</p>

          {/* 标签 */}
          {report.riskTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {report.riskTags.map((t) => (
                <span key={t} className="tag" data-sev={TAG_SEVERITY[t]}>{t}</span>
              ))}
            </div>
          )}
        </section>

        {/* 能力边界说明：避免用户误以为 AI 已核验公司本身 */}
        <div className="mt-4 flex items-start gap-2.5 rounded-md border border-border bg-bg-soft px-4 py-3 text-[13px] leading-[1.65] text-text-muted">
          <Info width={16} height={16} className="mt-0.5 shrink-0 text-brand-300" />
          <span>
            本工具检测的是<b className="text-text">招聘内容里的话术与套路</b>（如收费、刷单、培训贷、站外引流），
            <b className="text-text">不联网核查公司真伪</b>。「这家公司是否真实、口碑如何」需要你用下方
            <b className="text-text">「待你核验的清单」和快捷入口</b>自行查证——两件事配合，才算看清一个岗位。
          </span>
        </div>

        {/* 高危原文高亮 */}
        {sourceText && report.highlightedPhrases.length > 0 && (
          <Block title="原文中的高危信号" delay={60}>
            <div className="card text-[15px] leading-[1.9]">
              <HighlightedText text={sourceText} phrases={report.highlightedPhrases} />
            </div>
          </Block>
        )}

        {/* 风险点解释 */}
        {report.riskReasons.length > 0 && (
          <Block title="风险点解释" delay={120}>
            <div className="space-y-3">
              {report.riskReasons.map((r, i) => (
                <div key={i} className="card reveal in" style={{ animationDelay: `${i * 70}ms` }}>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="tag" data-sev={TAG_SEVERITY[r.tag]}>{r.tag}</span>
                    {TAG_SOURCE[r.tag] && (
                      <span className="text-[12px] text-text-subtle">依据：{TAG_SOURCE[r.tag]}</span>
                    )}
                  </div>
                  {r.evidence && (
                    <p className="text-[13px] text-text-muted mb-1.5">命中原文：<span className="hl">{r.evidence}</span></p>
                  )}
                  <p className="text-[15px] leading-[1.7]">{r.explanation}</p>
                  {r.suggestion && (
                    <p className="text-[14px] mt-2 text-text-muted flex gap-1.5">
                      <CheckCircle width={16} height={16} className="mt-0.5 shrink-0 text-accent" />
                      <span>{r.suggestion}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Block>
        )}

        {/* 追问话术 */}
        {report.questionsToAsk.length > 0 && (() => {
          const isLow = report.riskLevel === "low";
          return (
            <Block
              title={isLow ? "面试可以这样问" : "安全追问话术"}
              icon={<MessageQuestion width={18} height={18} />}
              delay={160}
            >
              <p className="text-[13px] text-text-muted mb-3">
                {isLow
                  ? "这些都是求职者本就会问的常规问题，问了还显得专业，可直接复制："
                  : "可以直接复制发给招聘方。这些是你本就有权了解的问题——如果对方因为你礼貌地问这些而态度明显变差，这本身值得你留意："}
              </p>
              <div className="space-y-2.5">
                {report.questionsToAsk.map((x, i) => (
                  <CopyRow key={i} text={x.q} why={x.why} />
                ))}
              </div>
            </Block>
          );
        })()}

        {/* 核验清单 */}
        {report.verificationChecklist.length > 0 && (
          <Block title="待你核验的清单" icon={<ListChecks width={18} height={18} />} delay={200}>
            <p className="text-[13px] text-text-muted mb-3">
              以下是<b className="text-text">需要你自己去做</b>的核验，AI 不会替你查询。逐项确认后再决定是否继续。
            </p>
            <ul className="card space-y-2.5">
              {report.verificationChecklist.map((c, i) => (
                <li key={i} className="flex gap-2.5 text-[14px] leading-[1.6]">
                  <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border border-border text-[11px] font-700 text-text-muted">
                    {i + 1}
                  </span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
            <VerifyLinks company={company} />
          </Block>
        )}

        {/* 敏感信息提醒 */}
        {report.privacyWarning.length > 0 && (
          <Block title="敏感信息保护提醒" icon={<Lock width={18} height={18} />} delay={240}>
            <ul className="card space-y-2 border-l-[3px]" style={{ borderLeftColor: "var(--risk-block)" }}>
              {report.privacyWarning.map((p, i) => (
                <li key={i} className="text-[14px] leading-[1.6] text-text">{p}</li>
              ))}
            </ul>
          </Block>
        )}

        {/* 操作区 */}
        <div className="mt-8 flex flex-col gap-3">
          <CopyReportButtons report={report} company={company} />
          <button className="btn-secondary w-full" onClick={onAgain}>
            <Search width={17} height={17} />再测一个岗位
          </button>
        </div>

        <Feedback />

        <p className="mt-8 text-[12px] text-text-subtle leading-relaxed">
          本工具仅提供风险提示，不构成法律判断，也不对任何公司或岗位做真假定性。
        </p>
      </div>
    </main>
  );
}

/** 环形风险评分。分数越高越危险，环按等级取色，并显式标注方向避免误解。 */
function RiskScoreRing({ score, level }: { score: number; level: RiskReport["riskLevel"] }) {
  const s = Math.max(0, Math.min(100, score));
  const R = 26;
  const C = 2 * Math.PI * R;
  const dash = (s / 100) * C;
  const color = `var(--risk-${level})`;
  return (
    <div className="flex shrink-0 flex-col items-center">
      <div className="relative h-[64px] w-[64px]">
        <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
          <circle cx="32" cy="32" r={R} fill="none" stroke="var(--border)" strokeWidth="6" />
          <circle
            cx="32" cy="32" r={R} fill="none" stroke={color} strokeWidth="6"
            strokeLinecap="round" strokeDasharray={`${dash} ${C}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display font-800 text-[20px] leading-none" style={{ color }}>{s}</span>
          <span className="text-[10px] text-text-subtle leading-none mt-0.5">/100</span>
        </div>
      </div>
      <span className="mt-1 text-[10px] text-text-subtle whitespace-nowrap">风险评分·越高越危险</span>
    </div>
  );
}

/* ———————————————————————————— 小组件 ———————————————————————————— */
function Block({ title, icon, children, delay = 0 }: { title: string; icon?: React.ReactNode; children: React.ReactNode; delay?: number }) {
  return (
    <section className="mt-7">
      <h2 className="reveal in flex items-center gap-2 font-display font-700 text-[18px] mb-3" style={{ animationDelay: `${delay}ms` }}>
        {icon && <span className="text-accent">{icon}</span>}
        {title}
      </h2>
      {children}
    </section>
  );
}

function HighlightedText({ text, phrases }: { text: string; phrases: string[] }) {
  // 按 phrase 切分文本做高亮（最长优先，避免子串冲突）
  const sorted = [...new Set(phrases)].filter(Boolean).sort((a, b) => b.length - a.length);
  if (sorted.length === 0) return <>{text}</>;

  const nodes: React.ReactNode[] = [];
  let rest = text;
  let key = 0;
  while (rest.length > 0) {
    let hitIdx = -1;
    let hitPhrase = "";
    for (const p of sorted) {
      const idx = rest.indexOf(p);
      if (idx !== -1 && (hitIdx === -1 || idx < hitIdx)) { hitIdx = idx; hitPhrase = p; }
    }
    if (hitIdx === -1) { nodes.push(<span key={key++}>{rest}</span>); break; }
    if (hitIdx > 0) nodes.push(<span key={key++}>{rest.slice(0, hitIdx)}</span>);
    nodes.push(<mark key={key++} className="hl">{hitPhrase}</mark>);
    rest = rest.slice(hitIdx + hitPhrase.length);
  }
  return <>{nodes}</>;
}

type VLink = { label: string; href: string; hint: string; badges?: string[] };

/** 快捷核验入口：把"去哪查"直接做成可点链接，填了公司名就带名搜索 */
function VerifyLinks({ company }: { company: string }) {
  // 结果页可直接补填/修改公司名，初值为检测时填写的（可能为空）
  const [name, setName] = useState(company);
  const c = name.trim();

  const toLink = (ch: (typeof VERIFY_CHANNELS)[number]): VLink => ({
    label: ch.label,
    href: ch.href(c),
    hint: ch.hint,
    badges: ch.badges,
  });
  const official = VERIFY_CHANNELS.filter((x) => x.group === "official").map(toLink);
  const review = VERIFY_CHANNELS.filter((x) => x.group === "review").map(toLink);

  return (
    <div className="mt-3 space-y-3">
      <div>
        <p className="text-[12px] text-text-subtle mb-1.5">
          快捷核验入口：填入公司名，大部分链接会自动带入搜索；标「手动搜」的需在打开的页面里自行输入。
        </p>
        <input
          className="field !py-2 !text-[14px]"
          placeholder="输入公司全称，如：北京红壹科技有限公司"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <LinkGroup title="工商核验" links={official} />
      <LinkGroup title="口碑与避雷" links={review} />
    </div>
  );
}

function LinkGroup({ title, links }: { title: string; links: VLink[] }) {
  return (
    <div>
      <p className="text-[12px] text-text-muted mb-1.5">{title}</p>
      <div className="flex flex-wrap gap-2">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            title={l.hint}
            className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-bg-soft px-3 py-2 text-[13px] font-600 text-text-muted transition-colors hover:text-brand-deep hover:border-brand"
          >
            <ExternalLink width={14} height={14} />
            {l.label}
            {l.badges?.map((b) => (
              <span
                key={b}
                className="ml-0.5 rounded-[4px] px-1.5 py-0.5 text-[10px] font-700 leading-none"
                style={
                  b === "官方"
                    ? { background: "var(--brand-soft)", color: "var(--brand-deep)" }
                    : { background: "var(--bg)", color: "var(--text-subtle)" }
                }
              >
                {b}
              </span>
            ))}
          </a>
        ))}
      </div>
    </div>
  );
}

function CopyRow({ text, why }: { text: string; why?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }
  return (
    <div className="copy-item !items-start">
      <div className="flex-1">
        <span className="text-[14px] leading-[1.6] block">{text}</span>
        {why && (
          <span className="mt-1 flex items-start gap-1 text-[12px] leading-[1.5] text-text-muted">
            <Info width={13} height={13} className="mt-0.5 shrink-0 text-brand-300" />
            {why}
          </span>
        )}
      </div>
      <button className="copy-btn" data-copied={copied} onClick={copy} aria-label="复制">
        <span className="icon">{copied ? <Check width={16} height={16} /> : <Copy width={16} height={16} />}</span>
        {copied ? "已复制" : "复制"}
      </button>
    </div>
  );
}

function CopyReportButtons({ report, company }: { report: RiskReport; company: string }) {
  const [copied, setCopied] = useState<"" | "full" | "brief">("");
  function copy(kind: "full" | "brief") {
    const txt = reportToText(report, kind, company);
    navigator.clipboard?.writeText(txt).then(() => {
      setCopied(kind);
      setTimeout(() => setCopied(""), 1800);
    });
  }
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <button className="btn-primary w-full sm:flex-1" onClick={() => copy("full")}>
        <span className="icon">{copied === "full" ? <Check width={18} height={18} /> : <Copy width={18} height={18} />}</span>
        {copied === "full" ? "已复制详细版" : "复制详细报告"}
      </button>
      <button className="btn-secondary w-full sm:flex-1" onClick={() => copy("brief")}>
        <span className="icon">{copied === "brief" ? <Check width={17} height={17} /> : <Copy width={17} height={17} />}</span>
        {copied === "brief" ? "已复制简洁版" : "复制简洁版（转发用）"}
      </button>
    </div>
  );
}

function Feedback() {
  const [picked, setPicked] = useState<string | null>(null);
  const opts = ["判断有帮助", "判断不准确", "我不确定", "对方确实要求交钱", "对方要求加微信", "对方要求下载App"];
  return (
    <section className="mt-8 card !bg-bg-soft">
      <p className="font-display font-600 text-[14px] mb-3">这次检测怎么样？（匿名）</p>
      {picked ? (
        <p className="text-[14px] text-success flex items-center gap-1.5"><CheckCircle width={17} height={17} />谢谢反馈，已收到「{picked}」</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {opts.map((o) => (
            <button key={o} className="tag hover:border-accent transition-colors" onClick={() => setPicked(o)}>{o}</button>
          ))}
        </div>
      )}
    </section>
  );
}
