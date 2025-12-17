package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"sync"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

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

// 处理跨域
func enableCors(w *http.ResponseWriter) {
	(*w).Header().Set("Access-Control-Allow-Origin", "*") // 生产环境请修改为特定域名
	(*w).Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
	(*w).Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

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

	var rows *sql.Rows
	var err error

	query := "SELECT id, username, content, ua, referer, created_at FROM messages "

	dbLock.Lock()
	if afterID > 0 {
		// 轮询新消息
		query += fmt.Sprintf("WHERE id > %d ORDER BY id ASC", afterID)
		rows, err = db.Query(query)
	} else if beforeID > 0 {
		// 加载历史消息 (先倒序取，内存里反转)
		query += fmt.Sprintf("WHERE id < %d ORDER BY id DESC LIMIT %d", beforeID, limit)
		rows, err = db.Query(query)
	} else {
		// 初始加载
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

	// 如果是历史记录或初始加载 (按 DESC 取出的)，需要反转为时间正序
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
	initDB()
	http.HandleFunc("/api/messages", handleMessages)
	http.HandleFunc("/api/send", handleSend)

	fmt.Println("API Server running on :8765")
	log.Fatal(http.ListenAndServe(":8765", nil))
}
