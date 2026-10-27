const SERVER_URL = "__API_HOST__";
const UPLOAD_URL = "https://upload.moonchan.xyz/api/upload"; // 图床上传（raw body PUT，见 KB moonchan-upload-api）

// 【修改】添加 useMemo
const {
  useState,
  useEffect,
  useRef,
  useMemo
} = React;

// UUID 生成器
const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0,
      v = c == "x" ? r : r & 0x3 | 0x8;
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
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: "14px",
    color: "#333",
    textAlign: "left"
  },
  ball: {
    position: "fixed",
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
    touchAction: "none",
    transition: "opacity 0.2s, transform 0.1s"
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
    border: "1px solid #ddd"
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
    flexDirection: "column"
  },
  header: {
    padding: "10px 15px",
    borderBottom: "1px solid #eee",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    minHeight: "46px"
  },
  title: {
    fontWeight: "bold",
    fontSize: "15px",
    color: "#333",
    margin: 0
  },
  // 【新增】头部右侧按钮组容器
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "15px" // 按钮之间的间距
  },
  iconBtn: {
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#666",
    fontSize: "18px",
    transition: "color 0.2s"
  },
  chatArea: {
    flex: 1,
    overflowY: "auto",
    padding: "15px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    scrollBehavior: "smooth",
    backgroundColor: "#fff"
  },
  inputArea: {
    padding: "10px",
    borderTop: "1px solid #eee",
    display: "flex",
    gap: "8px",
    backgroundColor: "#fff",
    alignItems: "center"
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
    appearance: "none"
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
    boxShadow: "none"
  },
  msgBubble: {
    padding: "10px 14px",
    borderRadius: "12px",
    maxWidth: "85%",
    wordBreak: "break-word",
    position: "relative",
    fontSize: "14px",
    lineHeight: "1.4"
  },
  myMsg: {
    alignSelf: "flex-end",
    backgroundColor: "#007bff",
    color: "white"
  },
  otherMsg: {
    alignSelf: "flex-start",
    backgroundColor: "#f1f0f0",
    color: "black"
  },
  loginContainer: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "20px",
    padding: "20px"
  },
  usernameDisplay: {
    fontSize: "11px",
    color: "#666",
    marginBottom: "2px",
    marginLeft: "4px",
    cursor: "help"
  }
};

// =============================================================================
// 2. 组件定义
// =============================================================================

