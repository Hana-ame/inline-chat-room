package main

import (
	"crypto/md5"
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
	appHost    string
	runtimeDir = "./runtime"
	dbPath     = filepath.Join(runtimeDir, "chat.db")
	db         *sql.DB
	dbLock     sync.Mutex
)

// --- 数据模型 ---
type Message struct {
	ID        int64  `json:"id"`
	SessionID string `json:"session_id"` // 新增：用于区分设备的唯一ID
	Username  string `json:"username"`
	Content   string `json:"content"`
	UA        string `json:"ua"`
	Referer   string `json:"referer"`
	IPHash    string `json:"ip_hash"` // 新增：加密后的IP
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
	processAndSaveFile("widget.jsx")

	// 4. 初始化数据库
	initDB()
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

	query := "SELECT id, session_id, username, content, ua, referer, ip_hash, created_at FROM messages "
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
		rows.Scan(&m.ID, &m.SessionID, &m.Username, &m.Content, &m.UA, &m.Referer, &m.IPHash, &m.CreatedAt)
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

	// 处理 IP Hash
	rawIP := getClientIP(r)
	m.IPHash = hashIP(rawIP)

	dbLock.Lock()
	res, err := db.Exec("INSERT INTO messages (session_id, username, content, ua, referer, ip_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
		m.SessionID, m.Username, m.Content, m.UA, m.Referer, m.IPHash, m.CreatedAt)
	dbLock.Unlock()

	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	id, _ := res.LastInsertId()
	m.ID = id

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(m)
}

func main() {
	initEnvironment()

	// 路由：此时从 runtime 文件夹读取文件
	http.HandleFunc("/loader.js", handleRuntimeFile("loader.js", "application/javascript"))
	http.HandleFunc("/widget.jsx", handleRuntimeFile("widget.jsx", "text/plain"))

	http.HandleFunc("/api/messages", handleMessages)
	http.HandleFunc("/api/send", handleSend)

	fmt.Println("Server running on :8765")
	log.Fatal(http.ListenAndServe(":8765", nil))
}
