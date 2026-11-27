# x-nonfollowers

[簡體中文](README.md) | [English](README.en.md) | **繁體中文** | [日本語](README.ja.md) | [한국어](README.ko.md)

檢測 X（原 Twitter）上「我關注了、但對方沒有回關」的人。兩種用法，任選其一：

- **用法 A（推薦）：瀏覽器指令碼。** 兩個標記：① 開啟關注列表，沒回關的人頭像下直接出現紅色「未回關」標記；② 刷帖子時，你關注的作者頭像下出現綠色「已關注」標記。所見即所得。
- **用法 B：資料包比對指令碼。** 不想裝指令碼的話，用 X 官方資料包離線比對，出名單。

兩個都不用官方 API、不爬取，指令碼 A 連額外的網路請求都不發。

---

## 用法 A：關注列表標記指令碼

檔案：[`userscript/x-follow-badge.user.js`](userscript/x-follow-badge.user.js)

### 原理

X 的網頁自己就知道你們倆的關注關係（個人主頁上那個「關注了你」提示就是證據），只是列表和帖子流裡不顯示。這個指令碼旁聽頁面自己載入的資料，把結果就地標出來：

- **關注列表頁**：對方沒回關 → 紅色小藥丸標記「未回關」，掛在頭像下面；互關的人不標。
- **刷帖子時**（主頁時間線等）：作者是你關注的人 → 綠色標記「已關注」，掛在頭像下面；沒關注的作者不標。

它不發任何額外請求、不收集資料、不自動取關，純顯示。標記文字跟隨 X 的介面語言自動切換（簡體中文 / English / 日本語 / 한국어）；裝好後 Tampermonkey 會自動檢查更新，不用手動重灌。

### 安裝

1. 瀏覽器裝 [Tampermonkey](https://www.tampermonkey.net/)（Chrome / Edge / Firefox 都有；安卓可用 Firefox + Tampermonkey）
2. 開啟本倉庫的 `userscript/x-follow-badge.user.js`，點 **Raw**，Tampermonkey 會自動彈出安裝確認，點安裝（已裝過舊版的，同樣操作會更新到新版）
3. 開啟你自己的關注列表頁 `x.com/你的用户名/following` 往下翻看「未回關」；回到主頁刷帖子，看「已關注」

### 限制

- 只能在瀏覽器裡開啟 x.com 時用，X 官方 App 裡裝不了指令碼。
- 「未回關」只出現在你自己的關注列表頁；「已關注」出現在帖子流裡，自己的帖子不標。
- X 改版如果改了介面欄位，標記可能失效——指令碼里對欄位位置做了多重兜底，真失效了提 issue 或等更新。

---

## 用法 B：資料包比對指令碼

檔案：`x_nonfollowers.py`（Python 3.8+，純標準庫，不用裝任何包）

### 先拿資料包

X 官方的資料匯出功能，免費：設定與隱私 → 你的賬號 → **下載你的資料存檔** → 驗證密碼提交申請 → 等生成好（幾小時到一兩天）→ 下載 zip。

### 執行

```bash
# 直接喂 zip
python x_nonfollowers.py twitter-2026-11-10.zip

# 或者解压后喂文件夹（脚本会自动找 data/ 里的文件）
python x_nonfollowers.py ./twitter-2026-11-10

# 名单导出成表格或网页（链接可点）
python x_nonfollowers.py twitter-2026-11-10.zip --csv out.csv --html out.html

# 顺带列出互关的人
python x_nonfollowers.py twitter-2026-11-10.zip --show-mutual

# 顺带列出关注了我但我没回关的人
python x_nonfollowers.py twitter-2026-11-10.zip --show-followers-only

# 全部结果导出成 JSON，喂给别的工具接着处理
python x_nonfollowers.py twitter-2026-11-10.zip --json out.json
```

先拿倉庫自帶的假資料試一把：

```bash
python x_nonfollowers.py examples
```

### 限制

- **只有 ID、沒有使用者名稱。** X 資料包裡只存數字 ID，這是官方格式的限制。結果裡給的主頁連結點開就能看到是誰。
- **資料是申請那一刻的快照**，之後的變化要重新申請資料包。

---

## 隱私

兩個工具的所有處理都在你本地完成。你的資料包不要分享給任何人，裡面是你的完整賬號資料。

## License

MIT
