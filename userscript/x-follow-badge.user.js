// ==UserScript==
// @name         X 关注标记（未回关 + 已关注）
// @name:en      X Follow Badges (Not-Followed-Back + Following)
// @namespace    https://github.com/lucasforster1108-boop/x-nonfollowers
// @version      1.1.0
// @description  两个标记：1) 关注列表里，没回关的人头像下显示红色「未回关」；2) 刷帖子时，你关注的作者头像下显示「已关注」。数据来自页面自己加载的接口，不额外请求、不爬取。
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
  // followingMap:  screen_name(小写) -> true(我关注了对方) / false(没关注)
  const followedByMap = new Map();
  const followingMap = new Map();

  function readBool(user, key) {
    if (typeof user[key] === 'boolean') return user[key];
    if (user.legacy && typeof user.legacy[key] === 'boolean') {
      return user.legacy[key];
    }
    const rp = user.relationship_perspectives;
    if (rp && typeof rp[key] === 'boolean') return rp[key];
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

  // 递归遍历接口返回的 JSON，带用户名和关系字段的用户对象都记下来
  function collectUsers(node) {
    if (!node || typeof node !== 'object') return;
    if (!Array.isArray(node)) {
      const name = readScreenName(node);
      if (name) {
        const fb = readBool(node, 'followed_by');
        if (typeof fb === 'boolean') {
          followedByMap.set(name.toLowerCase(), fb);
        }
        const fg = readBool(node, 'following');
        if (typeof fg === 'boolean') {
          followingMap.set(name.toLowerCase(), fg);
        }
      }
    }
    const children = Array.isArray(node) ? node : Object.values(node);
    for (const child of children) collectUsers(child);
  }
  // ============ core:end ============

  // 旁听所有 GraphQL 接口返回（页面自己发的请求，我们只是看一眼）
  function looksLikeApiResponse(url) {
    return typeof url === 'string' && url.indexOf('/graphql/') !== -1;
  }

  function handleJson(json) {
    if (!json) return;
    const before = followedByMap.size + followingMap.size;
    collectUsers(json);
    if (followedByMap.size + followingMap.size !== before) scheduleTag();
  }

  // 旁听 fetch
  const origFetch = window.fetch;
  window.fetch = function (...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0] && args[0].url;
    const p = origFetch.apply(this, args);
    if (looksLikeApiResponse(url)) {
      p.then((res) => {
        res
          .clone()
          .json()
          .then((json) => handleJson(json))
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
    if (looksLikeApiResponse(this.__xfbUrl)) {
      this.addEventListener('load', () => {
        try {
          handleJson(JSON.parse(this.responseText));
        } catch (e) {
          /* 不是 JSON 就跳过 */
        }
      });
    }
    return origSend.apply(this, arguments);
  };

  // ============ 页面标记 ============
  const BADGE_CLASS = 'xfb-badge';

  function makeBadge(text, bg) {
    const badge = document.createElement('div');
    badge.className = BADGE_CLASS;
    badge.textContent = text;
    badge.style.cssText =
      'display:inline-block;margin-top:2px;padding:0 6px;' +
      'font-size:11px;line-height:16px;color:#fff;background:' +
      bg +
      ';border-radius:8px;font-weight:700;white-space:nowrap;';
    return badge;
  }

  function attachBadge(cell, text, bg, user) {
    let badge = cell.querySelector('.' + BADGE_CLASS);
    if (badge && badge.dataset.user === user && badge.textContent === text) {
      return; // 已经标对了
    }
    if (badge) badge.remove();
    badge = makeBadge(text, bg);
    badge.dataset.user = user;
    const avatarLink = cell.querySelector('a[href^="/"]');
    const anchor = (avatarLink && avatarLink.closest('div')) || cell;
    anchor.appendChild(badge);
  }

  function dropBadge(cell) {
    const badge = cell.querySelector('.' + BADGE_CLASS);
    if (badge) badge.remove();
  }

  // 条目里指向用户主页的链接，href 形如 /someone
  function cellScreenName(cell) {
    const links = cell.querySelectorAll('a[href^="/"]');
    for (const a of links) {
      const m = /^\/([A-Za-z0-9_]{1,15})\/?$/.exec(a.getAttribute('href') || '');
      if (m) return m[1].toLowerCase();
    }
    return null;
  }

  function myHandle() {
    const link = document.querySelector(
      'a[data-testid="AppTabBar_Profile_Link"]'
    );
    if (link) {
      const m = /^\/([A-Za-z0-9_]{1,15})\/?$/.exec(
        link.getAttribute('href') || ''
      );
      if (m) return m[1].toLowerCase();
    }
    return null;
  }

  // 关注列表页：没回关 -> 红色「未回关」
  function tagUserCells() {
    if (!/\/[^/]+\/following\/?$/.test(location.pathname)) return;
    document.querySelectorAll('[data-testid="UserCell"]').forEach((cell) => {
      const name = cellScreenName(cell);
      if (!name || !followedByMap.has(name)) {
        dropBadge(cell);
        return;
      }
      if (followedByMap.get(name) === false) {
        attachBadge(cell, '未回关', '#e0245e', name);
      } else {
        dropBadge(cell);
      }
    });
  }

  // 时间线/帖子流：我关注的作者 -> 绿色「已关注」
  function tagTweetCells() {
    const me = myHandle();
    document.querySelectorAll('[data-testid="tweet"]').forEach((cell) => {
      const name = cellScreenName(cell);
      if (!name || name === me || !followingMap.has(name)) {
        dropBadge(cell);
        return;
      }
      if (followingMap.get(name) === true) {
        attachBadge(cell, '已关注', '#0f7b3d', name);
      } else {
        dropBadge(cell);
      }
    });
  }

  function tagCells() {
    tagUserCells();
    tagTweetCells();
  }

  let tagTimer = null;
  function scheduleTag() {
    if (tagTimer) return;
    tagTimer = setTimeout(() => {
      tagTimer = null;
      tagCells();
    }, 150);
  }

  // 页面是虚拟滚动，DOM 一直在变，盯住变化重新标记
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
