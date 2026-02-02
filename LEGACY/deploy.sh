#!/bin/bash

# AURA Deployment Script
# Kjør dette scriptet på VPS-serveren

set -e

echo "🚀 Starting AURA deployment..."

# Farger for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variabler - tilpass disse
APP_DIR="/var/www/aura"
REPO_URL="https://github.com/YOUR_USERNAME/aura.git"  # Bytt til din repo
DOMAIN="your-domain.com"  # Bytt til ditt domene

echo -e "${BLUE}📦 Installing system dependencies...${NC}"
# Oppdater system
sudo apt update
sudo apt upgrade -y

# Installer Node.js (v20)
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# Installer PM2
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# Installer Nginx
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
fi

# Installer MongoDB (valgfritt - kan bruke MongoDB Atlas i stedet)
if ! command -v mongod &> /dev/null; then
    echo -e "${BLUE}📊 Installing MongoDB...${NC}"
    wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    sudo apt update
    sudo apt install -y mongodb-org
    sudo systemctl start mongod
    sudo systemctl enable mongod
fi

echo -e "${BLUE}📂 Setting up application directory...${NC}"
# Opprett app directory
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR

# Klon repository (eller bruk rsync/scp for å kopiere filer)
if [ ! -d "$APP_DIR/.git" ]; then
    git clone $REPO_URL $APP_DIR
else
    cd $APP_DIR
    git pull origin main
fi

cd $APP_DIR

echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

echo -e "${BLUE}🔨 Building application...${NC}"
npm run build

echo -e "${BLUE}⚙️ Setting up environment...${NC}"
# Kopier .env fil
if [ ! -f ".env" ]; then
    cp .env.production .env
    echo "⚠️  Remember to edit .env with your actual credentials!"
fi

# Opprett logs directory
mkdir -p logs

echo -e "${BLUE}🔧 Configuring Nginx...${NC}"
# Kopier nginx config
sudo cp nginx.conf /etc/nginx/sites-available/aura
sudo ln -sf /etc/nginx/sites-available/aura /etc/nginx/sites-enabled/

# Fjern default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx config
sudo nginx -t

echo -e "${BLUE}🔒 Setting up SSL with Let's Encrypt...${NC}"
# Installer certbot
if ! command -v certbot &> /dev/null; then
    sudo apt install -y certbot python3-certbot-nginx
fi

# Få SSL sertifikat (kommenter ut hvis du ikke har domene ennå)
# sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m your-email@example.com

echo -e "${BLUE}🚀 Starting application with PM2...${NC}"
# Start app med PM2
pm2 delete aura-backend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Restart Nginx
sudo systemctl restart nginx

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}🌐 Your app should be running at: https://$DOMAIN${NC}"
echo ""
echo "Useful commands:"
echo "  pm2 status          - Check app status"
echo "  pm2 logs            - View logs"
echo "  pm2 restart all     - Restart app"
echo "  pm2 monit           - Monitor app"
echo ""
echo "⚠️  Don't forget to:"
echo "  1. Update .env with your MongoDB credentials"
echo "  2. Update nginx.conf with your domain"
echo "  3. Run: sudo certbot --nginx -d $DOMAIN"
