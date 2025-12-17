// 指向 Go 服务器 API 地址
const SERVER_URL = "__API_HOST__"; // Go服务器启动时会替换此值

const { useState, useEffect, useRef } = React;

// --- Styles ---
const styles = {
  ball: {
    position: "fixed",
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    backgroundColor: "#007bff",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    zIndex: 2147483647,
    boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
    fontSize: "30px",
    userSelect: "none",
    touchAction: "none",
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
    fontFamily: "sans-serif",
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
    fontFamily: "sans-serif",
  },
  header: {
    padding: "10px 15px",
    borderBottom: "1px solid #eee",
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    minHeight: "40px",
  },
  chatArea: {
    flex: 1,
    overflowY: "auto",
    padding: "15px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    scrollBehavior: "smooth",
  },
  inputArea: {
    padding: "10px",
    borderTop: "1px solid #eee",
    display: "flex",
    gap: "8px",
    backgroundColor: "#fff",
    alignItems: "center",
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
  },
  tooltip: {
    position: "absolute",
    bottom: "100%",
    left: "0",
    backgroundColor: "rgba(0,0,0,0.8)",
    color: "#fff",
    padding: "6px",
    borderRadius: "4px",
    fontSize: "10px",
    whiteSpace: "nowrap",
    display: "none",
    zIndex: 10,
  },
};

// --- Components ---

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
    <div style={styles.loginContainer}>
      <h3>👋 欢迎</h3>
      <input
        ref={inputRef}
        type="text"
        placeholder="动漫高手"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        style={{
          padding: "10px",
          width: "80%",
          border: "1px solid #ddd",
          borderRadius: "6px",
          outline: "none",
          textAlign: "center",
        }}
      />
      <button
        onClick={handleSubmit}
        style={{
          padding: "10px 30px",
          cursor: "pointer",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "20px",
          fontWeight: "bold",
        }}
      >
        开始聊天
      </button>
    </div>
  );
};

const MessageList = ({
  messages,
  currentUser,
  isMobile,
  onLoadHistory,
  loadingHistory,
}) => {
  const endRef = useRef(null);
  const handleScroll = (e) => {
    if (e.target.scrollTop === 0) onLoadHistory(e.target);
  };

  return (
    <div style={styles.chatArea} onScroll={handleScroll}>
      {loadingHistory && (
        <div style={{ textAlign: "center", fontSize: "12px", color: "#999" }}>
          加载历史...
        </div>
      )}
      {messages.map((m) => {
        const isMe = m.username === currentUser;
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
              <div
                style={{
                  cursor: "help",
                  position: "relative",
                  marginLeft: "4px",
                }}
                onMouseEnter={(e) => {
                  if (isMobile) return;
                  const tip = e.currentTarget.querySelector(".tooltip-box");
                  if (tip) tip.style.display = "block";
                }}
                onMouseLeave={(e) => {
                  const tip = e.currentTarget.querySelector(".tooltip-box");
                  if (tip) tip.style.display = "none";
                }}
              >
                <span style={styles.usernameDisplay}>{m.username}</span>
                <div className="tooltip-box" style={styles.tooltip}>
                  <div>UA: {m.ua}</div>
                  <div>Ref: {m.referer}</div>
                </div>
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
  return (
    <div style={styles.inputArea}>
      <input
        style={{
          flex: 1,
          padding: "10px",
          border: "1px solid #eee",
          borderRadius: "20px",
          outline: "none",
          paddingLeft: "15px",
        }}
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
        disabled={isSending || !val.trim()}
        style={{
          padding: "0 20px",
          height: "38px",
          backgroundColor: isSending || !val.trim() ? "#ccc" : "#007bff",
          color: "white",
          border: "none",
          borderRadius: "20px",
          cursor: isSending || !val.trim() ? "not-allowed" : "pointer",
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
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [pos, setPos] = useState({
    x: window.innerWidth - 80,
    y: window.innerHeight - 80,
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPosRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  const [username, setUsername] = useState(
    localStorage.getItem("chat_username") || ""
  );
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("chat_username")
  );
  const [messages, setMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const poller = useRef(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      setPos((p) => ({
        x: Math.min(p.x, window.innerWidth - 60),
        y: Math.min(p.y, window.innerHeight - 60),
      }));
    };
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleDragStart = (cx, cy) => {
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = { x: cx, y: cy };
    initialPosRef.current = { ...pos };
  };
  const handleDragMove = (cx, cy) => {
    if (!isDragging) return;
    const dx = cx - dragStartRef.current.x;
    const dy = cy - dragStartRef.current.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) hasMovedRef.current = true;
    setPos({
      x: Math.max(
        0,
        Math.min(initialPosRef.current.x + dx, window.innerWidth - 60)
      ),
      y: Math.max(
        0,
        Math.min(initialPosRef.current.y + dy, window.innerHeight - 60)
      ),
    });
  };
  const handleDragEnd = () => {
    setIsDragging(false);
    if (!hasMovedRef.current) setIsOpen(!isOpen);
  };

  useEffect(() => {
    const onMove = (e) => isDragging && handleDragMove(e.clientX, e.clientY);
    const onUp = () => isDragging && handleDragEnd();
    const onTouchMove = (e) =>
      isDragging && handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    if (isDragging) {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      window.addEventListener("touchmove", onTouchMove, { passive: false });
      window.addEventListener("touchend", onUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [isDragging]);

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
    if (isMobile) return styles.windowMobile;
    const w = 350,
      h = 500,
      ball = 60,
      gap = 15;
    let left = pos.x - w + ball;
    let top = pos.y - h - gap;
    if (left < 0) left = pos.x;
    if (top < 0) top = pos.y + ball + gap;
    return { ...styles.windowPC, left: left + "px", top: top + "px" };
  };

  return (
    <>
      {isOpen && (
        <div style={getWindowStyle()}>
          <div style={styles.header}>
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
                currentUser={username}
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
        style={{ ...styles.ball, left: pos.x + "px", top: pos.y + "px" }}
        onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
        onTouchStart={(e) =>
          handleDragStart(e.touches[0].clientX, e.touches[0].clientY)
        }
      >
        {isOpen ? (
          "✕"
        ) : (
          <svg
            width="30"
            height="30"
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
