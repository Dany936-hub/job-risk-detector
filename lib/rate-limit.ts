// 轻量速率限制（零依赖、进程内内存）
//
// 目的：给直连付费模型的 /api/analyze、/api/ocr 加一道防滥用闸门，挡住单机脚本刷量
// 导致 token 被刷爆。基于客户端 IP 的固定窗口计数。
//
// 局限（务实说明，不假装是强保证）：
// - 计数存在进程内存，Serverless（如 Vercel）多实例/冷启动间不共享，只能挡住打到
//   同一实例的请求；要做严格的全局限流需换 Upstash Redis 等外部存储。
// - IP 取自反代头（x-forwarded-for），可被伪造；仅作第一道防线，非安全边界。
// 即便如此，对"打开即用、无登录"的工具，这一层已能拦下绝大多数无脑刷量。

interface Bucket {
  count: number;
  /** 窗口重置的时间戳（ms） */
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** 周期性清理过期桶，避免长生命周期进程内存无限增长 */
function sweep(now: number) {
  if (buckets.size < 1000) return; // 量小时不必清理
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k);
  }
}

export interface RateLimitResult {
  ok: boolean;
  /** 距窗口重置的剩余秒数（用于 Retry-After） */
  retryAfter: number;
}

/**
 * 固定窗口限流。
 * @param key    限流主体（通常是 `路由:IP`）
 * @param limit  窗口内允许的最大请求数
 * @param windowMs 窗口长度（毫秒）
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (b.count < limit) {
    b.count++;
    return { ok: true, retryAfter: 0 };
  }
  return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
}

/** 从请求头尽力取客户端 IP（反代场景）。取不到则归一到 "unknown"（会被一起限流）。 */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
