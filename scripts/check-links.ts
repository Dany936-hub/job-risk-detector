// 知识库来源死链巡检
//
// 遍历 SOURCES 所有官方来源 URL，检查是否仍可访问。
// 用法：
//   npx tsx scripts/check-links.ts        # 巡检，发现确认死链则退出码 1
//
// 注意：
// - 政府站常对非浏览器 UA 反爬，故带浏览器 UA、用 GET、跟随跳转。
// - 403/429/超时归为"可疑"（多为反爬/抖动，非真死链）→ 仅告警，不致失败。
// - 404/410/连接失败归为"死链"→ 退出码 1。
// - 本脚本依赖外网，不进 build 强制闸门，适合手动或定时 CI 运行。

import { SOURCES, sourceLabel } from "../app/knowledge/data";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const TIMEOUT_MS = 15000;

type Status = "alive" | "suspect" | "dead";

async function probe(url: string): Promise<{ status: Status; detail: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": UA, Accept: "text/html,*/*" },
      redirect: "follow",
      signal: ctrl.signal,
    });
    const code = res.status;
    if (code >= 200 && code < 400) return { status: "alive", detail: `HTTP ${code}` };
    if (code === 404 || code === 410) return { status: "dead", detail: `HTTP ${code}` };
    // 403/429/5xx 等：多为反爬或临时抖动，标可疑不判死
    return { status: "suspect", detail: `HTTP ${code}` };
  } catch (err) {
    const msg = (err as Error)?.name === "AbortError" ? "超时" : (err as Error)?.message ?? "网络错误";
    // 连接失败（DNS/证书/拒绝）视为死链；超时视为可疑（站点慢/反爬）
    if (msg === "超时") return { status: "suspect", detail: "超时" };
    return { status: "dead", detail: msg };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const entries = Object.values(SOURCES);
  console.log(`巡检知识库来源 ${entries.length} 条…\n`);

  const dead: string[] = [];
  const suspect: string[] = [];

  // 串行，避免并发触发反爬
  for (const s of entries) {
    const { status, detail } = await probe(s.url);
    const icon = status === "alive" ? "✅" : status === "suspect" ? "⚠️ " : "❌";
    console.log(`${icon} [${detail}] ${sourceLabel(s)}`);
    console.log(`     ${s.url}`);
    if (status === "dead") dead.push(`${sourceLabel(s)} → ${s.url}（${detail}）`);
    if (status === "suspect") suspect.push(`${sourceLabel(s)}（${detail}）`);
  }

  console.log("");
  if (suspect.length) {
    console.log(`⚠️  可疑 ${suspect.length} 条（多为反爬/超时，请人工在浏览器确认）：`);
    suspect.forEach((s) => console.log(`   - ${s}`));
  }
  if (dead.length) {
    console.log(`\n❌ 确认死链 ${dead.length} 条，请更换来源或修正 URL：`);
    dead.forEach((d) => console.log(`   - ${d}`));
    console.log("\n———— 巡检未通过 ————");
    process.exit(1);
  }
  console.log(`\n———— ✅ 无确认死链（可疑 ${suspect.length} 条需人工复核）————`);
  process.exit(0);
}

main();