const LoginScreen = ({
  onLogin,
  currentName
}) => {
  // 如果之前有名字，就用之前的，否则为空
  const [name, setName] = useState(currentName || "");
  const inputRef = useRef(null);
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // 【修改】生成随机后缀的默认名称 (例如: 动漫高手a1b2)
  const randomDefaultName = useMemo(() => {
    const suffix = Math.random().toString(36).substring(2, 6);
    return `动漫高手${suffix}`;
  }, []);
  const handleSubmit = () => {
    // 【修改】如果输入为空，使用带有随机后缀的名称
    const finalName = name.trim() === "" ? randomDefaultName : name;
    onLogin(finalName);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...styles.loginContainer,
      ...styles.reset
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: "18px"
    }
  }, "\uD83D\uDC4B \u6B22\u8FCE"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      color: "#666",
      fontSize: "13px"
    }
  }, "\u8BF7\u8F93\u5165\u6635\u79F0"), /*#__PURE__*/React.createElement("input", {
    ref: inputRef,
    type: "text"
    // 【修改】placeholder 显示生成的随机名
    ,
    placeholder: randomDefaultName,
    value: name,
    onChange: e => setName(e.target.value),
    onKeyDown: e => e.key === "Enter" && handleSubmit(),
    style: {
      ...styles.inputReset,
      border: "1px solid #ccc",
      width: "80%",
      flex: "none",
      textAlign: "center"
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: handleSubmit,
    style: {
      ...styles.btnReset,
      backgroundColor: "#007bff",
      color: "white"
    }
  }, "\u5F00\u59CB\u804A\u5929"));
};
const MessageList = ({
  messages,
  currentSessionID,
  isMobile,
  onLoadHistory,
  loadingHistory
}) => {
  const endRef = useRef(null);
  const handleScroll = e => {
    if (e.target.scrollTop === 0) onLoadHistory(e.target);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...styles.chatArea,
      ...styles.reset
    },
    onScroll: handleScroll
  }, loadingHistory && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      fontSize: "12px",
      color: "#999"
    }
  }, "\u52A0\u8F7D\u5386\u53F2..."), messages.map(m => {
    const isMe = m.session_id === currentSessionID;
    const infoText = `ID: ${m.ip_hash}\nUA: ${m.ua}\nRef: ${m.referer}`;
    // 图片消息：content 以 http 开头且命中图片扩展名（upload.moonchan.xyz 返回的 url）
    const isImage = typeof m.content === "string" && /^https?:\/\/\S+\.(png|jpe?g|gif|webp|bmp|avif)(\?\S*)?$/i.test(m.content);
    return /*#__PURE__*/React.createElement("div", {
      key: m.id,
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: isMe ? "flex-end" : "flex-start"
      }
    }, !isMe && /*#__PURE__*/React.createElement("div", {
      style: {
        marginLeft: "4px"
      },
      title: infoText
    }, /*#__PURE__*/React.createElement("span", {
      style: styles.usernameDisplay
    }, m.username)), /*#__PURE__*/React.createElement("div", {
      style: {
        ...styles.msgBubble,
        ...(isMe ? styles.myMsg : styles.otherMsg),
        ...(isImage ? {
          padding: "4px"
        } : {})
      }
    }, isImage ? /*#__PURE__*/React.createElement("img", {
      src: m.content,
      alt: "",
      style: {
        maxWidth: "100%",
        maxHeight: "220px",
        borderRadius: "6px",
        display: "block"
      },
      onClick: () => window.open(m.content, "_blank")
    }) : m.content));
  }), /*#__PURE__*/React.createElement("div", {
    ref: endRef,
    id: "msg-end"
  }));
};
const MessageInput = ({
  onSend,
  isSending,
  onUploadImage,
  isUploading
}) => {
  const [val, setVal] = useState("");
  const fileRef = useRef(null);
  const handleSend = () => {
    if (!val.trim() || isSending) return;
    onSend(val);
    setVal("");
  };
  const disabled = isSending || !val.trim();
  const btnBg = disabled ? "#ccc" : "#007bff";
  const handleFileChange = e => {
    const file = e.target.files && e.target.files[0];
    if (file) onUploadImage(file);
    e.target.value = ""; // 允许重复选同一文件
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...styles.inputArea,
      ...styles.reset
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => fileRef.current && fileRef.current.click(),
    disabled: isUploading,
    title: "\u4E0A\u4F20\u56FE\u7247",
    style: {
      ...styles.btnReset,
      backgroundColor: "#f1f0f0",
      color: "#333",
      cursor: isUploading ? "wait" : "pointer",
      padding: "0 10px",
      height: "36px",
      flex: "none"
    }
  }, isUploading ? "…" : "🖼"), /*#__PURE__*/React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: "image/*",
    style: {
      display: "none"
    },
    onChange: handleFileChange
  }), /*#__PURE__*/React.createElement("input", {
    style: styles.inputReset,
    value: val,
    onChange: e => setVal(e.target.value),
    onKeyDown: e => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSend();
      }
    },
    placeholder: "\u8F93\u5165\u6D88\u606F...",
    disabled: isSending
  }), /*#__PURE__*/React.createElement("button", {
    onClick: handleSend,
    disabled: disabled,
    style: {
      ...styles.btnReset,
      backgroundColor: btnBg,
      color: "white",
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "background-color 0.2s"
    }
  }, isSending ? "..." : "发送"));
};

// --- Main App ---

