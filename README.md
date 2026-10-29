# VV DOUBLE · IG 內容牆

取代 Tagnology 的 Instagram 內容牆：首頁牆、浮動影片、商品頁影片。

- 後台：https://yuu7073.github.io/vvdouble-igwall/ （密碼與 FB 貼文工具同一組）
- 前台：`embed.js`（Shopline 全站語法載入）
- Cloud Function：`igwall`（專案 vvdouble-shopline，由 vvdouble-shopline repo 的 Actions「Deploy igwall」部署）
- 資料：Realtime Database `/igwall/*`；前台只讀 `/igwall/public`（公開唯讀）

## Shopline 語法

全站（進階設定 → 自訂語法，取代原本的 Tagnology script）：

```html
<script defer src="https://yuu7073.github.io/vvdouble-igwall/embed.js"></script>
```

首頁牆位置（首頁版面的自訂 HTML 區塊，取代原本的 embed-tagnology div）：

```html
<div id="vv-igwall"></div>
```

## GA 事件

前台會推 `dataLayer` 事件：`ig_wall_open`、`ig_wall_play`、`ig_wall_link`（參數 `ig_ctx`＝home / float / product、`ig_media`、`ig_type`）。
