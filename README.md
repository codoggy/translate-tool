sudo tee /etc/nginx/sites-available/translate-tool <<'EOF'
server {
  listen 8000;
  server_name _;

  root /var/www/translate-tool;
  index translate-html.html;

  location / {
    try_files $uri $uri/ =404;
  }
}
EOF

sudo ln -sf /etc/nginx/sites-available/translate-tool /etc/nginx/sites-enabled/translate-tool
sudo nginx -t
sudo systemctl reload nginx
sudo ufw allow 8000





sudo systemctl status nginx --no-pager
ss -lntp | grep nginx