const ChatApp = () => {
  // UI State
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isHovered, setIsHovered] = useState(false);

  // Drag State
  const [pos, setPos] = useState({
    x: window.innerWidth - 70,
    y: window.innerHeight - 100
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({
    x: 0,
    y: 0
  });
  const initialPosRef = useRef({
    x: 0,
    y: 0
  });
  const hasMovedRef = useRef(false);
  const lastClickTimeRef = useRef(0);

  // Chat Data State
  // 【免注册直接开聊】保持原样：输入一个昵称就开始聊（无注册/无鉴权）。
  // 已有昵称则直接进入聊天；无则显示登录屏（LoginScreen）让用户输入。
  const [username, setUsername] = useState(localStorage.getItem("chat_username") || "");
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("chat_username"));
  const [sessionID, setSessionID] = useState("");
  const [messages, setMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const poller = useRef(null);

  // 【公告】窗口悬浮顶置 + 角标红点
  const [announcement, setAnnouncement] = useState("");
  const [annUpdatedAt, setAnnUpdatedAt] = useState(0);
  const [annSeen, setAnnSeen] = useState(parseInt(localStorage.getItem("chat_ann_seen") || "0", 10));
  const [annClosed, setAnnClosed] = useState(false);

  // 拉取公告：updated_at 比本地已读新则亮红点
  useEffect(() => {
    fetch(`${SERVER_URL}/api/announcement`).then(r => r.json()).then(d => {
      setAnnouncement(d.text || "");
      setAnnUpdatedAt(d.updated_at || 0);
    }).catch(() => {});
  }, []);

  // 打开窗口即视为已读（清除红点）
  useEffect(() => {
    if (isOpen && annUpdatedAt > annSeen) {
      localStorage.setItem("chat_ann_seen", String(annUpdatedAt));
      setAnnSeen(annUpdatedAt);
    }
  }, [isOpen, annUpdatedAt]);
  const annVisible = !!announcement && !annClosed;
  const annUnread = annUpdatedAt > annSeen;

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
      setPos(p => ({
        x: Math.min(p.x, window.innerWidth - 50),
        y: Math.min(p.y, window.innerHeight - 50)
      }));
    };
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Drag Logic
  const handleDragStart = e => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = {
      x: clientX,
      y: clientY
    };
    initialPosRef.current = {
      ...pos
    };
    setIsHovered(true);
  };
  const handleDragMove = e => {
    if (!isDragging) return;
    if (e.cancelable && e.type === "touchmove") {
      e.preventDefault();
    }
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasMovedRef.current = true;
    }
    const ballSize = 48;
    const newX = initialPosRef.current.x + dx;
    const newY = initialPosRef.current.y + dy;
    const maxX = window.innerWidth - ballSize;
    const maxY = window.innerHeight - ballSize;
    setPos({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };
  const handleDragEnd = () => {
    setIsDragging(false);
    setIsHovered(false);
    if (!hasMovedRef.current) {
      const now = Date.now();
      if (now - lastClickTimeRef.current < 500) return;
      lastClickTimeRef.current = now;
      setIsOpen(prev => !prev);
    }
  };
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
      window.addEventListener("touchmove", handleDragMove, {
        passive: false
      });
      window.addEventListener("touchend", handleDragEnd);
    }
    return () => {
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", handleDragMove);
      window.removeEventListener("touchend", handleDragEnd);
    };
  }, [isDragging]);

  // Chat Logic
  const loadData = async params => {
    try {
      return await (await fetch(`${SERVER_URL}/api/messages?${new URLSearchParams(params)}`)).json();
    } catch {
      return [];
    }
  };
  useEffect(() => {
    if (!isLoggedIn || !isOpen) return;
    let stopped = false;
    // 用闭包变量维护 lastId（不能从 setMessages 的 updater 里读——React 的
    // updater 异步执行，lastId 会一直是 0，导致 poll 每次 after_id=0 拿全部历史、
    // 立即返回、忙循环「不停加载」）
    let lastId = 0;
    const pollLoop = async () => {
      while (!stopped) {
        try {
          const resp = await fetch(`${SERVER_URL}/api/poll?after_id=${lastId}&timeout=25`);
          if (stopped) return;
          const newMsgs = await resp.json();
          if (Array.isArray(newMsgs) && newMsgs.length > 0) {
            lastId = newMsgs[newMsgs.length - 1].id;
            const el = document.getElementById("msg-end");
            const shouldScroll = el && el.getBoundingClientRect().top < window.innerHeight;
            setMessages(curr => [...curr, ...newMsgs]);
            if (shouldScroll || !el) setTimeout(scrollToBottom, 100);
          }
        } catch (e) {
          // 网络错误：等一会再试（不终止循环）
          await new Promise(r => setTimeout(r, 3000));
        }
      }
    };

    // 先拉最近 10 条，再用它们的最大 id 作为长轮询起点
    loadData({
      limit: 10
    }).then(msgs => {
      if (stopped) return;
      setMessages(msgs);
      lastId = msgs.length ? msgs[msgs.length - 1].id : 0;
      setTimeout(scrollToBottom, 100);
      pollLoop();
    }).catch(() => {
      if (!stopped) pollLoop();
    });
    return () => {
      stopped = true;
    };
  }, [isLoggedIn, isOpen]);
  const scrollToBottom = () => document.getElementById("msg-end")?.scrollIntoView({
    behavior: "smooth"
  });
  const handleLoadHistory = async target => {
    if (messages.length === 0 || loadingHistory) return;
    setLoadingHistory(true);
    const oldMsgs = await loadData({
      before_id: messages[0].id,
      limit: 10
    });
    if (oldMsgs.length > 0) {
      const oldHeight = target.scrollHeight;
      setMessages(prev => [...oldMsgs, ...prev]);
      setTimeout(() => {
        target.scrollTop = target.scrollHeight - oldHeight;
      }, 0);
    }
    setLoadingHistory(false);
  };
  const handleLogin = name => {
    localStorage.setItem("chat_username", name);
    setUsername(name);
    setIsLoggedIn(true);
  };

  // 【新增】处理设置点击（回到登录页）
  const handleOpenSettings = () => {
    setIsLoggedIn(false);
  };
  const handleSend = async content => {
    setIsSending(true);
    try {
      await fetch(`${SERVER_URL}/api/send`, {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionID,
          username,
          content,
          ua: navigator.userAgent,
          referer: document.referrer || window.location.href
        })
      });
      setTimeout(scrollToBottom, 200);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  // 【图片上传】raw body PUT 到 upload.moonchan.xyz（见 KB moonchan-upload-api：
  // 服务端只认 raw body，禁止 multipart/-F；文件名放 URL 路径）。上传成功后把返回
  // 的图片 url 作为一条图片消息发到群里。
  const handleUploadImage = async file => {
    setIsSending(true);
    try {
      const fileName = encodeURIComponent(file.name || "image.png");
      const resp = await fetch(`${UPLOAD_URL}/${fileName}`, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream"
        },
        body: file
      });
      if (!resp.ok) throw new Error(`upload failed: ${resp.status}`);
      const data = await resp.json();
      const imgUrl = data.url;
      if (!imgUrl) throw new Error("upload response missing url");
      await fetch(`${SERVER_URL}/api/send`, {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionID,
          username,
          content: imgUrl,
          ua: navigator.userAgent,
          referer: document.referrer || window.location.href
        })
      });
      setTimeout(scrollToBottom, 200);
    } catch (e) {
      console.error("image upload error:", e);
      alert("图片上传失败：" + (e.message || e));
    } finally {
      setIsSending(false);
    }
  };
  const getWindowStyle = () => {
    if (isMobile) return {
      ...styles.windowMobile,
      ...styles.reset
    };
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
      top: top + "px"
    };
  };
  const ballDynamicStyle = {
    ...styles.ball,
    left: pos.x + "px",
    top: pos.y + "px",
    opacity: isDragging || isHovered || isOpen ? 1.0 : 0.6,
    transform: isDragging || isHovered ? "scale(1.1)" : "scale(1)"
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, isOpen && /*#__PURE__*/React.createElement("div", {
    style: getWindowStyle()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...styles.header,
      ...styles.reset
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: styles.title
  }, "\u7FA4\u804A\uFF08\u6D4B\u8BD5\u7248\uFF09"), /*#__PURE__*/React.createElement("div", {
    style: styles.headerRight
  }, isLoggedIn && /*#__PURE__*/React.createElement("div", {
    style: styles.iconBtn,
    onClick: handleOpenSettings,
    title: "\u8BBE\u7F6E/\u4FEE\u6539\u6635\u79F0"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
  }))), /*#__PURE__*/React.createElement("div", {
    style: styles.iconBtn,
    onClick: () => setIsOpen(false),
    title: "\u5173\u95ED"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "18",
    y1: "6",
    x2: "6",
    y2: "18"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "6",
    y1: "6",
    x2: "18",
    y2: "18"
  }))))), annVisible && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "8px 12px",
      backgroundColor: "#fff7ed",
      borderBottom: "1px solid #fed7aa",
      color: "#9a3412",
      fontSize: "13px",
      display: "flex",
      alignItems: "flex-start",
      gap: "8px",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      wordBreak: "break-word"
    }
  }, announcement), /*#__PURE__*/React.createElement("span", {
    style: {
      cursor: "pointer",
      fontSize: "14px",
      color: "#9a3412",
      flex: "none",
      lineHeight: "1"
    },
    onClick: () => setAnnClosed(true),
    title: "\u5173\u95ED\u516C\u544A"
  }, "\xD7")), !isLoggedIn ? /*#__PURE__*/React.createElement(LoginScreen, {
    onLogin: handleLogin,
    currentName: username
  }) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(MessageList, {
    messages: messages,
    currentSessionID: sessionID,
    isMobile: isMobile,
    onLoadHistory: handleLoadHistory,
    loadingHistory: loadingHistory
  }), /*#__PURE__*/React.createElement(MessageInput, {
    onSend: handleSend,
    isSending: isSending,
    onUploadImage: handleUploadImage,
    isUploading: isSending
  }))), /*#__PURE__*/React.createElement("div", {
    style: ballDynamicStyle,
    onMouseDown: handleDragStart,
    onTouchStart: handleDragStart,
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false)
  }, isOpen ? /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "18",
    y1: "6",
    x2: "6",
    y2: "18"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "6",
    y1: "6",
    x2: "18",
    y2: "18"
  })) : /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
  })), !isOpen && annUnread && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "2px",
      right: "2px",
      width: "12px",
      height: "12px",
      borderRadius: "50%",
      backgroundColor: "#e5484d",
      border: "2px solid #fff"
    }
  })));
};
const rootDiv = document.createElement("div");
rootDiv.id = "chat-widget-root";
rootDiv.style.all = "initial";
document.body.appendChild(rootDiv);
const root = ReactDOM.createRoot(rootDiv);
root.render(/*#__PURE__*/React.createElement(ChatApp, null));