#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting AURA Server Setup...${NC}"

# 1. Install Docker if missing
if ! command -v docker &> /dev/null; then
    echo -e "${BLUE}📦 Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    # Start docker
    systemctl start docker
    systemctl enable docker
else
    echo -e "${GREEN}✅ Docker is already installed.${NC}"
fi

# 2. Setup Directory
APP_DIR="/root/avestella"
mkdir -p $APP_DIR

# 3. Unzip source (assumed uploaded to /root/avestella.zip)
if [ -f "/root/avestella.zip" ]; then
    echo -e "${BLUE}📂 Unpacking application...${NC}"
    apt-get install -y unzip
    unzip -o /root/avestella.zip -d $APP_DIR
    rm /root/avestella.zip
fi

cd $APP_DIR

# 4. Build Docker Image
echo -e "${BLUE}🔨 Building Docker image (this may take a few minutes)...${NC}"
docker build -t avestella:latest .

# 5. Stop existing container
echo -e "${BLUE}🛑 Stopping existing container...${NC}"
docker stop avestella-game || true
docker rm avestella-game || true

# 6. Run container
# -p 80:3001  -> Host port 80 maps to Container port 3001
# -v data:/data -> Persist volumes if needed (configured in app to use /data?)
# Note: Using MONGODB_URI env var. If using local mongo in another container, use --link or network.
# For simplicity, let's run a MongoDB container if not exists
if [ ! "$(docker ps -q -f name=avestella-mongo)" ]; then
    if [ ! "$(docker ps -aq -f name=avestella-mongo)" ]; then
        docker run -d --name avestella-mongo -v mongo-data:/data/db mongo:latest
    else
        docker start avestella-mongo
    fi
fi

echo -e "${BLUE}🚀 Starting Game Server...${NC}"
docker run -d \
  --name avestella-game \
  --restart unless-stopped \
  --link avestella-mongo:mongo \
  -e MONGODB_URI="mongodb://mongo:27017/aura" \
  -e PORT=3001 \
  -p 80:3001 \
  avestella:latest

echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "Web Game accessible at: http://$(curl -s ifconfig.me)"
