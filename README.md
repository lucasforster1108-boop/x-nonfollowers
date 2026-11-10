# x-nonfollowers

检测 X（原 Twitter）上「我关注了、但对方没有回关」的人。两种用法，任选其一：

- **用法 A（推荐）：浏览器脚本。** 两个标记：① 打开关注列表，没回关的人头像下直接出现红色「未回关」标记；② 刷帖子时，你关注的作者头像下出现绿色「已关注」标记。所见即所得。
- **用法 B：数据包比对脚本。** 不想装脚本的话，用 X 官方数据包离线比对，出名单。

两个都不用官方 API、不爬取，脚本 A 连额外的网络请求都不发。

---

## 用法 A：关注列表标记脚本

文件：[`userscript/x-follow-badge.user.js`](userscript/x-follow-badge.user.js)

### 原理

X 的网页自己就知道你们俩的关注关系（个人主页上那个「关注了你」提示就是证据），只是列表和帖子流里不显示。这个脚本旁听页面自己加载的数据，把结果就地标出来：

- **关注列表页**：对方没回关 → 红色小药丸标记「未回关」，挂在头像下面；互关的人不标。
- **刷帖子时**（主页时间线等）：作者是你关注的人 → 绿色标记「已关注」，挂在头像下面；没关注的作者不标。

它不发任何额外请求、不收集数据、不自动取关，纯显示。

### 安装

1. 浏览器装 [Tampermonkey](https://www.tampermonkey.net/)（Chrome / Edge / Firefox 都有；安卓可用 Firefox + Tampermonkey）
2. 打开本仓库的 `userscript/x-follow-badge.user.js`，点 **Raw**，Tampermonkey 会自动弹出安装确认，点安装（已装过旧版的，同样操作会更新到新版）
3. 打开你自己的关注列表页 `x.com/你的用户名/following` 往下翻看「未回关」；回到主页刷帖子，看「已关注」

### 限制

- 只能在浏览器里打开 x.com 时用，X 官方 App 里装不了脚本。
- 「未回关」只出现在你自己的关注列表页；「已关注」出现在帖子流里，自己的帖子不标。
- X 改版如果改了接口字段，标记可能失效——脚本里对字段位置做了多重兜底，真失效了提 issue 或等更新。

---

## 用法 B：数据包比对脚本

文件：`x_nonfollowers.py`（Python 3.8+，纯标准库，不用装任何包）

### 先拿数据包

X 官方的数据导出功能，免费：设置与隐私 → 你的账号 → **下载你的数据存档** → 验证密码提交申请 → 等生成好（几小时到一两天）→ 下载 zip。

### 运行

```bash
# 直接喂 zip
python x_nonfollowers.py twitter-2026-11-10.zip

# 或者解压后喂文件夹（脚本会自动找 data/ 里的文件）
python x_nonfollowers.py ./twitter-2026-11-10

# 名单导出成表格或网页（链接可点）
python x_nonfollowers.py twitter-2026-11-10.zip --csv out.csv --html out.html

# 顺带列出互关的人
python x_nonfollowers.py twitter-2026-11-10.zip --show-mutual
```

先拿仓库自带的假数据试一把：

```bash
python x_nonfollowers.py examples
```

### 限制

- **只有 ID、没有用户名。** X 数据包里只存数字 ID，这是官方格式的限制。结果里给的主页链接点开就能看到是谁。
- **数据是申请那一刻的快照**，之后的变化要重新申请数据包。

---

## 隐私

两个工具的所有处理都在你本地完成。你的数据包不要分享给任何人，里面是你的完整账号数据。

## License

MIT
