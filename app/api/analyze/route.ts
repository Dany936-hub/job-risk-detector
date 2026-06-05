import { NextResponse } from "next/server";
import { analyze, type AnalyzeInput } from "@/lib/analyze";
import type { JobType } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30; // Vercel：允许最长 30s

const VALID_JOB_TYPES: JobType[] = ["全职", "实习", "兼职", "远程", "日结", "未知"];
const MAX_LEN = 8000;

export async function POST(req: Request) {
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
