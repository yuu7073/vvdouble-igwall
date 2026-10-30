// 把官網頁面存成靜態預覽頁：拿掉所有 script、把 Tagnology 區塊換成我們的 #vv-igwall、掛上 embed.js
// 用法：node tools/snapshot.js <url> <out.html> <home|product>
const fs = require("fs");
const [,, url, out, kind] = process.argv;
(async () => {
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130 Safari/537.36", "Accept-Language": "zh-TW,zh;q=0.9" } });
  let html = await r.text();
  // 拿掉 script / noscript / iframe（Angular、GTM、Tagnology 都不載）
  html = html.replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/<noscript\b[\s\S]*?<\/noscript>/gi, "").replace(/<iframe\b[\s\S]*?<\/iframe>/gi, "");
  // Tagnology 首頁牆 → 我們的牆
  html = html.replace(/<!-- Embed Tagnology Code -->[\s\S]*?<!-- End Embed Tagnology Code -->/g, '<div id="vv-igwall" style="max-width:1200px;margin:0 auto;padding:0 15px"></div>');
  html = html.replace(/<div class="embed-tagnology"[\s\S]*?<\/div>/g, '<div id="vv-igwall" style="max-width:1200px;margin:0 auto;padding:0 15px"></div>');
  // lazy 圖片
  html = html.replace(/<img([^>]*?)\sdata-src=("[^"]*")([^>]*)>/gi, (m, a, src, b) => /\ssrc=/.test(a + b) ? m.replace(/\ssrc="[^"]*"/, " src=" + src) : `<img${a} src=${src}${b}>`);
  // ng-cloak / ng-hide 會讓沒跑 Angular 的內容整片隱藏
  html = html.replace(/\sng-cloak(=""| )/g, " ").replace(/class="([^"]*)\bng-cloak\b/g, 'class="$1');
  const cfg = kind === "product"
    ? `window.mainConfig={pageType:"products-show",trackerEventData:{"Product ID":"__PID__"}};`
    : `window.mainConfig={pageType:"home"};`;
  const inject = `<base href="https://www.vvdouble.com/">\n<style>[ng-cloak]{display:block!important}.vvig-preview-bar{position:fixed;left:0;right:0;top:0;z-index:2147483647;height:32px;background:#1F2430;color:#fff;font:12px/32px system-ui,sans-serif;padding:0 14px;letter-spacing:.5px}body{padding-top:32px!important}</style>`;
  html = html.replace(/<head([^>]*)>/i, `<head$1>\n${inject}`);
  const bar = `<div class="vvig-preview-bar">預覽模式 · 官網快照 · 這不是正式網站</div>\n<script>${cfg}</script>\n<script defer src="https://yuu7073.github.io/vvdouble-igwall/embed.js"></script>`;
  html = html.replace(/<body([^>]*)>/i, `<body$1>\n${bar}`);
  // 商品 ID：從頁面 meta 或 trackerEventData 抓
  if (kind === "product") {
    const m = html.match(/data-product-id="([0-9a-f]{24})"/) || html.match(/"Product ID":"([0-9a-f]{24})"/) || html.match(/product_id["']?\s*[:=]\s*["']([0-9a-f]{24})/);
    html = html.replace("__PID__", m ? m[1] : "");
  }
  fs.mkdirSync(require("path").dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log(out, html.length, "bytes");
})().catch((e) => { console.error(e); process.exit(1); });
