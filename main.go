package main

import (
	"database/sql"
	"embed"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

//go:embed static
var staticFiles embed.FS

// 全局变量存储 Host 地址
var appHost string

// ... (Message 结构体, db 变量, initDB 函数保持不变) ...

type Message struct {
	ID        int64  `json:"id"`
	Username  string `json:"username"`
	Content   string `json:"content"`
	UA        string `json:"ua"`
	Referer   string `json:"referer"`
	CreatedAt int64  `json:"created_at"`
}

var db *sql.DB
var dbLock sync.Mutex

func initDB() {
	var err error
	db, err = sql.Open("sqlite3", "./chat.db")
	if err != nil {
		log.Fatal(err)
	}
	query := `
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        content TEXT,
        ua TEXT,
        referer TEXT,
        created_at INTEGER
    );`
	_, err = db.Exec(query)
	if err != nil {
		log.Fatal(err)
	}
}

func enableCors(w *http.ResponseWriter) {
	(*w).Header().Set("Access-Control-Allow-Origin", "*")
	(*w).Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
	(*w).Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

// --- 【关键修改】静态文件 Handler ---
// 这里读取文件后，将 __API_HOST__ 替换为实际的 appHost
func handleStaticFile(filename string, contentType string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		enableCors(&w)

		// 1. 读取 embed 文件 (二进制)
		contentBytes, err := staticFiles.ReadFile("static/" + filename)
		if err != nil {
			http.Error(w, "File not found", 404)
			return
		}

		// 2. 转换为字符串
		contentStr := string(contentBytes)

		// 3. 执行替换：将占位符替换为环境变量的值
		// 这样前端 JS 拿到的就是 http://your-domain.com 而不是 __API_HOST__
		finalContent := strings.ReplaceAll(contentStr, "__API_HOST__", appHost)

		w.Header().Set("Content-Type", contentType)
		w.Write([]byte(finalContent))
	}
}

// ... (handleMessages 和 handleSend 保持不变) ...

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

	query := "SELECT id, username, content, ua, referer, created_at FROM messages "
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
		rows.Scan(&m.ID, &m.Username, &m.Content, &m.UA, &m.Referer, &m.CreatedAt)
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

	dbLock.Lock()
	res, err := db.Exec("INSERT INTO messages (username, content, ua, referer, created_at) VALUES (?, ?, ?, ?, ?)",
		m.Username, m.Content, m.UA, m.Referer, m.CreatedAt)
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
	// 【关键修改】初始化时读取环境变量
	// 如果没有设置 APP_HOST，则默认回退到 localhost
	appHost = os.Getenv("APP_HOST")
	if appHost == "" {
		appHost = "http://localhost:8765" // 默认值
		fmt.Println("Warning: APP_HOST not set, defaulting to", appHost)
	} else {
		// 简单的格式修正，确保没有尾部斜杠
		appHost = strings.TrimRight(appHost, "/")
		fmt.Println("Using APP_HOST:", appHost)
	}

	initDB()

	http.HandleFunc("/loader.js", handleStaticFile("loader.js", "application/javascript"))
	http.HandleFunc("/widget.jsx", handleStaticFile("widget.jsx", "text/plain"))
	http.HandleFunc("/api/messages", handleMessages)
	http.HandleFunc("/api/send", handleSend)

	fmt.Println("Server running on :8765")
	log.Fatal(http.ListenAndServe(":8765", nil))
}
