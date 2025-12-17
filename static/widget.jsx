const SERVER_URL = "__API_HOST__";

const { useState, useEffect, useRef } = React;

// UUID 生成器
const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// =============================================================================
// 1. 样式定义
// =============================================================================
const styles = {
  reset: {
    boxSizing: "border-box",
    lineHeight: "1.5",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: "14px",
    color: "#333",
    textAlign: "left",
  },
  ball: {
    position: "fixed",
    // 【UI修改】尺寸改小 (48px)
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    backgroundColor: "#007bff",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    zIndex: 2147483647,
    boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
    userSelect: "none",
    // 【核心修复】禁止浏览器默认的触摸行为（滚动/缩放），解决移动端回弹问题
    touchAction: "none",
    // 【UI修改】添加过渡动画
    transition: "opacity 0.2s, transform 0.1s",
  },
  windowPC: {
    position: "fixed",
    width: "350px",
    height: "500px",
    backgroundColor: "white",
    borderRadius: "12px",
    boxShadow: "0 5px 25px rgba(0,0,0,0.2)",
    zIndex: 2147483646,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    border: "1px solid #ddd",
  },
  windowMobile: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "white",
    zIndex: 2147483646,
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "10px 15px",
    borderBottom: "1px solid #eee",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    minHeight: "46px",
  },
  title: { fontWeight: "bold", fontSize: "15px", color: "#333", margin: 0 },
  chatArea: {
    flex: 1,
    overflowY: "auto",
    padding: "15px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    scrollBehavior: "smooth",
    backgroundColor: "#fff",
  },
  inputArea: {
    padding: "10px",
    borderTop: "1px solid #eee",
    display: "flex",
    gap: "8px",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  inputReset: {
    flex: 1,
    padding: "10px 15px",
    border: "1px solid #eee",
    borderRadius: "20px",
    outline: "none",
    background: "#fff",
    color: "#333",
    fontSize: "14px",
    margin: 0,
    boxShadow: "none",
    appearance: "none",
  },
  btnReset: {
    padding: "0 20px",
    height: "38px",
    border: "none",
    borderRadius: "20px",
    fontWeight: "bold",
    fontSize: "14px",
    margin: 0,
    cursor: "pointer",
    boxShadow: "none",
  },
  msgBubble: {
    padding: "10px 14px",
    borderRadius: "12px",
    maxWidth: "85%",
    wordBreak: "break-word",
    position: "relative",
    fontSize: "14px",
    lineHeight: "1.4",
  },
  myMsg: { alignSelf: "flex-end", backgroundColor: "#007bff", color: "white" },
  otherMsg: {
    alignSelf: "flex-start",
    backgroundColor: "#f1f0f0",
    color: "black",
  },
  loginContainer: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "20px",
    padding: "20px",
  },
  usernameDisplay: {
    fontSize: "11px",
    color: "#666",
    marginBottom: "2px",
    marginLeft: "4px",
    cursor: "help",
  },
};

// =============================================================================
// 2. 组件定义
// =============================================================================

const LoginScreen = ({ onLogin }) => {
  const [name, setName] = useState("");
  const inputRef = useRef(null);
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleSubmit = () => {
    const finalName = name.trim() === "" ? "动漫高手" : name;
    onLogin(finalName);
  };

  return (
    <div style={{ ...styles.loginContainer, ...styles.reset }}>
      <h3 style={{ margin: 0, fontSize: "18px" }}>👋 欢迎</h3>
      <p style={{ margin: 0, color: "#666", fontSize: "13px" }}>请输入昵称</p>
      <input
        ref={inputRef}
        type="text"
        placeholder="动漫高手"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        style={{
          ...styles.inputReset,
          border: "1px solid #ccc",
          width: "80%",
          flex: "none",
          textAlign: "center",
        }}
      />
      <button
        onClick={handleSubmit}
        style={{
          ...styles.btnReset,
          backgroundColor: "#007bff",
          color: "white",
        }}
      >
        开始聊天
      </button>
    </div>
  );
};

