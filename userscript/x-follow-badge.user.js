// ==UserScript==
// @name         X 关注列表未回关标记
// @name:en      X Following Not-Followed-Back Badge
// @namespace    https://github.com/lucasforster1108-boop/x-nonfollowers
// @version      1.0.0
// @description  打开 X 的关注列表时，给「没回关」的人在头像下加一个红色小标记。数据来自页面自己加载的接口，不额外请求、不爬取。
// @author       Lucas Forster
// @match        https://x.com/*
// @match        https://twitter.com/*
// @run-at       document-start
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  // ============ core:start（解析逻辑，本地测试覆盖这一段） ============
  // followedByMap: screen_name(小写) -> true(对方关注了我) / false(没关注)
  const followedByMap = new Map();

  function readFollowedBy(user) {
    // X 改过几次字段位置，挨个兜底
    if (typeof user.followed_by === 'boolean') return user.followed_by;
    if (user.legacy && typeof user.legacy.followed_by === 'boolean') {
      return user.legacy.followed_by;
    }
    const rp = user.relationship_perspectives;
    if (rp && typeof rp.followed_by === 'boolean') return rp.followed_by;
    return undefined;
  }

  function readScreenName(user) {
    if (typeof user.screen_name === 'string') return user.screen_name;
    if (typeof user.username === 'string') return user.username;
    if (user.legacy && typeof user.legacy.screen_name === 'string') {
      return user.legacy.screen_name;
    }
    if (user.core && typeof user.core.screen_name === 'string') {
      return user.core.screen_name;
    }
    return undefined;
  }

  // 递归遍历接口返回的 JSON，凡是带用户名和 followed_by 的对象都记下来
  function collectUsers(node) {
    if (!node || typeof node !== 'object') return;
    if (!Array.isArray(node)) {
      const name = readScreenName(node);
      const fb = readFollowedBy(node);
      if (name && typeof fb === 'boolean') {
        followedByMap.set(name.toLowerCase(), fb);
      }
    }
    const children = Array.isArray(node) ? node : Object.values(node);
    for (const child of children) collectUsers(child);
  }
  // ============ core:end ============

  // 只处理 Following 列表接口的返回（页面自己发的请求，我们只是旁听）
  function looksLikeFollowingResponse(url) {
    return typeof url === 'string' && /\/Following(\?|$)/.test(url);
  }

  function handleJson(url, json) {
    if (!looksLikeFollowingResponse(url) || !json) return;
    const before = followedByMap.size;
    collectUsers(json);
    if (followedByMap.size !== before) scheduleTag();
  }

  // 旁听 fetch
  const origFetch = window.fetch;
  window.fetch = function (...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0] && args[0].url;
    const p = origFetch.apply(this, args);
    if (looksLikeFollowingResponse(url)) {
      p.then((res) => {
        res
          .clone()
          .json()
          .then((json) => handleJson(url, json))
          .catch(() => {});
      }).catch(() => {});
    }
    return p;
  };

  // 旁听 XMLHttpRequest（老路径兜底）
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__xfbUrl = url;
    return origOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function () {
    if (looksLikeFollowingResponse(this.__xfbUrl)) {
      this.addEventListener('load', () => {
        try {
          handleJson(this.__xfbUrl, JSON.parse(this.responseText));
        } catch (e) {
          /* 不是 JSON 就跳过 */
        }
      });
    }
    return origSend.apply(this, arguments);
  };

  // ============ 页面标记 ============
  const BADGE_CLASS = 'xfb-badge';
  const BADGE_TEXT = '未回关';

  function isFollowingPage() {
    return /\/[^/]+\/following\/?$/.test(location.pathname);
  }

  function cellScreenName(cell) {
    // UserCell 里指向用户主页的链接，href 形如 /someone
    const links = cell.querySelectorAll('a[href^="/"]');
    for (const a of links) {
      const m = /^\/([A-Za-z0-9_]{1,15})\/?$/.exec(a.getAttribute('href') || '');
      if (m) return m[1].toLowerCase();
    }
    return null;
  }

  function ensureBadge(cell) {
    let badge = cell.querySelector('.' + BADGE_CLASS);
    if (!badge) {
      badge = document.createElement('div');
      badge.className = BADGE_CLASS;
      badge.textContent = BADGE_TEXT;
      badge.style.cssText =
        'display:inline-block;margin-top:2px;padding:0 6px;' +
        'font-size:11px;line-height:16px;color:#fff;background:#e0245e;' +
        'border-radius:8px;font-weight:700;';
      // 优先挂到头像链接下面；找不到就挂到整个条目末尾
      const avatarLink = cell.querySelector('a[href^="/"]');
      const anchor =
        (avatarLink && avatarLink.closest('div')) || cell;
      anchor.appendChild(badge);
    }
    return badge;
  }

  function tagCells() {
    if (!isFollowingPage()) return;
    const cells = document.querySelectorAll('[data-testid="UserCell"]');
    cells.forEach((cell) => {
      const name = cellScreenName(cell);
      const badge = cell.querySelector('.' + BADGE_CLASS);
      if (!name || !followedByMap.has(name)) {
        if (badge) badge.remove();
        return;
      }
      if (followedByMap.get(name) === false) {
        const b = ensureBadge(cell);
        b.dataset.user = name;
      } else if (badge) {
        badge.remove(); // 互关（或列表虚拟滚动复用了条目）不留标记
      }
    });
  }

  let tagTimer = null;
  function scheduleTag() {
    if (tagTimer) return;
    tagTimer = setTimeout(() => {
      tagTimer = null;
      tagCells();
    }, 150);
  }

  // 列表是虚拟滚动，DOM 一直在变，盯住变化重新标记
  const observer = new MutationObserver(scheduleTag);
  function startObserving() {
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
      tagCells();
    } else {
      setTimeout(startObserving, 300);
    }
  }
  startObserving();

  // 单页应用切路由时重新判断
  const origPushState = history.pushState;
  history.pushState = function () {
    const r = origPushState.apply(this, arguments);
    scheduleTag();
    return r;
  };
  window.addEventListener('popstate', scheduleTag);
})();
