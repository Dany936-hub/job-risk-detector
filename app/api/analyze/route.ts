import { NextResponse } from "next/server";
import { analyze, type AnalyzeInput } from "@/lib/analyze";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import type { JobType } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30; // Vercel：允许最长 30s

const VALID_JOB_TYPES: JobType[] = ["全职", "实习", "兼职", "远程", "日结", "未知"];
const MAX_LEN = 8000;
// 每 IP 每分钟最多 10 次文字检测，足够正常使用，挡住脚本刷量
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

export async function POST(req: Request) {
  const rl = rateLimit(`analyze:${clientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "请求过于频繁，请稍后再试" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const b = body as Partial<AnalyzeInput> & { text?: unknown };
  const text = typeof b.text === "string" ? b.text.trim() : "";

  if (!text) {
    return NextResponse.json({ error: "请粘贴岗位描述或招聘聊天内容" }, { status: 400 });
  }
  if (text.length > MAX_LEN) {
    return NextResponse.json(
      { error: `内容过长（${text.length} 字），请控制在 ${MAX_LEN} 字以内` },
      { status: 400 },
    );
  }

  const jobType = VALID_JOB_TYPES.includes(b.jobType as JobType)
    ? (b.jobType as JobType)
    : "未知";

  try {
    const result = await analyze({ text, jobType, meta: b.meta });
    // LLM 失败会静默兜底成纯规则结果，用户无感知；记一条 warn 便于日志聚合/告警，
    // 否则线上 LLM 大面积超时或欠费时无从察觉。不含用户原文，符合隐私策略。
    if (!result.llmUsed && result.llmError) {
      console.warn("[analyze] LLM 兜底（纯规则结果）:", result.llmError);
    }
    // 不回传原文，符合"不保存敏感原文"的隐私策略
    return NextResponse.json({
      report: result.report,
      llmUsed: result.llmUsed,
    });
  } catch (err) {
    console.error("[analyze] 失败:", err);
    return NextResponse.json(
      { error: "检测服务暂时不可用，请稍后重试" },
      { status: 500 },
    );
  }
}
