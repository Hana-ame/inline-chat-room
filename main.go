package main

import (
	"crypto/hmac"
	"crypto/md5"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"embed"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

//go:embed static
var staticFiles embed.FS

var (
	appHost       string
	runtimeDir    = "./runtime"
	dbPath        = filepath.Join(runtimeDir, "chat.db")
	db            *sql.DB
	dbLock        sync.Mutex
	adminPassword string
	adminSecret   []byte // 用于签发/校验 admin token
)

// --- 数据模型 ---
type Message struct {
	ID        int64  `json:"id"`
	SessionID string `json:"session_id"` // 新增：用于区分设备的唯一ID
	Username  string `json:"username"`
	Content   string `json:"content"`
	UA        string `json:"ua"`
	Referer   string `json:"referer"`
	IPHash    string `json:"ip_hash"` // 新增：哈希后的IP（供显示，不明文泄露）
	IP        string `json:"-"`       // 新增：明文IP，仅落盘、绝不进 JSON 响应
	CreatedAt int64  `json:"created_at"`
}

// --- 初始化 ---

func initEnvironment() {
	// 1. 获取环境变量
	appHost = os.Getenv("APP_HOST")
	if appHost == "" {
		appHost = "http://localhost:8765"
		fmt.Println("Warning: APP_HOST not set, defaulting to", appHost)
	} else {
		appHost = strings.TrimRight(appHost, "/")
	}

	// 2. 创建 runtime 目录
	if err := os.MkdirAll(runtimeDir, 0755); err != nil {
		log.Fatal("Failed to create runtime directory:", err)
	}

	// 3. 处理并保存静态文件到 runtime
	processAndSaveFile("loader.js")
	processAndSaveFile("widget.js")  // 构建期编译好的 JS（无 JSX），可浏览器缓存
	processAndSaveFile("widget.jsx") // 保留源码副本供排障/兼容

	// 4. 初始化数据库
	initDB()

	// 5. Admin 配置：密码来自 env（无默认值，空则禁用后台管理），token 密钥随机生成
	adminPassword = os.Getenv("ADMIN_PASSWORD")
	if adminPassword == "" {
		log.Println("WARNING: ADMIN_PASSWORD not set -> admin panel disabled")
	}
	adminSecret = make([]byte, 32)
	if _, err := rand.Read(adminSecret); err != nil {
		log.Fatal("Failed to generate admin secret:", err)
	}
}

func processAndSaveFile(filename string) {
	// 从 embed 读取模板
	contentBytes, err := staticFiles.ReadFile("static/" + filename)
	if err != nil {
		log.Fatalf("Failed to read template %s: %v", filename, err)
	}

	// 替换占位符
	contentStr := string(contentBytes)
	finalContent := strings.ReplaceAll(contentStr, "__API_HOST__", appHost)

	// 写入 runtime 目录
	destPath := filepath.Join(runtimeDir, filename)
	err = os.WriteFile(destPath, []byte(finalContent), 0644)
	if err != nil {
		log.Fatalf("Failed to write runtime file %s: %v", destPath, err)
	}
	fmt.Printf("Generated runtime file: %s (API_HOST: %s)\n", destPath, appHost)
}

func initDB() {
	var err error
	db, err = sql.Open("sqlite3", dbPath)
	if err != nil {
		log.Fatal(err)
	}

	// 更新表结构：增加了 session_id 和 ip_hash
	query := `
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        username TEXT,
        content TEXT,
        ua TEXT,
        referer TEXT,
        ip_hash TEXT,
        created_at INTEGER
    );`
	_, err = db.Exec(query)
	if err != nil {
		log.Fatal("DB Init Error:", err)
	}

	// 迁移：给既有表补 ip 列（明文 IP，仅落盘用；新表已含）。SQLite 无 IF NOT EXISTS for COLUMN，用 PRAGMA 判列存在。
	var hasIP int
	if err := db.QueryRow("SELECT COUNT(*) FROM pragma_table_info('messages') WHERE name='ip'").Scan(&hasIP); err != nil {
		log.Fatal("DB PRAGMA Error:", err)
	}
	if hasIP == 0 {
		if _, err := db.Exec("ALTER TABLE messages ADD COLUMN ip TEXT"); err != nil {
			log.Fatal("DB Migrate ip Error:", err)
		}
		fmt.Println("Migrated: added column messages.ip")
	}

	// 公告表（单行：id=1 恒在，admin 更新 text/updated_at）
	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS announcement (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        text TEXT NOT NULL DEFAULT '',
        updated_at INTEGER NOT NULL DEFAULT 0
    );`); err != nil {
		log.Fatal("DB announcement Error:", err)
	}
	var one int
	if err := db.QueryRow("SELECT COUNT(*) FROM announcement WHERE id=1").Scan(&one); err != nil {
		log.Fatal("DB announcement count Error:", err)
	}
	if one == 0 {
		if _, err := db.Exec("INSERT INTO announcement (id, text, updated_at) VALUES (1, '', 0)"); err != nil {
			log.Fatal("DB announcement seed Error:", err)
		}
	}
}

// 辅助：获取客户端IP
func getClientIP(r *http.Request) string {
	// 1. 尝试从 X-Forwarded-For 获取 (Docker/Nginx 环境常用)
	xForwardedFor := r.Header.Get("X-Forwarded-For")
	if xForwardedFor != "" {
		return strings.Split(xForwardedFor, ",")[0]
	}
	// 2. 尝试从 X-Real-IP 获取
	xRealIP := r.Header.Get("X-Real-IP")
	if xRealIP != "" {
		return xRealIP
	}
	// 3. 直接获取 RemoteAddr (通常包含端口)
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}

// 辅助：Hash IP
func hashIP(ip string) string {
	hash := md5.Sum([]byte(ip + "salt_chat_2024")) // 加盐防止彩虹表
	return hex.EncodeToString(hash[:])[:8]         // 只取前8位作为指纹
}

func enableCors(w *http.ResponseWriter) {
	(*w).Header().Set("Access-Control-Allow-Origin", "*")
	(*w).Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
	(*w).Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

// 从磁盘 runtime 目录提供文件
func handleRuntimeFile(filename string, contentType string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		enableCors(&w)
		filePath := filepath.Join(runtimeDir, filename)
		content, err := os.ReadFile(filePath)
		if err != nil {
			http.Error(w, "File not found in runtime", 404)
			return
		}
		w.Header().Set("Content-Type", contentType)
		w.Header().Set("Cache-Control", "public, max-age=3600") // 编译后的 widget.js/loader.js 可缓存
		w.Write(content)
	}
}

// --- API Handlers (保持不变) ---

func handleMessages(w http.ResponseWriter, r *http.Request) {
	enableCors(&w)
	if r.Method == "OPTIONS" {
		return
	}

	limit := 10
	afterID := 0
	beforeID := 0

	if l, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil {
		limit = l
	}
	if a, err := strconv.Atoi(r.URL.Query().Get("after_id")); err == nil {
		afterID = a
	}
	if b, err := strconv.Atoi(r.URL.Query().Get("before_id")); err == nil {
		beforeID = b
	}

	query := "SELECT id, session_id, username, content, ua, referer, ip_hash, ip, created_at FROM messages "
	dbLock.Lock()
	var rows *sql.Rows
	var err error
	if afterID > 0 {
		query += fmt.Sprintf("WHERE id > %d ORDER BY id ASC", afterID)
		rows, err = db.Query(query)
	} else if beforeID > 0 {
		query += fmt.Sprintf("WHERE id < %d ORDER BY id DESC LIMIT %d", beforeID, limit)
		rows, err = db.Query(query)
	} else {
		query += fmt.Sprintf("ORDER BY id DESC LIMIT %d", limit)
		rows, err = db.Query(query)
	}
	dbLock.Unlock()

	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer rows.Close()

	var msgs []Message
	for rows.Next() {
		var m Message
		// Scan 必须包含所有字段
		rows.Scan(&m.ID, &m.SessionID, &m.Username, &m.Content, &m.UA, &m.Referer, &m.IPHash, &m.IP, &m.CreatedAt)
		msgs = append(msgs, m)
	}
	if afterID == 0 {
		for i, j := 0, len(msgs)-1; i < j; i, j = i+1, j-1 {
			msgs[i], msgs[j] = msgs[j], msgs[i]
		}
	}
	if msgs == nil {
		msgs = []Message{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(msgs)
}

func handleSend(w http.ResponseWriter, r *http.Request) {
	enableCors(&w)
	if r.Method == "OPTIONS" {
		return
	}

	var m Message
	if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
		http.Error(w, err.Error(), 400)
		return
	}

	m.CreatedAt = time.Now().Unix()

	// 处理 IP Hash：ip_hash 只存哈希（供显示），ip 存明文（仅落盘，json:"-" 不出 JSON）
	rawIP := getClientIP(r)
	m.IPHash = hashIP(rawIP)
	m.IP = rawIP

	dbLock.Lock()
	res, err := db.Exec("INSERT INTO messages (session_id, username, content, ua, referer, ip_hash, ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		m.SessionID, m.Username, m.Content, m.UA, m.Referer, m.IPHash, m.IP, m.CreatedAt)
	dbLock.Unlock()

	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	id, _ := res.LastInsertId()
	m.ID = id

	// 唤醒长轮询等待者
	pollNotify()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(m)
}

// --- 长轮询 ---
var (
	pollMu      sync.Mutex
	pollWaiters = make(map[chan struct{}]struct{})
)

func pollNotify() {
	pollMu.Lock()
	for ch := range pollWaiters {
		select {
		case ch <- struct{}{}:
		default:
		}
	}
	pollMu.Unlock()
}

// handlePoll: GET /api/poll?after_id=N —— 挂起直到有 id>N 的新消息或超时，返回新消息数组。
// 客户端用单连接循环代替 2s 短轮询；长轮询用标准库实现（WS 需额外依赖+nginx Upgrade 头）。
func handlePoll(w http.ResponseWriter, r *http.Request) {
	enableCors(&w)
	if r.Method == "OPTIONS" {
		return
	}

	afterID := 0
	if a, err := strconv.Atoi(r.URL.Query().Get("after_id")); err == nil {
		afterID = a
	}
	timeoutSec := 25
	if t, err := strconv.Atoi(r.URL.Query().Get("timeout")); err == nil && t > 0 && t < 60 {
		timeoutSec = t
	}

	ch := make(chan struct{}, 1)
	pollMu.Lock()
	pollWaiters[ch] = struct{}{}
	pollMu.Unlock()
	defer func() {
		pollMu.Lock()
		delete(pollWaiters, ch)
		pollMu.Unlock()
	}()

	// 先查一次（防唤醒与查询之间的竞态）
	msgs := fetchMessagesAfter(afterID)
	if len(msgs) > 0 {
		writeJSON(w, msgs)
		return
	}

	timer := time.NewTimer(time.Duration(timeoutSec) * time.Second)
	defer timer.Stop()
	select {
	case <-ch:
		msgs = fetchMessagesAfter(afterID)
	case <-timer.C:
		msgs = []Message{}
	}
	writeJSON(w, msgs)
}

func fetchMessagesAfter(afterID int) []Message {
	dbLock.Lock()
	rows, err := db.Query("SELECT id, session_id, username, content, ua, referer, ip_hash, ip, created_at FROM messages WHERE id > ? ORDER BY id ASC", afterID)
	dbLock.Unlock()
	if err != nil {
		return []Message{}
	}
	defer rows.Close()
	var msgs []Message
	for rows.Next() {
		var m Message
		rows.Scan(&m.ID, &m.SessionID, &m.Username, &m.Content, &m.UA, &m.Referer, &m.IPHash, &m.IP, &m.CreatedAt)
		msgs = append(msgs, m)
	}
	if msgs == nil {
		msgs = []Message{}
	}
	return msgs
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

// --- 公告 ---

func getAnnouncement() (string, int64) {
	dbLock.Lock()
	defer dbLock.Unlock()
	var text string
	var updatedAt int64
	err := db.QueryRow("SELECT text, updated_at FROM announcement WHERE id=1").Scan(&text, &updatedAt)
	if err != nil {
		return "", 0
	}
	return text, updatedAt
}

// GET /api/announcement —— 公开：widget 读取公告（无鉴权）
func handleAnnouncement(w http.ResponseWriter, r *http.Request) {
	enableCors(&w)
	if r.Method == "OPTIONS" {
		return
	}
	text, updatedAt := getAnnouncement()
	writeJSON(w, map[string]interface{}{"text": text, "updated_at": updatedAt})
}

// --- Admin 鉴权 ---

func issueAdminToken() (string, error) {
	now := time.Now()
	exp := now.Add(24 * time.Hour).Unix()
	mac := hmac.New(sha256.New, adminSecret)
	fmt.Fprintf(mac, "admin:%d", exp)
	sig := hex.EncodeToString(mac.Sum(nil))
	return fmt.Sprintf("%d.%s", exp, sig), nil
}

func verifyAdminToken(token string) bool {
	parts := strings.SplitN(token, ".", 2)
	if len(parts) != 2 {
		return false
	}
	exp, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil || time.Now().Unix() > exp {
		return false
	}
	mac := hmac.New(sha256.New, adminSecret)
	fmt.Fprintf(mac, "admin:%d", exp)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(parts[1]), []byte(expected))
}

// adminAuth 包装：要求 Authorization: Bearer <token>
func adminAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		enableCors(&w)
		if r.Method == "OPTIONS" {
			return
		}
		auth := r.Header.Get("Authorization")
		token := strings.TrimPrefix(auth, "Bearer ")
		if adminPassword == "" || !verifyAdminToken(token) {
			http.Error(w, "unauthorized", 401)
			return
		}
		next(w, r)
	}
}

// POST /api/admin/login {"password": "..."} -> {"token": "..."}
func handleAdminLogin(w http.ResponseWriter, r *http.Request) {
	enableCors(&w)
	if r.Method == "OPTIONS" {
		return
	}
	if adminPassword == "" {
		http.Error(w, "admin disabled", 403)
		return
	}
	var req struct {
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", 400)
		return
	}
	if req.Password != adminPassword {
		http.Error(w, "unauthorized", 401)
		return
	}
	token, _ := issueAdminToken()
	writeJSON(w, map[string]string{"token": token})
}

// GET /api/admin/announcement —— admin 读当前公告
// POST /api/admin/announcement {"text": "..."} —— admin 更新公告
func handleAdminAnnouncement(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		text, updatedAt := getAnnouncement()
		writeJSON(w, map[string]interface{}{"text": text, "updated_at": updatedAt})
		return
	}
	if r.Method == "POST" {
		var req struct {
			Text string `json:"text"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad request", 400)
			return
		}
		text := strings.TrimSpace(req.Text)
		now := time.Now().Unix()
		dbLock.Lock()
		_, err := db.Exec("UPDATE announcement SET text=?, updated_at=? WHERE id=1", text, now)
		dbLock.Unlock()
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		writeJSON(w, map[string]interface{}{"text": text, "updated_at": now})
		return
	}
	http.Error(w, "method not allowed", 405)
}

