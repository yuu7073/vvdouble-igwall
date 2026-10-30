// VV DOUBLE · IG 內容牆 · Cloud Function
// 後台網頁 → 這裡（Meta / Shopline Token 存在 Realtime Database，前端讀不到）→ Instagram Graph API / Shopline
// 前台 embed.js 直接讀 Realtime Database 的 /igwall/public（公開唯讀），不經過這裡；只有點擊統計會 POST 進來
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const SHOPLINE_TOKEN = defineSecret("SHOPLINE_TOKEN"); // 與官網批次中心、FB 貼文工具共用
const admin = require("firebase-admin");

admin.initializeApp();

const VERSION = "2026-10-31a";
const GRAPH = "https://graph.facebook.com/v21.0";
const SL = "https://open.shopline.io/v1";
const MEDIA_FIELDS = "id,media_type,media_url,thumbnail_url,permalink,caption,timestamp,like_count,comments_count,children{id,media_type,media_url,thumbnail_url}";
const TAG_FIELDS = "id,media_type,media_url,thumbnail_url,permalink,caption,timestamp,like_count,comments_count,username";
const MAX_PAGES = 4; // 每次同步最多抓 4 頁 × 50 = 200 則

const ALLOW_ORIGINS = ["https://yuu7073.github.io", "https://www.vvdouble.com", "https://vvdouble.com", "http://localhost", "http://127.0.0.1", "null"];

function cors(req, res) {
  const origin = req.headers.origin || "null";
  const ok = ALLOW_ORIGINS.some((o) => origin === o || origin.startsWith(o + ":"));
  res.set("Access-Control-Allow-Origin", ok ? origin : ALLOW_ORIGINS[0]);
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, X-Tool-Password, X-Sync-Key");
  res.set("Access-Control-Max-Age", "3600");
}

const db = () => admin.database();
const root = () => db().ref("/igwall");

async function loadConfig() {
  // 密碼、Meta Token 與 FB 貼文工具共用（/fbpost/config），IG 本身的設定在 /igwall/config
  const [f, g] = await Promise.all([db().ref("/fbpost/config").get(), root().child("config").get()]);
  const fb = f.exists() ? f.val() : {};
  const ig = g.exists() ? g.val() : {};
  let shoplineToken = fb.shoplineToken || "";
  if (!shoplineToken) { try { shoplineToken = SHOPLINE_TOKEN.value(); } catch (e) {} }
  return { password: fb.password || "", metaToken: fb.metaToken || "", pageId: fb.pageId || "", syncKey: fb.syncKey || "", shoplineToken, ig };
}

// ---------- Meta ----------
async function fbGet(token, path, params = {}) {
  const u = new URL(path.startsWith("http") ? path : GRAPH + path);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  if (!u.searchParams.get("access_token")) u.searchParams.set("access_token", token);
  const r = await fetch(u);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error("Meta " + (j.error ? j.error.message : r.status));
  return j;
}

async function resolveIgUser(cfg) {
  if (!cfg.metaToken || !cfg.pageId) throw new Error("尚未設定 Meta（請先在 FB 貼文工具換 Token）");
  const j = await fbGet(cfg.metaToken, "/" + cfg.pageId, { fields: "instagram_business_account{id,username,profile_picture_url,followers_count}" });
  const ig = j.instagram_business_account;
  if (!ig || !ig.id) throw new Error("這個粉專沒有連結 Instagram 商業帳號，或 Token 沒有 instagram_basic 權限");
  await root().child("config").update({ igUserId: ig.id, igUsername: ig.username || "", igAvatar: ig.profile_picture_url || "", igFollowers: ig.followers_count || 0, igConnectedAt: Date.now() });
  return ig;
}

function trimMedia(m, src, user) {
  return {
    id: m.id,
    src: src || "own",
    user: m.username || user || "",
    type: m.media_type,
    url: m.media_url || "",
    thumb: m.media_type === "VIDEO" ? (m.thumbnail_url || "") : (m.media_url || ""),
    link: m.permalink || "",
    caption: m.caption || "",
    ts: m.timestamp ? Date.parse(m.timestamp) : 0,
    likes: m.like_count || 0,
    comments: m.comments_count || 0,
    children: m.children && m.children.data ? m.children.data.map((c) => ({ id: c.id, type: c.media_type, url: c.media_url || "", thumb: c.media_type === "VIDEO" ? (c.thumbnail_url || "") : (c.media_url || "") })) : null,
  };
}

