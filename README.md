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










server {
    listen 8080;

    location / {
        proxy_pass http://127.0.0.1:11434;
        proxy_http_version 1.1;

        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Headers *;
        add_header Access-Control-Allow-Methods *;
    }
}

