(function () {
  // 这个文件的内容要保持稳定：它一旦被 Cloudflare/浏览器长缓存，就不能再改。
  // 真正的版本差异放在 widget.js?v=<指纹> 里 —— 改 widget.js 后 URL 自动变，
  // 绕过长缓存，无需 purge CDN。
  var API_HOST = "__API_HOST__"; // Go 服务启动时替换
  var WIDGET_URL = API_HOST + "/widget.js";

  var loadScript = function (src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) return resolve();
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  };

  var init = function () {
    // 先取当前 widget.js 指纹，再拼版本化 URL；取不到就退回不带版本的 URL
    fetch(API_HOST + "/api/version")
      .then(function (r) { return r.json(); })
      .then(function (d) { return d && d.version ? WIDGET_URL + "?v=" + d.version : WIDGET_URL; })
      .catch(function () { return WIDGET_URL; })
      .then(function (url) {
        return loadScript(
          "https://unpkg.com/react@18.3.1/umd/react.production.min.js"
        ).then(function () {
          return loadScript(
            "https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js"
          );
        }).then(function () {
          return loadScript(url);
        });
      })
      .catch(function (err) {
        console.error("Chat Widget Load Error:", err);
      });
  };

  init();
})();
