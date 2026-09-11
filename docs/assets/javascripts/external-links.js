(() => {
  const GITHUB_HOSTS = new Set(['github.com', 'www.github.com']);

  function isGithubLink(anchor) {
    if (!anchor?.href) return false;
    try {
      const url = new URL(anchor.href, window.location.href);
      return GITHUB_HOSTS.has(url.hostname.toLowerCase());
    } catch (_) {
      return false;
    }
  }

  function patchGithubLinks(root = document) {
    root.querySelectorAll?.('a[href]').forEach((anchor) => {
      if (!isGithubLink(anchor)) return;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
    });
  }

  function openGithubOutsideFrame(event) {
    const anchor = event.target.closest?.('a[href]');
    if (!anchor || !isGithubLink(anchor)) return;

    // GitHub refuses to render inside third-party iframes. When this knowledge
    // base is embedded in ActivityWatching, always escape to a top-level tab.
    if (window.self !== window.top) {
      event.preventDefault();
      event.stopPropagation();
      window.open(anchor.href, '_blank', 'noopener,noreferrer');
    }
  }

  function init() {
    patchGithubLinks();
    document.addEventListener('click', openGithubOutsideFrame, true);

    // MkDocs Material may replace page content during instant navigation.
    // Patch any GitHub links inserted after the initial page load as well.
    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) patchGithubLinks(node);
        });
      });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