// GET /api/admin/messages?limit=100 —— admin 列出消息（含 ip 明文，仅 admin 可见）
func handleAdminMessages(w http.ResponseWriter, r *http.Request) {
	limit := 100
	if l, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil && l > 0 && l <= 500 {
		limit = l
	}
	dbLock.Lock()
	rows, err := db.Query("SELECT id, session_id, username, content, ua, referer, ip_hash, ip, created_at FROM messages ORDER BY id DESC LIMIT ?", limit)
	dbLock.Unlock()
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer rows.Close()
	type AdminMsg struct {
		ID        int64  `json:"id"`
		SessionID string `json:"session_id"`
		Username  string `json:"username"`
		Content   string `json:"content"`
		UA        string `json:"ua"`
		Referer   string `json:"referer"`
		IPHash    string `json:"ip_hash"`
		IP        string `json:"ip"` // 仅 admin 可见明文 IP
		CreatedAt int64  `json:"created_at"`
	}
	var msgs []AdminMsg
	for rows.Next() {
		var m AdminMsg
		rows.Scan(&m.ID, &m.SessionID, &m.Username, &m.Content, &m.UA, &m.Referer, &m.IPHash, &m.IP, &m.CreatedAt)
		msgs = append(msgs, m)
	}
	if msgs == nil {
		msgs = []AdminMsg{}
	}
	writeJSON(w, msgs)
}