const MessageList = ({
  messages,
  currentSessionID,
  isMobile,
  onLoadHistory,
  loadingHistory,
}) => {
  const endRef = useRef(null);
  const handleScroll = (e) => {
    if (e.target.scrollTop === 0) onLoadHistory(e.target);
  };

  return (
    <div
      style={{ ...styles.chatArea, ...styles.reset }}
      onScroll={handleScroll}
    >
      {loadingHistory && (
        <div style={{ textAlign: "center", fontSize: "12px", color: "#999" }}>
          加载历史...
        </div>
      )}
      {messages.map((m) => {
        const isMe = m.session_id === currentSessionID;
        const infoText = `ID: ${m.ip_hash}\nUA: ${m.ua}\nRef: ${m.referer}`;

        return (
          <div
            key={m.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: isMe ? "flex-end" : "flex-start",
            }}
          >
            {!isMe && (
              <div style={{ marginLeft: "4px" }} title={infoText}>
                <span style={styles.usernameDisplay}>{m.username}</span>
              </div>
            )}
            <div
              style={{
                ...styles.msgBubble,
                ...(isMe ? styles.myMsg : styles.otherMsg),
              }}
            >
              {m.content}
            </div>
          </div>
        );
      })}
      <div ref={endRef} id="msg-end" />
    </div>
  );
};

const MessageInput = ({ onSend, isSending }) => {
  const [val, setVal] = useState("");
  const handleSend = () => {
    if (!val.trim() || isSending) return;
    onSend(val);
    setVal("");
  };

  const disabled = isSending || !val.trim();
  const btnBg = disabled ? "#ccc" : "#007bff";

  return (
    <div style={{ ...styles.inputArea, ...styles.reset }}>
      <input
        style={styles.inputReset}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder="输入消息..."
        disabled={isSending}
      />
      <button
        onClick={handleSend}
        disabled={disabled}
        style={{
          ...styles.btnReset,
          backgroundColor: btnBg,
          color: "white",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "background-color 0.2s",
        }}
      >
        {isSending ? "..." : "发送"}
      </button>
    </div>
  );
};

// --- Main App ---