async function syncMedia(cfg) {
  let igId = cfg.ig.igUserId;
  if (!igId) igId = (await resolveIgUser(cfg)).id;
  const all = [];
  let next = null;
  for (let p = 0; p < MAX_PAGES; p++) {
    const j = next ? await fbGet(cfg.metaToken, next) : await fbGet(cfg.metaToken, "/" + igId + "/media", { fields: MEDIA_FIELDS, limit: 50 });
    (j.data || []).forEach((m) => all.push(trimMedia(m, "own", cfg.ig.igUsername)));
    next = j.paging && j.paging.next;
    if (!next) break;
  }
  if (!all.length) throw new Error("IG 沒有回傳任何貼文");
  // 顧客標記的貼文（需要 instagram_manage_comments 權限；沒有就跳過，不影響自己的貼文）
  let tagged = 0, tagErr = null;
  try {
    next = null;
    for (let p = 0; p < MAX_PAGES; p++) {
      const j = next ? await fbGet(cfg.metaToken, next) : await fbGet(cfg.metaToken, "/" + igId + "/tags", { fields: TAG_FIELDS, limit: 50 });
      (j.data || []).forEach((m) => { if (m.media_url || m.thumbnail_url) { all.push(trimMedia(m, "tag")); tagged++; } });
      next = j.paging && j.paging.next;
      if (!next) break;
    }
  } catch (e) { tagErr = e.message; console.warn("tags", e.message); }
  const up = {};
  all.forEach((m) => { up["media/" + m.id] = m; });
  up["syncLog"] = { at: Date.now(), ok: true, count: all.length, tagged, tagError: tagErr, error: null };
  await root().update(up);
  // 已發布的內容牆要跟著換新網址（IG 圖片網址會過期）
  await renderPublic();
  return all.length;
}

// ---------- 公開資料（前台讀的）----------
function pubItem(m) {
  if (!m) return null;
  return { id: m.id, type: m.type, url: m.url, thumb: m.thumb, link: m.link, caption: (m.caption || "").slice(0, 600), likes: m.likes || 0, ts: m.ts || 0, children: m.children || null, user: m.user || "", src: m.src || "own" };
}

async function renderPublic() {
  const [cs, ms] = await Promise.all([root().child("config").get(), root().child("media").get()]);
  const cfg = cs.exists() ? cs.val() : {};
  const media = ms.exists() ? ms.val() : {};
  const pick = (ids) => (ids || []).map((id) => pubItem(media[id])).filter(Boolean);
  const home = cfg.home || {};
  const flt = cfg.float || {};
  const products = cfg.products || {};
  const pub = {
    home: { on: home.on !== false, title: home.title == null ? "FOLLOW US" : home.title, handle: cfg.igUsername || "", cols: home.cols || { d: 6, r: 3, m: 3, mr: 4 }, items: pick(home.items), at: Date.now() },
    float: { on: !!flt.on && !!flt.mediaId, pos: flt.pos || "br", size: flt.size || "m", autoplay: !!flt.autoplay, pages: flt.pages || "all", media: pubItem(media[flt.mediaId]), at: Date.now() },
    products: {},
  };
  Object.entries(products).forEach(([pid, p]) => {
    const items = pick(p.items);
    if (items.length) pub.products[pid] = { pos: p.pos || "cart", items, at: Date.now() };
  });
  await root().child("public").set(pub);
  return pub;
}

// ---------- Shopline ----------
async function slFetch(token, path) {
  const r = await fetch(SL + path, { headers: { Authorization: "Bearer " + token, Accept: "application/json" } });
  const text = await r.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status: r.status, body };
}
const SL_FIELDS = "&fields[]=items.id&fields[]=items.title_translations&fields[]=items.status&fields[]=items.medias&fields[]=items.variations&fields[]=items.sku&fields[]=items.created_at";
function slProduct(it) {
  const v = it.variations || [];
  const img = (it.medias || [])[0];
  return {
    id: it.id,
    title: (it.title_translations || {})["zh-hant"] || "",
    status: it.status,
    sku: (v[0] || {}).sku || it.sku || "",
    image: img && img.images ? ((img.images["200x"] && img.images["200x"].url) || (img.images.original && img.images.original.url) || "") : "",
    createdAt: it.created_at || "",
  };
}