// DELETE /api/admin/messages?id=N —— admin 删除单条消息
func handleAdminDeleteMessage(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.URL.Query().Get("id"), 10, 64)
	if err != nil || id <= 0 {
		http.Error(w, "bad id", 400)
		return
	}
	dbLock.Lock()
	_, err = db.Exec("DELETE FROM messages WHERE id=?", id)
	dbLock.Unlock()
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	pollNotify()
	writeJSON(w, map[string]interface{}{"ok": true, "deleted": id})
}

// GET / —— 后台管理页（登录 + 公告编辑 + 消息管理）
func handleAdminPage(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	page, err := staticFiles.ReadFile("static/admin.html")
	if err != nil {
		http.Error(w, "admin page not found", 404)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write(page)
}

func main() {
	initEnvironment()

	// 路由：此时从 runtime 文件夹读取文件（widget.js 是构建期编译好的，可缓存）
	http.HandleFunc("/loader.js", handleRuntimeFile("loader.js", "application/javascript"))
	http.HandleFunc("/widget.js", handleRuntimeFile("widget.js", "application/javascript"))
	// 保留 /widget.jsx 兼容旧引用（仍从 runtime 读）
	http.HandleFunc("/widget.jsx", handleRuntimeFile("widget.jsx", "text/plain"))

	http.HandleFunc("/api/messages", handleMessages)
	http.HandleFunc("/api/send", handleSend)
	http.HandleFunc("/api/poll", handlePoll)

	// 公告 + 后台
	http.HandleFunc("/api/announcement", handleAnnouncement)
	http.HandleFunc("/api/admin/login", handleAdminLogin)
	http.HandleFunc("/api/admin/announcement", adminAuth(handleAdminAnnouncement))
	http.HandleFunc("/api/admin/messages", adminAuth(handleAdminMessages))
	http.HandleFunc("/api/admin/messages/delete", adminAuth(handleAdminDeleteMessage))
	http.HandleFunc("/", handleAdminPage) // 后台管理页（/ = 密码登录）

	fmt.Println("Server running on :8765")
	log.Fatal(http.ListenAndServe(":8765", nil))
}