const ChatApp = () => {
  // UI State
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isHovered, setIsHovered] = useState(false); // 控制半透明

  // Drag State
  const [pos, setPos] = useState({
    x: window.innerWidth - 70,
    y: window.innerHeight - 100,
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPosRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  // 【新增】记录上次有效点击的时间戳
  const lastClickTimeRef = useRef(0);

  // Chat Data State
  const [username, setUsername] = useState(
    localStorage.getItem("chat_username") || ""
  );
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("chat_username")
  );
  const [sessionID, setSessionID] = useState("");
  const [messages, setMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const poller = useRef(null);

  // Init Session
  useEffect(() => {
    let sid = localStorage.getItem("chat_session_id");
    if (!sid) {
      sid = generateUUID();
      localStorage.setItem("chat_session_id", sid);
    }
    setSessionID(sid);
  }, []);

  // Init Mobile Check
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      // 简单限制边界防止出界
      setPos((p) => ({
        x: Math.min(p.x, window.innerWidth - 50),
        y: Math.min(p.y, window.innerHeight - 50),
      }));
    };
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // -------------------------------------------------------------------------
  // 核心修复：拖拽逻辑
  // -------------------------------------------------------------------------
  const handleDragStart = (e) => {
    // 兼容 Mouse 和 Touch 事件获取坐标
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = { x: clientX, y: clientY };
    initialPosRef.current = { ...pos };

    // 拖拽时设为不透明
    setIsHovered(true);
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;

    // 【关键】防止移动端页面跟随滚动
    if (e.cancelable && e.type === "touchmove") {
      e.preventDefault();
    }

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;

    // 设置一个小的阈值，区分点击和拖拽
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasMovedRef.current = true;
    }

    const ballSize = 48; // 更新后的尺寸
    const newX = initialPosRef.current.x + dx;
    const newY = initialPosRef.current.y + dy;

    // 边界计算
    const maxX = window.innerWidth - ballSize;
    const maxY = window.innerHeight - ballSize;

    setPos({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setIsHovered(false); // 恢复透明度逻辑
    if (!hasMovedRef.current) {
      const now = Date.now();

      // 【新增】检查时间阈值 (500ms)
      // 如果距离上次有效操作小于 500ms，说明可能是重复点击或鬼触，直接忽略
      if (now - lastClickTimeRef.current < 500) {
        return;
      }

      // 更新时间戳
      lastClickTimeRef.current = now;

      // 执行切换
      setIsOpen((prev) => !prev);
    }
  };

  // 绑定全局事件，确保拖拽流畅且不丢失
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
      // 【关键】passive: false 允许 preventDefault
      window.addEventListener("touchmove", handleDragMove, { passive: false });
      window.addEventListener("touchend", handleDragEnd);
    }
    return () => {
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", handleDragMove);
      window.removeEventListener("touchend", handleDragEnd);
    };
  }, [isDragging]);

  // Chat Logic (API calls etc...)
  const loadData = async (params) => {
    try {
      return await (
        await fetch(`${SERVER_URL}/api/messages?${new URLSearchParams(params)}`)
      ).json();
    } catch {
      return [];
    }
  };

  useEffect(() => {
    if (!isLoggedIn || !isOpen) return;
    loadData({ limit: 10 }).then((msgs) => {
      setMessages(msgs);
      setTimeout(scrollToBottom, 100);
    });
    poller.current = setInterval(() => {
      setMessages((prev) => {
        const lastId = prev.length ? prev[prev.length - 1].id : 0;
        loadData({ after_id: lastId }).then((newMsgs) => {
          if (newMsgs.length > 0) {
            const el = document.getElementById("msg-end");
            const shouldScroll =
              el && el.getBoundingClientRect().top < window.innerHeight;
            setMessages((curr) => [...curr, ...newMsgs]);
            if (shouldScroll || !el) setTimeout(scrollToBottom, 100);
          }
        });
        return prev;
      });
    }, 2000);
    return () => clearInterval(poller.current);
  }, [isLoggedIn, isOpen]);

  const scrollToBottom = () =>
    document.getElementById("msg-end")?.scrollIntoView({ behavior: "smooth" });
  const handleLoadHistory = async (target) => {
    if (messages.length === 0 || loadingHistory) return;
    setLoadingHistory(true);
    const oldMsgs = await loadData({ before_id: messages[0].id, limit: 10 });
    if (oldMsgs.length > 0) {
      const oldHeight = target.scrollHeight;
      setMessages((prev) => [...oldMsgs, ...prev]);
      setTimeout(() => {
        target.scrollTop = target.scrollHeight - oldHeight;
      }, 0);
    }
    setLoadingHistory(false);
  };

  const handleLogin = (name) => {
    localStorage.setItem("chat_username", name);
    setUsername(name);
    setIsLoggedIn(true);
  };
  const handleSend = async (content) => {
    setIsSending(true);
    try {
      await fetch(`${SERVER_URL}/api/send`, {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionID,
          username,
          content,
          ua: navigator.userAgent,
          referer: document.referrer || window.location.href,
        }),
      });
      setTimeout(scrollToBottom, 200);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  const getWindowStyle = () => {
    if (isMobile) return { ...styles.windowMobile, ...styles.reset };
    const w = 350,
      h = 500,
      ball = 48,
      gap = 15;
    let left = pos.x - w + ball;
    let top = pos.y - h - gap;
    if (left < 0) left = pos.x;
    if (top < 0) top = pos.y + ball + gap;
    return {
      ...styles.windowPC,
      ...styles.reset,
      left: left + "px",
      top: top + "px",
    };
  };

  // 动态计算透明度样式
  const ballDynamicStyle = {
    ...styles.ball,
    left: pos.x + "px",
    top: pos.y + "px",
    // 【UI修改】半透明逻辑：拖拽中或悬浮时=1.0，否则0.6
    opacity: isDragging || isHovered || isOpen ? 1.0 : 0.6,
    transform: isDragging || isHovered ? "scale(1.1)" : "scale(1)",
  };

  return (
    <>
      {isOpen && (
        <div style={getWindowStyle()}>
          <div style={{ ...styles.header, ...styles.reset }}>
            <span style={styles.title}>群聊（测试版）</span>
            <span
              style={{
                cursor: "pointer",
                fontSize: "20px",
                padding: "0 5px",
                color: "#666",
              }}
              onClick={() => setIsOpen(false)}
            >
              ✕
            </span>
          </div>
          {!isLoggedIn ? (
            <LoginScreen onLogin={handleLogin} />
          ) : (
            <>
              <MessageList
                messages={messages}
                currentSessionID={sessionID}
                isMobile={isMobile}
                onLoadHistory={handleLoadHistory}
                loadingHistory={loadingHistory}
              />
              <MessageInput onSend={handleSend} isSending={isSending} />
            </>
          )}
        </div>
      )}
      <div
        style={ballDynamicStyle}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        // PC端悬浮效果
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {isOpen ? (
          "✕"
        ) : (
          // 【UI修改】图标改小 (20x20)
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        )}
      </div>
    </>
  );
};

const rootDiv = document.createElement("div");
rootDiv.id = "chat-widget-root";
rootDiv.style.all = "initial";
document.body.appendChild(rootDiv);
const root = ReactDOM.createRoot(rootDiv);
root.render(<ChatApp />);
