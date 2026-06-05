// LLM 客户端封装
//
// DeepSeek 与 Qwen(DashScope 兼容模式) 均提供 OpenAI 兼容的 /chat/completions 接口，
// 故用同一套 fetch 逻辑，仅 baseURL / model / apiKey 不同。
//
// 设计要点：
// - 强制 response_format: json_object（DeepSeek/Qwen 支持），提高合法 JSON 概率
// - 超时控制（AbortController）
// - 一次重试（仅对超时/5xx/网络错误重试，不对 4xx 重试）
// - 不在此层解析业务 JSON，只负责"拿到字符串"，解析与校验交给 analyze 层

export interface LLMConfig {
  baseURL: string;
  apiKey: string;
  model: string;
  /** 单次请求超时（毫秒） */
  timeoutMs?: number;
  /** 失败重试次数（默认 1） */
  retries?: number;
}

/** 从环境变量读取配置。支持 LLM_PROVIDER=deepseek|qwen 切换。 */
export function getLLMConfig(): LLMConfig {
  const provider = (process.env.LLM_PROVIDER ?? "deepseek").toLowerCase();
  if (provider === "qwen") {
    return {
      baseURL:
        process.env.QWEN_BASE_URL ??
        "https://dashscope.aliyuncs.com/compatible-mode/v1",
      apiKey: process.env.QWEN_API_KEY ?? "",
      model: process.env.QWEN_MODEL ?? "qwen-plus",
      timeoutMs: Number(process.env.LLM_TIMEOUT_MS ?? 25000),
    };
  }
  // 默认 deepseek
  return {
    baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1",
    apiKey: process.env.DEEPSEEK_API_KEY ?? "",
    model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
    timeoutMs: Number(process.env.LLM_TIMEOUT_MS ?? 25000),
  };
}

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly kind: "auth" | "timeout" | "server" | "network" | "bad_request",
  ) {
    super(message);
    this.name = "LLMError";
  }
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * 调用 LLM，返回原始文本内容（期望是 JSON 字符串）。
 * 不解析业务结构——解析交给调用方，以便做更精细的兜底。
 */
export async function chatJSON(
  messages: ChatMessage[],
  cfg: LLMConfig = getLLMConfig(),
): Promise<string> {
  if (!cfg.apiKey) {
    throw new LLMError("缺少 API Key（请配置环境变量）", "auth");
  }

  const retries = cfg.retries ?? 1;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.timeoutMs ?? 25000);
    try {
      const res = await fetch(`${cfg.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify({
          model: cfg.model,
          messages,
          temperature: 0.3, // 偏稳定，降低措辞随机性
          response_format: { type: "json_object" },
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
        // 5xx → 可重试
        throw new LLMError(`服务端错误(${res.status})`, "server");
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new LLMError("空响应", "server");
      return content;
    } catch (err) {
      lastErr = err;
      // 仅对超时/网络/5xx 重试；auth/bad_request 直接抛出
      if (err instanceof LLMError && (err.kind === "auth" || err.kind === "bad_request")) {
        throw err;
      }
      if ((err as Error)?.name === "AbortError") {
        lastErr = new LLMError("请求超时", "timeout");
      }
      // 还有重试机会则继续
    } finally {
      clearTimeout(timer);
    }
  }

  if (lastErr instanceof LLMError) throw lastErr;
  throw new LLMError(`网络错误: ${(lastErr as Error)?.message ?? "unknown"}`, "network");
}
