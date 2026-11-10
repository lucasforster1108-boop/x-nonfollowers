#!/usr/bin/env python3
"""x-nonfollowers: 检测 X（原 Twitter）上「我关注了但对方没回关」的人。

原理：读取 X 官方数据包（设置 → 下载你的数据存档）里的
following.js 和 follower.js，两个名单做差集。不联网、不登录、
不用 API，账号零风险。

用法：
    python x_nonfollowers.py <数据包文件夹或 zip 文件>
    python x_nonfollowers.py <路径> --csv out.csv --html out.html

数据包里只有对方的数字 ID（X 的存档格式就是这样，不含用户名），
所以结果给出可直接点开的主页链接。
"""

import argparse
import csv
import html
import json
import sys
import zipfile
from pathlib import Path


def parse_ytd_js(text: str) -> list:
    """解析 window.YTD.xxx.part0 = [ ... ] 这种官方存档 js 文件。"""
    eq = text.find("=")
    if eq == -1:
        raise ValueError("文件格式不对：找不到 '='")
    payload = text[eq + 1 :].strip().rstrip(";")
    return json.loads(payload)


def extract_ids(entries: list, key: str) -> list:
    """从条目列表里按顺序提取 accountId，去重保留首次出现顺序。"""
    seen = set()
    ids = []
    for entry in entries:
        item = entry.get(key) or {}
        account_id = str(item.get("accountId", "")).strip()
        if account_id and account_id not in seen:
            seen.add(account_id)
            ids.append(account_id)
    return ids


def read_from_dir(root: Path, stem: str) -> list:
    """在解压后的存档目录里找 <stem>*.js 并合并解析。"""
    data_dir = root / "data" if (root / "data").is_dir() else root
    files = sorted(data_dir.glob(f"{stem}*.js"))
    if not files:
        raise FileNotFoundError(f"在 {data_dir} 里找不到 {stem}.js")
    entries: list = []
    for f in files:
        entries.extend(parse_ytd_js(f.read_text(encoding="utf-8")))
    return entries


def read_from_zip(zpath: Path, stem: str) -> list:
    """直接从存档 zip 里读 <stem>*.js 并合并解析。"""
    entries: list = []
    with zipfile.ZipFile(zpath) as zf:
        names = [
            n
            for n in zf.namelist()
            if Path(n).name.startswith(stem) and n.endswith(".js")
        ]
        if not names:
            raise FileNotFoundError(f"在 {zpath.name} 里找不到 {stem}.js")
        for n in sorted(names):
            entries.extend(parse_ytd_js(zf.read(n).decode("utf-8")))
    return entries


def load_ids(source: Path, stem: str, key: str) -> list:
    if source.is_file() and source.suffix.lower() == ".zip":
        entries = read_from_zip(source, stem)
    elif source.is_dir():
        entries = read_from_dir(source, stem)
    else:
        raise FileNotFoundError(f"路径不存在或不是文件夹/zip：{source}")
    return extract_ids(entries, key)


def profile_url(account_id: str) -> str:
    return f"https://twitter.com/intent/user?user_id={account_id}"


def write_csv(path: Path, ids: list) -> None:
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["accountId", "profile_url"])
        for i in ids:
            w.writerow([i, profile_url(i)])


def write_html(path: Path, ids: list, stats: dict) -> None:
    rows = "\n".join(
        f'<li><a href="{profile_url(i)}" target="_blank" rel="noopener">{i}</a></li>'
        for i in ids
    )
    doc = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8"><title>没回关名单</title></head>
<body>
<h1>我关注了但对方没回关（{len(ids)} 人）</h1>
<p>关注 {stats['following']} · 粉丝 {stats['followers']} · 互关 {stats['mutual']}</p>
<ol>
{rows}
</ol>
</body>
</html>
"""
    path.write_text(doc, encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(
        description="检测 X 上我关注了但对方没回关的人（读官方数据包，离线运行）"
    )
    ap.add_argument("source", help="数据包解压后的文件夹，或原始 zip 文件")
    ap.add_argument("--csv", metavar="PATH", help="把名单另存为 CSV")
    ap.add_argument("--html", metavar="PATH", help="把名单另存为可点链接的 HTML")
    ap.add_argument(
        "--show-mutual", action="store_true", help="同时列出互关的人（默认只统计数量）"
    )
    args = ap.parse_args()

    source = Path(args.source).expanduser()
    try:
        following = load_ids(source, "following", "following")
        followers = load_ids(source, "follower", "follower")
    except (FileNotFoundError, ValueError, zipfile.BadZipFile) as e:
        print(f"出错：{e}", file=sys.stderr)
        return 1

    follower_set = set(followers)
    following_set = set(following)
    not_back = [i for i in following if i not in follower_set]
    mutual = [i for i in following if i in follower_set]
    stats = {
        "following": len(following),
        "followers": len(followers),
        "mutual": len(mutual),
    }

    print(f"关注 {stats['following']} 人，粉丝 {stats['followers']} 人，互关 {stats['mutual']} 人。")
    print(f"没回关：{len(not_back)} 人")
    for i in not_back:
        print(f"  {i}  {profile_url(i)}")

    if args.show_mutual:
        print(f"互关名单（{len(mutual)} 人）：")
        for i in mutual:
            print(f"  {i}  {profile_url(i)}")

    if args.csv:
        write_csv(Path(args.csv), not_back)
        print(f"已写入 CSV：{args.csv}")
    if args.html:
        write_html(Path(args.html), not_back, stats)
        print(f"已写入 HTML：{args.html}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
