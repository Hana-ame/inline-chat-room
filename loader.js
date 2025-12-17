(function() {
    // 配置文件地址：修改为 5500
    const WIDGET_URL = "http://localhost:5500/widget.jsx";

    const loadScript = (src) => {
        return new Promise((resolve, reject) => {
            if (document.querySelector('script[src="' + src + '"]')) return resolve();
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    };

    const init = async () => {
        await loadScript('https://unpkg.com/react@18/umd/react.production.min.js');
        await loadScript('https://unpkg.com/react-dom@18/umd/react-dom.production.min.js');
        await loadScript('https://unpkg.com/@babel/standalone/babel.min.js');

        try {
            const response = await fetch(WIDGET_URL);
            if (!response.ok) throw new Error("Failed to load widget source");
            const jsxCode = await response.text();

            const transformed = Babel.transform(jsxCode, { presets: ['env', 'react'] }).code;
            const exec = new Function('React', 'ReactDOM', transformed);
            exec(window.React, window.ReactDOM);
        } catch (err) {
            console.error("Chat Widget Load Error:", err);
        }
    };

    init();
})();