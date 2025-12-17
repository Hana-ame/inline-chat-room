const SERVER_URL = "http://localhost:8765"; // 请确保这里指向你的 Golang 后端地址

const { useState, useEffect, useRef, useLayoutEffect } = React;

const styles = {
  // 悬浮球样式 (位置由行内样式动态控制)
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
    zIndex: 2147483647, // Max Z-Index
    boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
    fontSize: "30px",
    userSelect: "none",
    touchAction: "none", // 防止手机端拖动时触发页面滚动
  },
  // PC端窗口样式 (位置动态计算)
  windowPC: {
    position: "fixed",
    width: "350px",
    height: "500px",
    backgroundColor: "white",
    borderRadius: "12px",
    boxShadow: "0 5px 25px rgba(0,0,0,0.2)",
    zIndex: 2147483646, // 略低于球
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    fontFamily: "sans-serif",
    border: "1px solid #ddd",
  },
  // 手机端窗口样式 (全屏)
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
  // 内部组件样式
  header: {
    padding: "15px",
    borderBottom: "1px solid #eee",
    fontWeight: "bold",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
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

const ChatApp = () => {
  // 状态
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 初始位置：右下角 (默认屏幕宽度的90%, 高度的90%)
  const [pos, setPos] = useState({
    x: window.innerWidth - 80,
    y: window.innerHeight - 80,
  });

  // 拖拽相关状态
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 }); // 记录鼠标按下时的坐标
  const initialPosRef = useRef({ x: 0, y: 0 }); // 记录按下时的球坐标
  const hasMovedRef = useRef(false); // 判断是否只是点击

  // 聊天业务状态
  const [username, setUsername] = useState(
    localStorage.getItem("chat_username") || ""
  );
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("chat_username")
  );
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);

  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const poller = useRef(null);

  // --- 1. 响应式检测 ---
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      // 窗口大小改变时，确保球不跑出屏幕，可选逻辑
      setPos((p) => ({
        x: Math.min(p.x, window.innerWidth - 60),
        y: Math.min(p.y, window.innerHeight - 60),
      }));
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // --- 2. 拖拽逻辑 (Mouse & Touch) ---
  const handleDragStart = (clientX, clientY) => {
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = { x: clientX, y: clientY };
    initialPosRef.current = { ...pos };
  };

  const handleDragMove = (clientX, clientY) => {
    if (!isDragging) return;

    const deltaX = clientX - dragStartRef.current.x;
    const deltaY = clientY - dragStartRef.current.y;

    // 只有移动超过一点距离才算拖拽，避免手抖
    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      hasMovedRef.current = true;
    }

    let newX = initialPosRef.current.x + deltaX;
    let newY = initialPosRef.current.y + deltaY;

    // 边界限制
    const maxX = window.innerWidth - 60; // 60是球宽
    const maxY = window.innerHeight - 60;

    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));

    setPos({ x: newX, y: newY });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    // 如果没有发生实际移动，视为点击，切换窗口状态
    if (!hasMovedRef.current) {
      setIsOpen((prev) => !prev);
    }
  };

  // 事件绑定 (Mouse)
  useEffect(() => {
    const onMouseMove = (e) =>
      isDragging && handleDragMove(e.clientX, e.clientY);
    const onMouseUp = () => isDragging && handleDragEnd();

    if (isDragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging]);

  // 事件绑定 (Touch - React的Touch事件有时在Suspended元素上会有问题，原生绑定更稳)
  useEffect(() => {
    if (!isDragging) return;
    const onTouchMove = (e) =>
      handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    const onTouchEnd = () => handleDragEnd();

    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isDragging]);

  // --- 3. 聊天业务逻辑 (保持不变) ---
  const handleLogin = () => {
    if (!username.trim()) return;
    localStorage.setItem("chat_username", username);
    setIsLoggedIn(true);
  };

  const loadMessages = async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    try {
      const res = await fetch(`${SERVER_URL}/api/messages?${query}`);
      return await res.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  // 初始加载和轮询逻辑
  useEffect(() => {
    if (!isLoggedIn || !isOpen) return;
    loadMessages({ limit: 10 }).then((msgs) => {
      setMessages(msgs);
      // 首次打开强制滚动到底部
      setTimeout(scrollToBottom, 100);
    });

    // 2. 轮询
    poller.current = setInterval(async () => {
      setMessages((prev) => {
        // 如果没有消息，不执行轮询逻辑（或者可以轮询 limit=10）
        const lastId = prev.length > 0 ? prev[prev.length - 1].id : 0;

        loadMessages({ after_id: lastId }).then((newMsgs) => {
          if (newMsgs.length > 0) {
            const container = chatContainerRef.current;
            // 判断用户是否接近底部 (50px 容差)
            const isAtBottom =
              container &&
              container.scrollHeight - container.scrollTop <=
                container.clientHeight + 50;

            // 更新消息
            setMessages((curr) => [...curr, ...newMsgs]);

            // 只有当用户原本就在底部时，才自动滚动
            if (isAtBottom) {
              setTimeout(scrollToBottom, 100);
            }
          }
        });
        return prev;
      });
    }, 2000);

    return () => clearInterval(poller.current);
  }, [isLoggedIn, isOpen]);

  // 向上滚动加载历史
  const handleScroll = async (e) => {
    if (e.target.scrollTop === 0 && messages.length > 0 && !loading) {
      setLoading(true);
      const firstId = messages[0].id;
      const oldMsgs = await loadMessages({ before_id: firstId, limit: 10 });

      if (oldMsgs.length > 0) {
        const oldScrollHeight = e.target.scrollHeight;
        setMessages((prev) => [...oldMsgs, ...prev]);

        // 恢复视觉位置
        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop =
              chatContainerRef.current.scrollHeight - oldScrollHeight;
          }
        }, 0);
      }
      setLoading(false);
    }
  };

  const scrollToBottom = () =>
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    const text = inputValue;
    setInputValue("");
    await fetch(`${SERVER_URL}/api/send`, {
      method: "POST",
      body: JSON.stringify({
        username,
        content: text,
        ua: navigator.userAgent,
        referer: document.referrer || window.location.href,
      }),
    });
    // 轮询会处理显示，但为了体验可以立即触发一次轮询或本地乐观更新
    // 这里简单处理：让轮询去抓取，或者可以手动调用一次 fetch
    setTimeout(scrollToBottom, 200);
  };

  // --- 4. 计算窗口位置 (PC端跟随逻辑) ---
  // 窗口宽度 350, 球宽度 60.
  // 我们希望窗口右下角对齐球的右下角 (或者在球的上方)
  const getWindowStyle = () => {
    if (isMobile) return styles.windowMobile;

    // PC端计算：
    // 窗口 Bottom = 屏幕高度 - 球的Top (即球的Y) + 偏移
    // 这里直接用 top/left 计算更直观
    const windowWidth = 350;
    const windowHeight = 500;
    const ballSize = 60;
    const gap = 15;

    // 默认尝试放在球的“左上方”
    let winLeft = pos.x - windowWidth + ballSize;
    let winTop = pos.y - windowHeight - gap;

    // 简单的边界检测：如果上方放不下，就放下方？(这里简化，假设大部分时候是右下角)
    // 如果左边放不下(pos.x很小)，就放在球的右边
    if (winLeft < 0) winLeft = pos.x;
    // 如果上面放不下(pos.y很小)，就放在球的下面
    if (winTop < 0) winTop = pos.y + ballSize + gap;

    return {
      ...styles.windowPC,
      left: winLeft + "px",
      top: winTop + "px",
    };
  };

  return (
    <>
      {/* 聊天窗口 (根据 isOpen 渲染，但保持 DOM 结构以便动画，这里简化为条件渲染) */}
      {isOpen && (
        <div style={getWindowStyle()}>
          <div style={styles.header}>
            <span>在线咨询</span>
            <div style={{ display: "flex", gap: "10px" }}>
              {/* 手机端添加一个明确的最小化按钮 */}
              <span
                style={{ cursor: "pointer", fontSize: "18px" }}
                onClick={() => setIsOpen(false)}
              >
                ✕
              </span>
            </div>
          </div>

          {!isLoggedIn ? (
            <div style={styles.loginContainer}>
              <h3>👋 欢迎</h3>
              <p style={{ fontSize: "14px", color: "#666" }}>
                请输入您的称呼开始交流
              </p>
              <input
                type="text"
                placeholder="怎么称呼您？"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  padding: "10px",
                  width: "80%",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  outline: "none",
                }}
              />
              <button
                onClick={handleLogin}
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
          ) : (
            <>
              <div
                style={styles.chatArea}
                ref={chatContainerRef}
                onScroll={handleScroll}
              >
                {loading && (
                  <div
                    style={{
                      textAlign: "center",
                      fontSize: "12px",
                      color: "#999",
                    }}
                  >
                    加载历史消息...
                  </div>
                )}
                {messages.map((m) => {
                  const isMe = m.username === username;
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
                          style={{ ...styles.hoverTarget, marginLeft: "4px" }}
                          onMouseEnter={(e) => {
                            if (isMobile) return; // 手机端不显示 tooltip
                            const tip =
                              e.currentTarget.querySelector(".tooltip-box");
                            if (tip) tip.style.display = "block";
                          }}
                          onMouseLeave={(e) => {
                            const tip =
                              e.currentTarget.querySelector(".tooltip-box");
                            if (tip) tip.style.display = "none";
                          }}
                        >
                          <span style={styles.usernameDisplay}>
                            {m.username}
                          </span>
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
                <div ref={chatEndRef} />
              </div>

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
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="输入消息..."
                />
                <button
                  onClick={handleSend}
                  style={{
                    padding: "0 20px",
                    backgroundColor: "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: "20px",
                    cursor: "pointer",
                  }}
                >
                  发送
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* 悬浮球 (永远显示) */}
      <div
        style={{
          ...styles.ball,
          left: pos.x + "px",
          top: pos.y + "px",
        }}
        onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
        onTouchStart={(e) =>
          handleDragStart(e.touches[0].clientX, e.touches[0].clientY)
        }
        // 点击事件由 handleDragEnd 中的逻辑判断代替
      >
        {/* 如果打开了显示 X，没打开显示气泡 */}
        {isOpen ? (
          <span style={{ fontSize: "24px", fontWeight: "bold" }}>✕</span>
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

// 挂载逻辑
const rootDiv = document.createElement("div");
rootDiv.id = "chat-widget-root";
// 重置一些可能影响布局的样式
rootDiv.style.all = "initial";
document.body.appendChild(rootDiv);

const root = ReactDOM.createRoot(rootDiv);
root.render(<ChatApp />);
