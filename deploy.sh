rm inline-chat-server*

wget wsl-5500.moonchan.xyz/inline-chat-server-v1.tar.gz

docker load < inline-chat-server-v1.tar.gz

docker compose stop

docker compose up -d

docker image prune -f