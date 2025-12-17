# 注意：这里我们手动 build 并打上标签，不依赖 compose 的自动构建
docker build -t inline-chat-server:v1 .

docker save inline-chat-server:v1 | gzip > inline-chat-server-v1.tar.gz