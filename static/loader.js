(function () {
  const API_HOST = "__API_HOST__"; // Go服务器启动时会替换此值
  const WIDGET_URL = API_HOST + "/widget.js"; // 编译好的 JS，走 HTTP 缓存

  const loadScript = (src) => {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src="' + src + '"]')) return resolve();
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  };

  const init = async () => {
    // 只加载 React + ReactDOM；不再需要 Babel（widget 已预编译成 JS）
    await loadScript(
      "https://unpkg.com/react@18.3.1/umd/react.production.min.js"
    );
    await loadScript(
      "https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js"
    );
    try {
      await loadScript(WIDGET_URL);
    } catch (err) {
      console.error("Chat Widget Load Error:", err);
    }
  };

  init();
})();
