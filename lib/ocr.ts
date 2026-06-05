// 截图 OCR 封装
//
// 复用 Qwen 的 OpenAI 兼容接口（DashScope compatible-mode），调用视觉模型
// （qwen-vl-max / qwen-vl-plus）把招聘截图里的文字提取出来。
//
// 设计要点（与 lib/llm.ts 保持一致）：
// - 超时控制（AbortController）
// - 一次重试（仅对超时/5xx/网络错误重试，不对 4xx 重试）
// - 只负责"把图片读成纯文本"，不做业务判级——判级仍走 analyze 层
//
// 注意：DeepSeek 当前不支持图片输入，故 OCR 固定走 Qwen-VL，独立于 LLM_PROVIDER。

import { LLMError } from "./llm";

export interface OCRConfig {
  baseURL: string;
  apiKey: string;
  model: string;
  timeoutMs?: number;
  retries?: number;
}

/** 读取 OCR（视觉模型）配置。优先用 QWEN_VL_*，缺失则回退到 QWEN_*。 */
export function getOCRConfig(): OCRConfig {
  return {
    baseURL:
      process.env.QWEN_VL_BASE_URL ??
      process.env.QWEN_BASE_URL ??
      "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKey: process.env.QWEN_VL_API_KEY ?? process.env.QWEN_API_KEY ?? "",
    model: process.env.QWEN_VL_MODEL ?? "qwen-vl-max",
    timeoutMs: Number(process.env.OCR_TIMEOUT_MS ?? process.env.LLM_TIMEOUT_MS ?? 30000),
  };
}

const OCR_PROMPT =
  "请把这些招聘相关截图里的所有文字**逐字、完整**地提取出来，" +
  "保持原有的换行与顺序，包括岗位描述、薪资、聊天对话、按钮文案等。" +
  "如果有多张图片，按图片顺序依次输出，每张图之间用一个空行分隔。" +
  "只输出图片里的文字本身，不要翻译、不要总结、不要添加任何解释或标点修饰。" +
  "如果所有图片里都没有可识别的文字，只回复：（未识别到文字）";

/**
 * 对一张或多张图片做 OCR，返回提取出的纯文本（多图按顺序拼接）。
 * @param images 一个或多个形如 data:image/png;base64,xxxx 的 data URL
 */
export async function ocrImage(
  images: string | string[],
  cfg: OCRConfig = getOCRConfig(),
): Promise<string> {
  if (!cfg.apiKey) {
    throw new LLMError("缺少视觉模型 API Key（请配置 QWEN_VL_API_KEY 或 QWEN_API_KEY）", "auth");
  }

  const list = Array.isArray(images) ? images : [images];
  if (list.length === 0) {
    throw new LLMError("未提供图片", "bad_request");
  }

  // 单条 user 消息里：先文字指令，再依次附上每张图片
  const userContent = [
    { type: "text" as const, text: OCR_PROMPT },
    ...list.map((url) => ({ type: "image_url" as const, image_url: { url } })),
  ];

  const retries = cfg.retries ?? 1;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.timeoutMs ?? 30000);
    try {
      const res = await fetch(`${cfg.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify({
          model: cfg.model,
          temperature: 0,
          messages: [{ role: "user", content: userContent }],
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        if (res.status === 401 || res.status === 403) {
          throw new LLMError(`鉴权失败(${res.status})`, "auth");
        }
        if (res.status >= 400 && res.status < 500) {
          throw new LLMError(`请求被拒(${res.status}): ${body.slice(0, 200)}`, "bad_request");
        }
        throw new LLMError(`服务端错误(${res.status})`, "server");
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new LLMError("空响应", "server");
      return content.trim();
    } catch (err) {
      lastErr = err;
      if (err instanceof LLMError && (err.kind === "auth" || err.kind === "bad_request")) {
        throw err;
      }
      if ((err as Error)?.name === "AbortError") {
        lastErr = new LLMError("识别超时", "timeout");
      }
    } finally {
      clearTimeout(timer);
    }
  }

  if (lastErr instanceof LLMError) throw lastErr;
  throw new LLMError(`网络错误: ${(lastErr as Error)?.message ?? "unknown"}`, "network");
}
