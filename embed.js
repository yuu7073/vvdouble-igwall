/* VV DOUBLE · IG 內容牆 前台 · 放在 Shopline 的語法：
   首頁：<div id="vv-igwall"></div>（放哪裡牆就在哪裡）
   全站：script defer src="https://yuu7073.github.io/vvdouble-igwall/embed.js"
   資料來源：Realtime Database /igwall/public（公開唯讀），由後台「發布到官網」寫入 */
(function () {
  if (window.__vvigLoaded) return; window.__vvigLoaded = true;
  var DB = "https://vvdouble-shopline-default-rtdb.asia-southeast1.firebasedatabase.app/igwall/public";
  var FN = "https://asia-east1-vvdouble-shopline.cloudfunctions.net/igwall";
  var d = document;

  function get(path) { return fetch(DB + path + ".json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }
  function el(tag, cls, html) { var e = d.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function mc() { return window.mainConfig || {}; }
  function isHome() { var p = location.pathname.replace(/\/+$/, ""); return p === "" || p === "/" || /^\/[a-z]{2}(-[A-Za-z]{2,4})?$/.test(p) || mc().pageType === "home"; }
  function productId() { var t = mc().trackerEventData || {}; return t["Product ID"] || t.product_id || ""; }
  function track(ev, ctx, m) {
    try { (window.dataLayer = window.dataLayer || []).push({ event: "ig_wall_" + ev, ig_ctx: ctx, ig_media: m.id, ig_type: m.type }); } catch (e) {}
    try { fetch(FN, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "track", ev: ev, ctx: ctx, mediaId: m.id }), keepalive: true }).catch(function () {}); } catch (e) {}
  }
  // 曝光：元素有一半進到畫面才算，一次頁面只算一次
  function trackView(el, ctx, items) {
    if (!el || !items.length || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (es) {
      if (!es.some(function (e) { return e.isIntersecting; })) return;
      io.disconnect();
      try { (window.dataLayer = window.dataLayer || []).push({ event: "ig_wall_view", ig_ctx: ctx, ig_count: items.length }); } catch (e) {}
      try { fetch(FN, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "track", ev: "view", ctx: ctx, ids: items.map(function (m) { return m.id; }) }), keepalive: true }).catch(function () {}); } catch (e) {}
    }, { threshold: ctx === "float" ? 0.01 : 0.4 });
    io.observe(el);
  }
  var ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  var ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var ICON_L = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
  var ICON_R = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  var ICON_IG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>';

  // ---------- 樣式 ----------
  var css = "" +
    ".vvig-wall{margin:0 auto;padding:0 0 8px;font-family:inherit;color:#1F2430}" +
    ".vvig-head{display:flex;align-items:baseline;gap:12px;margin:0 0 16px}" +
    ".vvig-title{font-size:20px;font-weight:700;letter-spacing:1px;margin:0}" +
    ".vvig-handle{font-size:13px;color:#5A6170;text-decoration:none}" +
    ".vvig-grid{display:grid;gap:6px;grid-template-columns:repeat(var(--vvig-m),minmax(0,1fr))}" +
    "@media(min-width:768px){.vvig-grid{grid-template-columns:repeat(var(--vvig-d),minmax(0,1fr))}}" +
    ".vvig-it{position:relative;aspect-ratio:1;overflow:hidden;background:#EEE;border:0;padding:0;cursor:pointer;display:block;width:100%}" +
    ".vvig-it img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .3s}" +
    ".vvig-it:hover img{transform:scale(1.04)}" +
    ".vvig-badge{position:absolute;right:8px;top:8px;width:24px;height:24px;border-radius:12px;background:rgba(31,36,48,.7);display:flex;align-items:center;justify-content:center}" +
    ".vvig-badge svg{width:12px;height:12px;fill:#fff}" +
    ".vvig-multi{position:absolute;right:8px;top:8px;width:24px;height:24px;display:flex;align-items:center;justify-content:center}" +
    ".vvig-multi svg{width:16px;height:16px;fill:none;stroke:#fff;stroke-width:2;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))}" +
    /* 彈窗 */
    ".vvig-ov{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;transition:opacity .2s}" +
    ".vvig-ov.vvig-on{opacity:1}" +
    ".vvig-box{position:relative;width:min(980px,100%);max-height:min(680px,100%);background:#fff;border-radius:12px;overflow:hidden;display:flex;box-shadow:0 20px 60px rgba(0,0,0,.35)}" +
    ".vvig-med{position:relative;flex:0 0 60%;background:#111;display:flex;align-items:center;justify-content:center;aspect-ratio:1}" +
    ".vvig-med img,.vvig-med video{width:100%;height:100%;object-fit:contain;display:block;background:#111}" +
    ".vvig-nav{position:absolute;top:50%;margin-top:-18px;width:36px;height:36px;border-radius:18px;border:0;background:rgba(255,255,255,.88);color:#1F2430;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0}" +
    ".vvig-nav svg{width:16px;height:16px}.vvig-prev{left:12px}.vvig-next{right:12px}" +
    ".vvig-dots{position:absolute;left:0;right:0;bottom:12px;display:flex;justify-content:center;gap:6px}" +
    ".vvig-dots i{width:6px;height:6px;border-radius:3px;background:rgba(255,255,255,.5)}.vvig-dots i.vvig-cur{background:#fff}" +
    ".vvig-side{flex:1;min-width:0;display:flex;flex-direction:column;padding:24px 24px 20px;gap:14px;color:#1F2430;font-family:inherit}" +
    ".vvig-user{display:flex;align-items:center;gap:10px;font-size:14px;font-weight:700}" +
    ".vvig-user .vvig-av{width:32px;height:32px;border-radius:16px;background:#1F2430;display:flex;align-items:center;justify-content:center;color:#fff}.vvig-av svg{width:16px;height:16px}" +
    ".vvig-close{margin-left:auto;width:32px;height:32px;border:0;background:transparent;color:#1F2430;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}.vvig-close svg{width:18px;height:18px}" +
    ".vvig-cap{flex:1;overflow:auto;font-size:14px;line-height:1.8;white-space:pre-wrap;word-break:break-word;min-height:0}" +
    ".vvig-meta{font-size:13px;color:#5A6170}" +
    ".vvig-go{display:flex;align-items:center;justify-content:center;height:44px;border:1px solid #1F2430;border-radius:6px;font-size:14px;font-weight:500;color:#1F2430;text-decoration:none}" +
    "@media(max-width:767px){.vvig-box{flex-direction:column;max-height:92vh;width:100%}.vvig-med{flex:0 0 auto;width:100%;aspect-ratio:4/5;max-height:62vh}.vvig-side{padding:14px 16px 16px;gap:10px}.vvig-cap{font-size:13px;line-height:1.7;max-height:22vh}.vvig-go{height:40px}}" +
    /* 浮動影片 */
    ".vvig-float{position:fixed;bottom:24px;z-index:2147482000;border-radius:12px;overflow:hidden;box-shadow:0 8px 28px rgba(0,0,0,.25);background:#111;cursor:pointer;transition:transform .2s}" +
    ".vvig-float:hover{transform:translateY(-2px)}" +
    ".vvig-float.vvig-br{right:16px}.vvig-float.vvig-bl{left:16px}" +
    ".vvig-float.vvig-s{width:96px}.vvig-float.vvig-m{width:120px}.vvig-float.vvig-l{width:150px}" +
    ".vvig-float img,.vvig-float video{width:100%;aspect-ratio:9/16;object-fit:cover;display:block}" +
    ".vvig-fplay{position:absolute;left:50%;top:50%;width:36px;height:36px;margin:-18px 0 0 -18px;border-radius:18px;background:rgba(255,255,255,.9);display:flex;align-items:center;justify-content:center}.vvig-fplay svg{width:16px;height:16px;fill:#1F2430}" +
    ".vvig-fx{position:absolute;right:6px;top:6px;width:22px;height:22px;border-radius:11px;border:0;background:rgba(255,255,255,.9);color:#1F2430;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0}.vvig-fx svg{width:10px;height:10px}" +
    ".vvig-fcap{position:absolute;left:0;right:0;bottom:0;padding:8px 10px;background:linear-gradient(transparent,rgba(31,36,48,.75));color:#fff;font-size:11px;line-height:1.4;max-height:3.6em;overflow:hidden;pointer-events:none}" +
    "@media(max-width:767px){.vvig-float{bottom:72px}.vvig-float.vvig-s{width:80px}.vvig-float.vvig-m{width:96px}.vvig-float.vvig-l{width:120px}}" +
    /* 商品頁 */
    ".vvig-prod{margin:16px 0;font-family:inherit}" +
    ".vvig-plabel{font-size:12px;letter-spacing:1px;color:#5A6170;margin:0 0 8px;display:flex;align-items:center;gap:6px}.vvig-plabel svg{width:14px;height:14px}" +
    ".vvig-prow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;max-width:360px}" +
    ".vvig-pit{position:relative;aspect-ratio:9/16;border-radius:8px;overflow:hidden;background:#EEE;border:0;padding:0;cursor:pointer;width:100%}" +
    ".vvig-pit img{width:100%;height:100%;object-fit:cover;display:block}" +
    ".vvig-pit .vvig-badge{right:6px;top:6px;width:22px;height:22px}";
  var st = el("style"); st.textContent = css; d.head.appendChild(st);

  // ---------- 彈窗 ----------
  var handle = "";
  function openBox(m, ctx, startVideo) {
    var slides = (m.type === "CAROUSEL_ALBUM" && m.children && m.children.length) ? m.children : [{ id: m.id, type: m.type, url: m.url, thumb: m.thumb }];
    var idx = 0;
    var ov = el("div", "vvig-ov");
    var box = el("div", "vvig-box");
    var med = el("div", "vvig-med");
    var side = el("div", "vvig-side");
    var date = m.ts ? new Date(m.ts) : null;
    var dstr = date ? date.getFullYear() + "/" + ("0" + (date.getMonth() + 1)).slice(-2) + "/" + ("0" + date.getDate()).slice(-2) : "";
    side.innerHTML = '<div class="vvig-user"><span class="vvig-av">' + ICON_IG + "</span><span>" + esc(handle || "vvdoubleofficial") + '</span><button class="vvig-close" type="button" aria-label="關閉">' + ICON_X + "</button></div>" +
      '<div class="vvig-cap">' + esc(m.caption || "") + "</div>" +
      '<div class="vvig-meta">' + (m.likes ? m.likes.toLocaleString() + " 個讚 · " : "") + esc(dstr) + "</div>" +
      (m.link ? '<a class="vvig-go" href="' + esc(m.link) + '" target="_blank" rel="noopener">在 Instagram 查看</a>' : "");
    box.appendChild(med); box.appendChild(side); ov.appendChild(box); d.body.appendChild(ov);
    requestAnimationFrame(function () { ov.classList.add("vvig-on"); });

    function render() {
      var s = slides[idx];
      med.innerHTML = "";
      if (s.type === "VIDEO" && s.url) {
        var v = el("video"); v.src = s.url; v.controls = true; v.playsInline = true; v.setAttribute("playsinline", ""); v.poster = s.thumb || ""; v.preload = "metadata";
        med.appendChild(v);
        if (startVideo || idx > 0) { v.muted = false; v.play().catch(function () {}); }
        v.addEventListener("play", function () { track("play", ctx, m); }, { once: true });
      } else {
        var im = el("img"); im.src = s.url || s.thumb; im.alt = ""; med.appendChild(im);
      }
      if (slides.length > 1) {
        var p = el("button", "vvig-nav vvig-prev", ICON_L); p.type = "button"; p.setAttribute("aria-label", "上一張");
        var n = el("button", "vvig-nav vvig-next", ICON_R); n.type = "button"; n.setAttribute("aria-label", "下一張");
        p.addEventListener("click", function (e) { e.stopPropagation(); idx = (idx - 1 + slides.length) % slides.length; render(); });
        n.addEventListener("click", function (e) { e.stopPropagation(); idx = (idx + 1) % slides.length; render(); });
        med.appendChild(p); med.appendChild(n);
        var dots = el("div", "vvig-dots"); slides.forEach(function (_, i) { dots.appendChild(el("i", i === idx ? "vvig-cur" : "")); }); med.appendChild(dots);
      }
    }
    render();
    function close() { ov.classList.remove("vvig-on"); setTimeout(function () { ov.remove(); }, 200); d.removeEventListener("keydown", onKey); }
    function onKey(e) { if (e.key === "Escape") close(); }
    ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
    side.querySelector(".vvig-close").addEventListener("click", close);
    d.addEventListener("keydown", onKey);
    var go = side.querySelector(".vvig-go"); if (go) go.addEventListener("click", function () { track("link", ctx, m); });
    track("open", ctx, m);
  }

  function thumbBtn(m, cls, ctx) {
    var b = el("button", cls); b.type = "button"; b.setAttribute("aria-label", "開啟 Instagram 貼文");
    var im = el("img"); im.loading = "lazy"; im.decoding = "async"; im.alt = ""; im.src = m.thumb || m.url; b.appendChild(im);
    if (m.type === "VIDEO") b.appendChild(el("span", "vvig-badge", ICON_PLAY));
    else if (m.type === "CAROUSEL_ALBUM") b.appendChild(el("span", "vvig-multi", '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="3" width="14" height="14" rx="2"/><path d="M3 7v12a2 2 0 0 0 2 2h12"/></svg>'));
    b.addEventListener("click", function () { openBox(m, ctx, m.type === "VIDEO"); });
    return b;
  }

  // ---------- 首頁牆 ----------
  function mountHome(host) {
    get("/home").then(function (h) {
      if (!h || h.on === false || !h.items || !h.items.length) return;
      handle = h.handle || handle;
      var c = h.cols || { d: 6, r: 3, m: 3, mr: 4 };
      var wall = el("div", "vvig-wall");
      wall.style.setProperty("--vvig-d", c.d); wall.style.setProperty("--vvig-m", c.m);
      if (h.title) {
        var head = el("div", "vvig-head");
        head.appendChild(el("h2", "vvig-title", esc(h.title)));
        if (h.handle) { var a = el("a", "vvig-handle", "@" + esc(h.handle)); a.href = "https://www.instagram.com/" + encodeURIComponent(h.handle) + "/"; a.target = "_blank"; a.rel = "noopener"; head.appendChild(a); }
        wall.appendChild(head);
      }
      var grid = el("div", "vvig-grid");
      var maxD = c.d * c.r, maxM = c.m * c.mr;
      h.items.slice(0, Math.max(maxD, maxM)).forEach(function (m, i) {
        var b = thumbBtn(m, "vvig-it", "home");
        if (i >= maxD) b.classList.add("vvig-dOff");
        if (i >= maxM) b.classList.add("vvig-mOff");
        grid.appendChild(b);
      });
      wall.appendChild(grid);
      host.innerHTML = ""; host.appendChild(wall);
      trackView(grid, "home", h.items.slice(0, window.innerWidth >= 768 ? maxD : maxM));
    });
  }
  var st2 = el("style"); st2.textContent = ".vvig-mOff{display:none}@media(min-width:768px){.vvig-mOff{display:block}.vvig-dOff{display:none}}"; d.head.appendChild(st2);

  // ---------- 浮動影片 ----------
  function mountFloat(f, fromProduct) {
    if (!f || !f.on || !f.media) return;
    if (f.pages === "home" && !isHome()) return;
    try { if (sessionStorage.getItem("vvig_float_off") === f.media.id) return; } catch (e) {}
    var old = d.querySelector(".vvig-float");
    if (old) { if (fromProduct) old.remove(); else return; }
    var m = f.media;
    var box = el("div", "vvig-float vvig-" + (f.pos === "bl" ? "bl" : "br") + " vvig-" + (f.size || "m") + (fromProduct ? " vvig-pfloat" : ""));
    if (m.type === "VIDEO" && f.autoplay && m.url) {
      var v = el("video"); v.src = m.url; v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true; v.setAttribute("playsinline", ""); v.setAttribute("muted", ""); v.poster = m.thumb || ""; box.appendChild(v);
    } else {
      var im = el("img"); im.src = m.thumb || m.url; im.alt = ""; box.appendChild(im);
      if (m.type === "VIDEO") box.appendChild(el("span", "vvig-fplay", ICON_PLAY));
    }
    if (m.caption) box.appendChild(el("div", "vvig-fcap", esc(m.caption.split("\n")[0].slice(0, 40))));
    var x = el("button", "vvig-fx", ICON_X); x.type = "button"; x.setAttribute("aria-label", "關閉");
    x.addEventListener("click", function (e) { e.stopPropagation(); box.remove(); try { sessionStorage.setItem("vvig_float_off", m.id); } catch (e2) {} });
    box.appendChild(x);
    box.addEventListener("click", function () { openBox(m, fromProduct ? "product" : "float", true); });
    d.body.appendChild(box);
    trackView(box, fromProduct ? "product" : "float", [m]);
  }

  // ---------- 商品頁 ----------
  function mountProduct(pid) {
    get("/products/" + pid).then(function (p) {
      if (!p || !p.items || !p.items.length) return;
      if (p.pos === "float") { mountFloat({ on: true, pos: "br", size: "m", autoplay: false, pages: "all", media: p.items[0] }, true); return; }
      var wrap = el("div", "vvig-prod");
      wrap.appendChild(el("div", "vvig-plabel", ICON_IG + "<span>INSTAGRAM</span>"));
      var row = el("div", "vvig-prow");
      p.items.slice(0, 3).forEach(function (m) { row.appendChild(thumbBtn(m, "vvig-pit", "product")); });
      wrap.appendChild(row);
      trackView(row, "product", p.items.slice(0, 3));
      var tries = 0;
      (function place() {
        var anchor = p.pos === "desc" ? d.querySelector(".ProductDetail-description") : d.querySelector(".product-detail-button-container");
        if (anchor) {
          if (p.pos === "desc") anchor.parentNode.insertBefore(wrap, anchor); else anchor.parentNode.insertBefore(wrap, anchor.nextSibling);
          return;
        }
        if (++tries < 40) setTimeout(place, 250);
      })();
    });
  }

  // ---------- 啟動 ----------
  function boot() {
    var host = d.getElementById("vv-igwall");
    if (host) mountHome(host);
    get("/float").then(function (f) { if (!d.querySelector(".vvig-pfloat")) mountFloat(f); });
    if (mc().pageType === "products-show" || /\/products\//.test(location.pathname)) {
      var tries = 0;
      (function waitPid() { var pid = productId(); if (pid) return mountProduct(pid); if (++tries < 20) setTimeout(waitPid, 250); })();
    }
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot); else boot();
})();
