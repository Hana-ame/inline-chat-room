#!/bin/bash
# 部署到 cloudcone（不走 wsl-5500，直接 scp）。
# 前置：本地已跑 build.sh 生成 inline-chat-server-v1.tar.gz。
# 用法：./deploy.sh [cloudcone主机]   （默认 cloudcone.moonchan.xyz）
set -e
HOST="${1:-cloudcone.moonchan.xyz}"
TAR="inline-chat-server-v1.tar.gz"
REMOTE_DIR="/root/inline-chat-server"

if [ ! -f "$TAR" ]; then
  echo "[deploy] ERROR: $TAR 不存在，先跑 ./build.sh" >&2
  exit 1
fi

# 1. scp 镜像 tar 到 cloudcone 的部署目录
echo "[deploy] scp $TAR -> $HOST:$REMOTE_DIR/"
scp -o StrictHostKeyChecking=accept-new "$TAR" root@"$HOST":"$REMOTE_DIR"/

# 2. 远端：docker load + compose 重启 + 清理
echo "[deploy] remote: docker load + compose up -d"
ssh -o StrictHostKeyChecking=accept-new root@"$HOST" "cd $REMOTE_DIR && \
  docker load < $TAR && \
  docker compose stop && \
  docker compose up -d && \
  docker image prune -f && \
  rm -f $TAR && \
  echo '[deploy] remote done'"
echo "[deploy] OK"
