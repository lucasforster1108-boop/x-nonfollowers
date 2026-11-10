# x-nonfollowers

检测 X（原 Twitter）上「我关注了、但对方没有回关」的人。

不联网、不登录、不用 API。原理是读 X 官方数据包里的关注名单和粉丝名单，两个名单做差集，全程在自己电脑上离线跑，账号没有任何风险。

## 先拿数据包

这是 X 官方给每个人的数据导出功能，免费：

1. 打开 X → 设置与隐私 → 你的账号 → **下载你的数据存档**
2. 验证密码后提交申请，等存档生成（一般几小时，最多一两天，好了会有站内通知/邮件）
3. 下载得到的 zip 文件，不用解压也能直接用

## 用法

需要 Python 3.8+，不需要装任何第三方库。

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

输出示例：

```
关注 812 人，粉丝 640 人，互关 601 人。
没回关：211 人
  123456789  https://twitter.com/intent/user?user_id=123456789
  ...
```

先拿仓库自带的假数据试一把：

```bash
python x_nonfollowers.py examples
```

## 已知限制

- **只有 ID、没有用户名。** X 的数据包里 following/follower 文件只存数字 ID，这是官方格式的限制，不是脚本的问题。结果里给的主页链接点开就能看到是谁。
- **数据是申请那一刻的快照。** 今天申请的数据包反映的是今天的关注关系，之后的变化要重新申请。
- 想绕开这两条限制只能走官方 API（收费）或登录爬取（有封号风险），这个工具两样都不碰。

## 隐私

所有计算都在本地完成，不上传、不联网。你的数据包不要分享给任何人，里面包含你的完整账号数据。

## License

MIT
