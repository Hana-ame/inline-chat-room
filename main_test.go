package main

import (
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"
)

// 每个测试用一个独立的临时 runtime dir，避免污染真实库
func setupTest(t *testing.T) {
	t.Helper()
	runtimeDir = filepath.Join(t.TempDir(), "runtime")
	if err := os.MkdirAll(runtimeDir, 0755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	dbPath = filepath.Join(runtimeDir, "chat.db")
	os.Setenv("APP_HOST", "https://inline-chat.moonchan.xyz")
	os.Setenv("ADMIN_PASSWORD", "testpass123")
	initDB()
	adminPassword = os.Getenv("ADMIN_PASSWORD")
}

func TestSendStoresPlaintextIPNotInJSON(t *testing.T) {
	setupTest(t)
	body := bytes.NewBufferString(`{"session_id":"s1","username":"alice","content":"hi","ua":"ua","referer":"ref"}`)
	req := httptest.NewRequest("POST", "/api/send", body)
	w := httptest.NewRecorder()
	handleSend(w, req)
	if w.Code != 200 {
		t.Fatalf("send status=%d", w.Code)
	}
	var m map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &m)
	// JSON 响应不得含明文 ip
	if _, ok := m["ip"]; ok {
		t.Fatalf("JSON response leaked plaintext ip: %v", m["ip"])
	}
	if _, ok := m["ip_hash"]; !ok {
		t.Fatalf("JSON response missing ip_hash")
	}
	// DB 应存明文 ip
	var ip string
	db.QueryRow("SELECT ip FROM messages WHERE id=1").Scan(&ip)
	if ip == "" {
		t.Fatalf("DB did not store plaintext ip")
	}
}

func TestAnnouncementPublicAndAdmin(t *testing.T) {
	setupTest(t)

	// 公开读：初始为空
	w := httptest.NewRecorder()
	handleAnnouncement(w, httptest.NewRequest("GET", "/api/announcement", nil))
	var a map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &a)
	if a["text"] != "" {
		t.Fatalf("initial announcement not empty: %v", a["text"])
	}

	// admin 登录：密码错 -> 401
	bad := httptest.NewRecorder()
	handleAdminLogin(bad, httptest.NewRequest("POST", "/api/admin/login",
		bytes.NewBufferString(`{"password":"wrong"}`)))
	if bad.Code != 401 {
		t.Fatalf("wrong password got %d", bad.Code)
	}

	// admin 登录：密码对 -> token
	ok := httptest.NewRecorder()
	handleAdminLogin(ok, httptest.NewRequest("POST", "/api/admin/login",
		bytes.NewBufferString(`{"password":"testpass123"}`)))
	var lr map[string]string
	json.Unmarshal(ok.Body.Bytes(), &lr)
	if lr["token"] == "" {
		t.Fatalf("no token issued")
	}

	// 无 token 访问 admin 端点 -> 401
	noauth := httptest.NewRecorder()
	adminAuth(handleAdminAnnouncement)(noauth, httptest.NewRequest("GET", "/api/admin/announcement", nil))
	if noauth.Code != 401 {
		t.Fatalf("no-token got %d", noauth.Code)
	}

	// admin 设置公告
	setReq := httptest.NewRequest("POST", "/api/admin/announcement",
		bytes.NewBufferString(`{"text":"welcome!"}`))
	setReq.Header.Set("Authorization", "Bearer "+lr["token"])
	set := httptest.NewRecorder()
	adminAuth(handleAdminAnnouncement)(set, setReq)
	if set.Code != 200 {
		t.Fatalf("set announcement got %d", set.Code)
	}

	// 公开读应看到
	got := httptest.NewRecorder()
	handleAnnouncement(got, httptest.NewRequest("GET", "/api/announcement", nil))
	var a2 map[string]interface{}
	json.Unmarshal(got.Body.Bytes(), &a2)
	if a2["text"] != "welcome!" {
		t.Fatalf("public did not see announcement: %v", a2["text"])
	}
}

func TestPollWakesOnSend(t *testing.T) {
	setupTest(t)

	// 挂起 poll（fresh DB 无消息，after_id=0 会阻塞），异步 send，poll 应立即返回
	pollDone := make(chan []Message, 1)
	go func() {
		rec := httptest.NewRecorder()
		handlePoll(rec, httptest.NewRequest("GET", "/api/poll?after_id=0&timeout=30", nil))
		var msgs []Message
		json.Unmarshal(rec.Body.Bytes(), &msgs)
		pollDone <- msgs
	}()

	// 等 poll 挂起后 send 一条
	time.Sleep(100 * time.Millisecond)
	send := httptest.NewRecorder()
	handleSend(send, httptest.NewRequest("POST", "/api/send",
		bytes.NewBufferString(`{"session_id":"s2","username":"bob","content":"wake","ua":"u","referer":"r"}`)))

	select {
	case msgs := <-pollDone:
		if len(msgs) != 1 || msgs[0].Content != "wake" {
			t.Fatalf("poll returned %d msgs, first=%+v", len(msgs), msgs[0])
		}
	case <-time.After(3 * time.Second):
		t.Fatalf("poll did not wake on send within 3s")
	}
}

func TestAdminMessagesShowsIP(t *testing.T) {
	setupTest(t)
	// send one
	handleSend(httptest.NewRecorder(), httptest.NewRequest("POST", "/api/send",
		bytes.NewBufferString(`{"session_id":"s3","username":"carol","content":"x","ua":"u","referer":"r"}`)))
	// login
	ok := httptest.NewRecorder()
	handleAdminLogin(ok, httptest.NewRequest("POST", "/api/admin/login",
		bytes.NewBufferString(`{"password":"testpass123"}`)))
	var lr map[string]string
	json.Unmarshal(ok.Body.Bytes(), &lr)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/admin/messages", nil)
	req.Header.Set("Authorization", "Bearer "+lr["token"])
	adminAuth(handleAdminMessages)(rec, req)
	var msgs []map[string]interface{}
	json.Unmarshal(rec.Body.Bytes(), &msgs)
	if len(msgs) != 1 {
		t.Fatalf("expected 1 msg, got %d", len(msgs))
	}
	if msgs[0]["ip"] == "" {
		t.Fatalf("admin messages missing plaintext ip")
	}
}