// ---------- 主程式 ----------
exports.igwall = onRequest(
  { region: "asia-east1", memory: "512MiB", timeoutSeconds: 120, cors: false, secrets: [SHOPLINE_TOKEN] },
  async (req, res) => {
    cors(req, res);
    if (req.method === "OPTIONS") return res.status(204).send("");
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
    const body = req.body || {};
    const action = body.action;
    if (action === "version") return res.json({ version: VERSION, sha: "__GIT_SHA__" });

    // 前台點擊統計：不用密碼，只接受官網網域
    if (action === "track") {
      const origin = req.headers.origin || "";
      if (!/vvdouble\.com$|localhost|127\.0\.0\.1/.test(origin) && origin !== "null") return res.status(403).json({ error: "forbidden" });
      // ev：view 曝光（整面牆一次送多個 id）/ open 點開 / play 播放 / link 點 IG 連結 / dwell 停留秒數
      const ev = ["view", "open", "play", "link", "dwell"].includes(body.ev) ? body.ev : "open";
      const ctx = ["home", "float", "product"].includes(body.ctx) ? body.ctx : "home";
      const pid = /^[0-9a-f]{24}$/i.test(String(body.pid || "")) ? String(body.pid).toLowerCase() : "";
      const day = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
      const inc = admin.database.ServerValue.increment(1);
      const up = {};
      if (ev === "dwell") {
        const sec = Math.min(1800, Math.max(0, Math.round(Number(body.sec) || 0)));
        if (!sec) return res.json({ ok: true });
        up[`stats/day/${day}/${ctx}_dwell_s`] = admin.database.ServerValue.increment(sec); up[`stats/day/${day}/${ctx}_dwell_n`] = inc;
        if (pid) { up[`stats/day/${day}/p/${pid}/dwell_s`] = admin.database.ServerValue.increment(sec); up[`stats/day/${day}/p/${pid}/dwell_n`] = inc; }
        await root().update(up);
        return res.json({ ok: true });
      }
      const ids = (Array.isArray(body.ids) ? body.ids : [body.mediaId]).map((x) => String(x || "").replace(/[^0-9]/g, "")).filter(Boolean).slice(0, 60);
      if (!ids.length) return res.status(400).json({ error: "mediaId" });
      ids.forEach((id) => {
        up[`stats/media/${id}/${ev}`] = inc; up[`stats/media/${id}/${ctx}_${ev}`] = inc;
        up[`stats/day/${day}/m/${id}/${ev}`] = inc; up[`stats/day/${day}/m/${id}/${ctx}_${ev}`] = inc;
      });
      // 牆的曝光算一次（不乘以格數）
      const n = ev === "view" ? 1 : ids.length;
      up[`stats/day/${day}/${ev}`] = admin.database.ServerValue.increment(n);
      up[`stats/day/${day}/${ctx}_${ev}`] = admin.database.ServerValue.increment(n);
      if (pid) up[`stats/day/${day}/p/${pid}/${ev}`] = admin.database.ServerValue.increment(n);
      await root().update(up);
      return res.json({ ok: true });
    }

    const cfg = await loadConfig();
    const pw = req.get("X-Tool-Password") || "";
    const sk = req.get("X-Sync-Key") || "";
    const viaSync = action === "sync" && cfg.syncKey && sk === cfg.syncKey;
    if (!viaSync && (!cfg.password || pw !== cfg.password)) return res.status(401).json({ error: cfg.password ? "密碼錯誤" : "尚未在 FB 貼文工具設定密碼" });

    try {
      switch (action) {
        case "status": {
          const [ls, ms, ps] = await Promise.all([root().child("syncLog").get(), root().child("media").get(), root().child("public").get()]);
          const media = ms.exists() ? ms.val() : {};
          const pub = ps.exists() ? ps.val() : {};
          return res.json({
            version: VERSION,
            meta: !!(cfg.metaToken && cfg.pageId),
            ig: { userId: cfg.ig.igUserId || "", username: cfg.ig.igUsername || "", avatar: cfg.ig.igAvatar || "", followers: cfg.ig.igFollowers || 0 },
            sync: ls.exists() ? ls.val() : null,
            mediaCount: Object.keys(media).length,
            config: { home: cfg.ig.home || {}, float: cfg.ig.float || {}, products: cfg.ig.products || {} },
            publishedAt: { home: pub.home ? pub.home.at : 0, float: pub.float ? pub.float.at : 0 },
            productCount: pub.products ? Object.keys(pub.products).length : 0,
          });
        }
        case "igConnect": {
          const ig = await resolveIgUser(cfg);
          cfg.ig.igUserId = ig.id;
          const n = await syncMedia(cfg);
          return res.json({ ok: true, ig, count: n });
        }
        case "sync": {
          try {
            const n = await syncMedia(cfg);
            return res.json({ ok: true, count: n });
          } catch (e) {
            await root().child("syncLog").update({ at: Date.now(), ok: false, error: e.message });
            throw e;
          }
        }
        case "media": {
          const s = await root().child("media").get();
          const list = Object.values(s.exists() ? s.val() : {}).sort((a, b) => (b.ts || 0) - (a.ts || 0));
          return res.json({ items: list.map((m) => ({ id: m.id, type: m.type, thumb: m.thumb, url: m.type === "VIDEO" ? m.url : "", link: m.link, caption: (m.caption || "").slice(0, 160), ts: m.ts, likes: m.likes, comments: m.comments, n: m.children ? m.children.length : 1, src: m.src || "own", user: m.user || "" })) });
        }
        case "saveHome": {
          const h = body.home || {};
          const items = Array.isArray(h.items) ? h.items.map(String).filter(Boolean).slice(0, 60) : [];
          const cols = h.cols || {};
          const clamp = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : d; };
          await root().child("config/home").set({ on: h.on !== false, title: String(h.title == null ? "FOLLOW US" : h.title).slice(0, 60), items, cols: { d: clamp(cols.d, 2, 8, 6), r: clamp(cols.r, 1, 6, 3), m: clamp(cols.m, 1, 4, 3), mr: clamp(cols.mr, 1, 8, 4) }, updatedAt: Date.now(), by: String(body.by || "").slice(0, 40) });
          return res.json({ ok: true });
        }
        case "saveFloat": {
          const f = body.float || {};
          await root().child("config/float").set({ on: !!f.on, mediaId: String(f.mediaId || ""), pos: f.pos === "bl" ? "bl" : "br", size: ["s", "m", "l"].includes(f.size) ? f.size : "m", autoplay: !!f.autoplay, pages: f.pages === "home" ? "home" : "all", updatedAt: Date.now(), by: String(body.by || "").slice(0, 40) });
          return res.json({ ok: true });
        }
        case "saveProduct": {
          // body.ids = 要套用的商品 id 陣列（同色款一起套用時會有多個）
          const ids = (Array.isArray(body.ids) ? body.ids : [body.productId]).map((x) => String(x || "")).filter((x) => /^[0-9a-f]{24}$/i.test(x));
          if (!ids.length) return res.status(400).json({ error: "productId" });
          const items = Array.isArray(body.items) ? body.items.map(String).filter(Boolean).slice(0, 3) : [];
          const pos = ["cart", "desc", "float"].includes(body.pos) ? body.pos : "cart";
          const up = {};
          ids.forEach((id) => { up["config/products/" + id] = items.length ? { items, pos, title: String(body.title || "").slice(0, 120), sku: String(body.sku || "").slice(0, 40), updatedAt: Date.now(), by: String(body.by || "").slice(0, 40) } : null; });
          await root().update(up);
          return res.json({ ok: true, ids });
        }
        case "publish": {
          const pub = await renderPublic();
          return res.json({ ok: true, home: pub.home.items.length, float: pub.float.on, products: Object.keys(pub.products).length });
        }
        case "shoplineSearch": {
          if (!cfg.shoplineToken) return res.status(400).json({ error: "尚未設定 Shopline Token" });
          const q = String(body.query || "").trim();
          const page = Math.max(1, Number(body.page || 1));
          let items = [];
          if (!q) {
            const r = await slFetch(cfg.shoplineToken, `/products?per_page=40&page=${page}&sort_by=created_at&order_by=desc${SL_FIELDS}`);
            items = (r.body && r.body.items) || [];
          } else {
            const r1 = await slFetch(cfg.shoplineToken, `/products/search?query=${encodeURIComponent(q)}&per_page=40${SL_FIELDS}`);
            items = (r1.body && r1.body.items) || [];
            if (/^[0-9A-Z]{4,}$/i.test(q)) {
              const r2 = await slFetch(cfg.shoplineToken, `/products?sku=${encodeURIComponent(q)}&per_page=40${SL_FIELDS}`);
              const seen = new Set(items.map((i) => i.id));
              ((r2.body && r2.body.items) || []).forEach((m) => { if (!seen.has(m.id)) items.push(m); });
            }
          }
          const list = items.map(slProduct);
          if (/^[0-9A-Z]{4,}$/i.test(q)) { const pre = q.toUpperCase(); list.sort((a, b) => (b.sku.toUpperCase().startsWith(pre) ? 1 : 0) - (a.sku.toUpperCase().startsWith(pre) ? 1 : 0)); }
          return res.json({ items: list, page });
        }
        case "stats": {
          // 只回最近 90 天的每日資料（含每則貼文）
          const since = new Date(Date.now() + 8 * 3600e3 - 90 * 86400e3).toISOString().slice(0, 10);
          const ds = await root().child("stats/day").orderByKey().startAt(since).get();
          return res.json({ day: ds.exists() ? ds.val() : {} });
        }
        default:
          return res.status(400).json({ error: "unknown action " + action });
      }
    } catch (e) {
      console.error(action, e);
      return res.status(500).json({ error: e.message || String(e) });
    }
  }
);

// 每小時同步 IG 貼文並更新已發布的內容牆（IG 圖片網址會過期）
exports.igwallSync = onSchedule({ schedule: "23 * * * *", timeZone: "Asia/Taipei", region: "asia-east1", memory: "512MiB", timeoutSeconds: 120 }, async () => {
  const cfg = await loadConfig();
  if (!cfg.metaToken || !cfg.pageId) return;
  try { await syncMedia(cfg); } catch (e) { console.error("igwallSync", e); await root().child("syncLog").update({ at: Date.now(), ok: false, error: e.message }); }
});
