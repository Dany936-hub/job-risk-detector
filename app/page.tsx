"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, Sparkle, ImageUp, Refresh } from "@/components/icons";
import SiteNav from "@/components/site-nav";
import type { JobType } from "@/lib/types";

const JOB_TYPES: JobType[] = ["全职", "实习", "兼职", "远程", "日结"];
const IDENTITIES = ["应届生", "实习生", "转行", "兼职", "其他"];

export default function HomePage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [jobType, setJobType] = useState<JobType>("未知");
  const [meta, setMeta] = useState({ jobTitle: "", company: "", salary: "", city: "", identity: "" });
  const [error, setError] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function readAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error ?? new Error("读取失败"));
      reader.readAsDataURL(file);
    });
  }

  const MAX_IMAGES = 6;

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // 允许重复选同一批图触发 change
    if (files.length === 0) return;

    if (files.length > MAX_IMAGES) {
      setError(`一次最多上传 ${MAX_IMAGES} 张截图，请分批上传`);
      return;
    }
    if (files.some((f) => !f.type.startsWith("image/"))) {
      setError("只支持图片文件（PNG / JPG / WebP）");
      return;
    }
    if (files.some((f) => f.size > 6 * 1024 * 1024)) {
      setError("有图片超过 6MB，请压缩或截取关键部分后重试");
      return;
    }

    setError("");
    setOcrLoading(true);
    try {
      const images = await Promise.all(files.map(readAsDataURL));
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "截图识别失败，请手动粘贴文字");
        return;
      }
      const recognized = (data.text ?? "").trim();
      if (!recognized) {
        setError("没能从截图里识别到文字，请换更清晰的截图或手动粘贴");
        return;
      }
      // 追加到已有内容之后，不覆盖用户已输入的文字
      setText((prev) => (prev.trim() ? `${prev.trim()}\n${recognized}` : recognized));
    } catch {
      setError("截图识别失败，请检查网络后重试，或手动粘贴文字");
    } finally {
      setOcrLoading(false);
    }
  }

  function go() {
    if (!text.trim()) {
      setError("请先粘贴岗位描述或招聘聊天内容");
      return;
    }
    setError("");
    // 用 sessionStorage 传递，避免敏感原文进 URL
    sessionStorage.setItem(
      "jrd:input",
      JSON.stringify({ text: text.trim(), jobType, meta }),
    );
    router.push("/result");
  }

  function loadExample() {
    sessionStorage.setItem("jrd:example", "1");
    router.push("/result");
  }

  return (
    <main className="hero-glow min-h-screen">
      <SiteNav />

      <div className="mx-auto max-w-content px-4 sm:px-6 pt-16 sm:pt-24 pb-20 text-center">
        {/* Hero */}
        <header className="mb-10 flex flex-col items-center">
          <span className="reveal in tag mb-6" style={{ ["--i" as string]: 1 }}>
            <Sparkle width={13} height={13} className="text-brand-300" />
            AI 招聘风险识别
          </span>
          <h1 className="reveal in font-display font-800 leading-[1.05] tracking-[-0.02em] text-[40px] sm:text-[68px]" style={{ ["--i" as string]: 1, animationDelay: "70ms" }}>
            <span className="text-metal">投递前，先看清</span>
            <br />
            <span className="text-metal">岗位藏没藏</span><span className="gradient-text">风险</span>
          </h1>
          <p className="reveal in mt-6 text-text-muted text-[16px] sm:text-[19px] leading-[1.6] max-w-[52ch]" style={{ animationDelay: "140ms" }}>
            粘贴岗位描述或招聘聊天内容，AI 帮你识别收费陷阱、培训贷、刷单返利、站外引流等高危信号，并生成可复制的安全追问话术。
          </p>
        </header>

        {/* 输入区 */}
        <section className="reveal in card !p-5 sm:!p-7 text-left" style={{ animationDelay: "200ms" }}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="jd" className="block font-display font-600 text-[15px]">
              粘贴岗位描述 / 招聘聊天内容
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              onChange={onPickImage}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={ocrLoading}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-border bg-bg-soft px-3 py-2 text-[13px] font-600 text-text-muted transition-colors hover:text-brand-deep hover:border-brand disabled:opacity-60"
            >
              {ocrLoading ? (
                <>
                  <Refresh width={15} height={15} className="animate-spin" />
                  识别中…
                </>
              ) : (
                <>
                  <ImageUp width={15} height={15} />
                  上传截图识别（可多张）
                </>
              )}
            </button>
          </div>
          <textarea
            id="jd"
            className="field min-h-[180px] resize-y"
            placeholder="例如：招聘兼职，无需经验，日结300-500，加微信详聊，下载App做任务……"
            value={text}
            onChange={(e) => { setText(e.target.value); if (error) setError(""); }}
            maxLength={8000}
          />

          {/* 隐私提示 */}
          <div className="mt-3 flex items-start gap-2 text-[13px] text-text-muted bg-bg-soft rounded-sm px-3 py-2.5 border border-border">
            <Lock width={15} height={15} className="mt-0.5 shrink-0 text-accent" />
            <span>无论是粘贴文字还是上传截图，请先打码手机号、身份证号、微信号、银行卡号等敏感信息。我们<b className="text-text">不保存</b>你的原文和图片。</span>
          </div>

          {/* 补充信息（默认展开） */}
          <p className="mt-4 text-[14px] font-600 text-text-muted">
            补充基础信息（选填，可提高准确度）
          </p>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="岗位名称" value={meta.jobTitle} onChange={(v) => setMeta({ ...meta, jobTitle: v })} />
              <Input label="公司名称" value={meta.company} onChange={(v) => setMeta({ ...meta, company: v })} />
              <Input label="薪资范围" value={meta.salary} onChange={(v) => setMeta({ ...meta, salary: v })} placeholder="如 6k-8k / 日结300" />
              <Input label="工作城市" value={meta.city} onChange={(v) => setMeta({ ...meta, city: v })} />
              <div className="sm:col-span-2">
                <span className="block text-[13px] font-600 text-text-muted mb-1.5">岗位类型</span>
                <div className="flex flex-wrap gap-2">
                  {JOB_TYPES.map((t) => (
                    <Chip key={t} active={jobType === t} onClick={() => setJobType(jobType === t ? "未知" : t)}>{t}</Chip>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <span className="block text-[13px] font-600 text-text-muted mb-1.5">我的身份</span>
                <div className="flex flex-wrap gap-2">
                  {IDENTITIES.map((t) => (
                    <Chip key={t} active={meta.identity === t} onClick={() => setMeta({ ...meta, identity: meta.identity === t ? "" : t })}>{t}</Chip>
                  ))}
                </div>
              </div>
            </div>
          {error && <p className="mt-3 text-[14px]" style={{ color: "var(--risk-block)" }}>{error}</p>}

          {/* 主操作 */}
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <button className="btn-hero w-full sm:w-auto justify-center" onClick={go}>
              开始检测
              <span className="btn-hero-ico"><ArrowRight width={18} height={18} /></span>
            </button>
            <button className="btn-ghost w-full sm:w-auto justify-center" onClick={loadExample}>
              <Sparkle width={16} height={16} className="text-brand-300" />
              查看示例检测结果
            </button>
          </div>
        </section>

        {/* 价值点 */}
        <ul className="reveal in mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left" style={{ animationDelay: "260ms" }}>
          {[
            ["无需登录", "打开即用，不收集账号"],
            ["不保存原文", "检测完即丢弃你的内容"],
            ["可复制话术", "生成能直接发给 HR 的追问"],
          ].map(([t, d]) => (
            <li key={t} className="card !p-4">
              <div className="font-display font-700 text-[15px] flex items-center gap-1.5">
                <ArrowRight width={15} height={15} className="text-brand" />{t}
              </div>
              <div className="text-[13px] text-text-muted mt-1">{d}</div>
            </li>
          ))}
        </ul>

        {/* 我们能识别这些风险 */}
        <section className="card !p-6 sm:!p-7 mt-8 text-left">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
            <div>
              <h2 className="font-display font-700 text-[20px]">我们可以识别这些风险</h2>
              <p className="text-[13px] text-text-muted mt-1">覆盖 18+ 类典型招聘陷阱，每类都附依据来源</p>
            </div>
            {/* 风险等级图例 */}
            <div className="flex items-center gap-3 text-[12px] text-text-muted">
              <span className="flex items-center gap-1.5"><i className="inline-block w-2 h-2 rounded-full" style={{ background: "var(--risk-block)" }} />强烈建议暂停</span>
              <span className="flex items-center gap-1.5"><i className="inline-block w-2 h-2 rounded-full" style={{ background: "var(--risk-high)" }} />高风险</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { t: "收费陷阱", d: "押金、培训费、保证金等", sev: "block", src: "人社部《求职风险提示》" },
              { t: "刷单返利", d: "做任务、垫付返佣套路", sev: "block", src: "公安部反诈中心" },
              { t: "培训贷 / 招转培", d: "以招聘名义诱导贷款培训", sev: "block", src: "人社部专项提示" },
              { t: "站外沟通风险", d: "引导加微信 / QQ 私聊", sev: "high", src: "平台官方防骗指南" },
              { t: "信息索取风险", d: "过早索要身份证、验证码", sev: "block", src: "《个人信息保护法》" },
              { t: "兼职日结高风险", d: "异常高薪、无需经验日结", sev: "high", src: "人社部《求职风险提示》" },
            ].map(({ t, d, sev, src }) => (
              <div
                key={t}
                className="group rounded-md border bg-glass px-4 py-3.5 transition-colors hover:bg-glass-strong"
                style={{ borderColor: sev === "block" ? "var(--risk-block-border)" : "var(--risk-high-border)" }}
              >
                <div className="flex items-center gap-2">
                  <i className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sev === "block" ? "var(--risk-block)" : "var(--risk-high)" }} />
                  <span className="font-700 text-[14px]">{t}</span>
                </div>
                <div className="text-[12px] text-text-muted mt-1.5 leading-[1.5]">{d}</div>
                <div className="text-[11px] text-text-subtle mt-2">依据 · {src}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 为什么可信 */}
        <section className="card !p-6 mt-4 text-left">
          <h2 className="font-display font-700 text-[18px] mb-4">为什么可信</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              ["权威规则库", "规则参考政府部门、招聘平台官方防骗指南"],
              ["可溯源解释", "每条风险都附依据与命中原文，不是黑箱"],
              ["隐私保护", "默认不保存内容，检测完即丢弃"],
            ].map(([t, d]) => (
              <div key={t}>
                <div className="font-600 text-[14px] flex items-center gap-1.5">
                  <ArrowRight width={14} height={14} className="text-brand" />{t}
                </div>
                <div className="text-[12px] text-text-muted mt-1 leading-[1.6]">{d}</div>
              </div>
            ))}
          </div>
        </section>

        <p className="mt-10 text-[12px] text-text-subtle leading-relaxed text-left max-w-[60ch] mx-auto">
          本工具仅提供风险提示，不构成法律判断，也不对任何公司或岗位做真假定性。最终决定请结合自身判断与官方渠道核验。
        </p>
      </div>
    </main>
  );
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-600 text-text-muted mb-1.5">{label}</span>
      <input className="field !py-2.5 !text-[15px]" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tag transition-all"
      data-sev={undefined}
      style={active ? { background: "var(--brand-soft)", color: "var(--brand-deep)", borderColor: "var(--brand)" } : undefined}
    >
      {children}
    </button>
  );
}
