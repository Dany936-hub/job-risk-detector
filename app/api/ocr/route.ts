import { NextResponse } from "next/server";
import { ocrImage } from "@/lib/ocr";
import { LLMError } from "@/lib/llm";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

// OCR 走视觉模型、更贵，限得更紧：每 IP 每分钟 6 次
const RATE_LIMIT = 6;
const RATE_WINDOW_MS = 60_000;

// 接收前端上传的图片（base64 data URL），用视觉模型识别成文字返回。
// 不保存图片，识别完即丢弃，符合"不保存用户内容"的隐私策略。

const ALLOWED = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
// 单张 data URL 体积上限（base64 比原图大约 1.33×）；约对应 ~6MB 原图。
const MAX_DATA_URL_LEN = 8 * 1024 * 1024;
const MAX_IMAGES = 6;

export async function POST(req: Request) {
  const rl = rateLimit(`ocr:${clientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "识别请求过于频繁，请稍后再试" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  // 兼容单图（image）与多图（images），统一成数组处理
  const raw = body as { images?: unknown; image?: unknown };
  const images =
    Array.isArray(raw.images) ? raw.images
    : typeof raw.image === "string" ? [raw.image]
    : [];

  if (images.length === 0) {
    return NextResponse.json({ error: "请上传有效的图片" }, { status: 400 });
  }
  if (images.length > MAX_IMAGES) {
    return NextResponse.json(
      { error: `一次最多识别 ${MAX_IMAGES} 张截图` },
      { status: 400 },
    );
  }

  for (const img of images) {
    if (typeof img !== "string" || !img.startsWith("data:image/")) {
      return NextResponse.json({ error: "请上传有效的图片" }, { status: 400 });
    }
    const mime = img.slice(5, img.indexOf(";"));
    if (!ALLOWED.includes(mime)) {
      return NextResponse.json(
        { error: "仅支持 PNG / JPG / WebP 格式的截图" },
        { status: 400 },
      );
    }
    if (img.length > MAX_DATA_URL_LEN) {
      return NextResponse.json(
        { error: "有图片过大，请压缩或截取关键部分后重试" },
        { status: 400 },
      );
    }
  }

  try {
    const text = await ocrImage(images as string[]);
    const cleaned = text === "（未识别到文字）" ? "" : text;
    return NextResponse.json({ text: cleaned });
  } catch (err) {
    console.error("[ocr] 失败:", err);
    if (err instanceof LLMError && err.kind === "auth") {
      return NextResponse.json(
        { error: "截图识别未配置或鉴权失败，请先手动粘贴文字" },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "截图识别暂时不可用，请稍后重试或手动粘贴文字" },
      { status: 500 },
    );
  }
}
