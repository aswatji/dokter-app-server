#!/bin/bash

# Script untuk deployment ke VPS
# Usage: ./deploy.sh

echo "🚀 Starting deployment process..."

# Update sistem
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js jika belum ada
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PostgreSQL jika belum ada
if ! command -v psql &> /dev/null; then
    echo "🗄️ Installing PostgreSQL..."
    sudo apt install postgresql postgresql-contrib -y
    
    # Setup database
    echo "🔧 Setting up database..."
    sudo -u postgres createuser --interactive --pwprompt dokterapp
    sudo -u postgres createdb -O dokterapp dokter_app_db
fi

# Install PM2 globally jika belum ada
if ! command -v pm2 &> /dev/null; then
    echo "⚙️ Installing PM2..."
    sudo npm install -g pm2
fi

# Clone atau update repository
if [ -d "dokter-consultation-api" ]; then
    echo "🔄 Updating existing repository..."
    cd dokter-consultation-api
    git pull origin main
else
    echo "📥 Cloning repository..."
    git clone https://github.com/yourusername/dokter-consultation-api.git
    cd dokter-consultation-api
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Setup environment variables
if [ ! -f ".env" ]; then
    echo "🔧 Setting up environment variables..."
    cp .env.example .env
    echo "⚠️ Please edit .env file with your production settings"
    echo "⚠️ Don't forget to set:"
    echo "   - DATABASE_URL"
    echo "   - JWT_SECRET"
    echo "   - MIDTRANS_SERVER_KEY"
    echo "   - MIDTRANS_CLIENT_KEY"
    echo "   - CLIENT_URL"
    exit 1
fi

# Setup database
echo "🗄️ Setting up database..."
npx prisma generate
npx prisma db push

# Seed database jika diperlukan
read -p "Do you want to seed the database with initial data? (y/N): " seed_db
if [[ $seed_db =~ ^[Yy]$ ]]; then
    npm run db:seed
fi

# Create uploads directory
mkdir -p uploads/{images,audio,documents,others}

# Set proper permissions
sudo chown -R $USER:$USER uploads/
chmod -R 755 uploads/

# Stop existing PM2 process
pm2 stop dokter-api 2>/dev/null || true
pm2 delete dokter-api 2>/dev/null || true

# Start application with PM2
echo "🚀 Starting application..."
pm2 start src/index.js --name "dokter-api"
pm2 startup
pm2 save

# Setup Nginx if requested
read -p "Do you want to setup Nginx reverse proxy? (y/N): " setup_nginx
if [[ $setup_nginx =~ ^[Yy]$ ]]; then
    if ! command -v nginx &> /dev/null; then
        echo "📦 Installing Nginx..."
        sudo apt install nginx -y
    fi
    
    read -p "Enter your domain name (e.g., api.yourdomain.com): " domain_name
    
    # Create Nginx config
    sudo tee /etc/nginx/sites-available/dokter-api > /dev/null <<EOF
server {
    listen 80;
    server_name $domain_name;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

    # Enable site
    sudo ln -sf /etc/nginx/sites-available/dokter-api /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
    
    echo "✅ Nginx configured for domain: $domain_name"
fi

# Setup SSL with Let's Encrypt if requested
if [[ $setup_nginx =~ ^[Yy]$ ]]; then
    read -p "Do you want to setup SSL with Let's Encrypt? (y/N): " setup_ssl
    if [[ $setup_ssl =~ ^[Yy]$ ]]; then
        if ! command -v certbot &> /dev/null; then
            echo "📦 Installing Certbot..."
            sudo apt install certbot python3-certbot-nginx -y
        fi
        
        echo "🔒 Setting up SSL certificate..."
        sudo certbot --nginx -d $domain_name
    fi
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Check application status: pm2 status"
echo "2. View logs: pm2 logs dokter-api"
echo "3. Test API: curl http://localhost:4000/api/health"
echo ""
echo "🔗 Useful commands:"
echo "- Restart app: pm2 restart dokter-api"
echo "- Stop app: pm2 stop dokter-api"
echo "- View logs: pm2 logs dokter-api"
echo "- Monitor: pm2 monit"
echo ""
if [[ $setup_nginx =~ ^[Yy]$ ]]; then
    echo "🌐 Your API is available at: http://$domain_name"
    if [[ $setup_ssl =~ ^[Yy]$ ]]; then
        echo "🔒 SSL enabled: https://$domain_name"
    fi
fi
