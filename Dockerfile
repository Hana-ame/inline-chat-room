# === Builder Stage ===
FROM golang:1.25-alpine AS builder

# 安装 gcc 和 musl-dev，这是编译 CGO (SQLite) 必须的
RUN apk add --no-cache gcc musl-dev

WORKDIR /app

# 2. 【新增】配置 Go 代理
# direct 表示如果代理找不到，尝试直连
ENV GOPROXY=https://goproxy.cn,direct

# 预先下载依赖，利用 Docker 缓存
COPY go.mod go.sum ./
RUN go mod download

# 复制源码
COPY . .

# 编译
# -ldflags="-s -w" 去除调试信息，减小体积
# CGO_ENABLED=1 是默认的，但显式声明更好
RUN CGO_ENABLED=1 go build -ldflags="-s -w" -o chat-server main.go

# === Runner Stage ===
FROM alpine:latest

# 安装 CA 证书 (如果需要请求 HTTPS) 和时区数据
# RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

# 从 Builder 阶段复制二进制文件
COPY --from=builder /app/chat-server .

# 暴露端口
EXPOSE 8765

# 声明 runtime 目录为 Volume，方便 docker-compose 映射
VOLUME ["/app/runtime"]

CMD ["./chat-server"]