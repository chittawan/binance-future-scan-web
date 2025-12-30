#!/bin/sh

# Inject environment variables into the built application
# This script runs before nginx starts

# Default values if not provided
API_BASE_URL=${API_BASE_URL:-"https://bnbot.codewalk.myds.me"}
PORT=${PORT:-80}

# ============================================
# Inject API_BASE_URL into index.html
# ============================================
# Inject as window variable in index.html
# Inject script in body BEFORE module script to ensure it executes first
if [ -f /usr/share/nginx/html/index.html ]; then
  echo "📄 Found index.html, injecting API_BASE_URL: $API_BASE_URL"
  
  # Remove existing injection if any
  sed -i '/window\.__API_BASE_URL__/d' /usr/share/nginx/html/index.html
  
  # Use awk to safely inject the script tag
  # This avoids issues with special characters in sed
  # Match pattern with optional whitespace: <div id="root"></div>
  if awk -v api_url="$API_BASE_URL" '
    /<div[[:space:]]*id="root"[[:space:]]*><\/div>/ {
      sub(/<\/div>/, "</div><script>window.__API_BASE_URL__=\x27" api_url "\x27;</script>")
      found=1
    }
    { print }
    END { if (!found) exit 1 }
  ' /usr/share/nginx/html/index.html > /usr/share/nginx/html/index.html.tmp; then
    mv /usr/share/nginx/html/index.html.tmp /usr/share/nginx/html/index.html
    echo "✓ Script tag injected using awk"
  else
    echo "⚠ awk injection failed, trying sed fallback..."
    # Fallback to sed method
    ESCAPED_URL=$(echo "$API_BASE_URL" | sed "s/'/'\\\\''/g")
    sed -i "s|<div id=\"root\"></div>|<div id=\"root\"></div><script>window.__API_BASE_URL__='${ESCAPED_URL}';</script>|" /usr/share/nginx/html/index.html
  fi
  
  # Verify injection
  if grep -q "window.__API_BASE_URL__" /usr/share/nginx/html/index.html; then
    INJECTED_URL=$(grep -o "window.__API_BASE_URL__='[^']*'" /usr/share/nginx/html/index.html | head -1 | sed "s/window.__API_BASE_URL__='//" | sed "s/';//")
    echo "✓ Script injection verified: window.__API_BASE_URL__='${INJECTED_URL}'"
  else
    echo "⚠ Warning: Script injection verification failed"
    echo "⚠ Attempting to view index.html body section:"
    grep -A 5 '<body>' /usr/share/nginx/html/index.html || echo "⚠ Could not find body tag"
  fi
else
  echo "⚠ Warning: index.html not found at /usr/share/nginx/html/index.html"
  echo "⚠ Listing files in /usr/share/nginx/html:"
  ls -la /usr/share/nginx/html/ | head -10
fi

# ============================================
# Configure nginx with PORT
# ============================================
# Replace PORT placeholder in nginx config template
if [ -f /etc/nginx/conf.d/default.conf.template ]; then
  sed "s|__PORT__|${PORT}|g" /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf
  echo "✓ Nginx configured to listen on port: $PORT"
else
  echo "⚠ Warning: nginx config template not found, using default config"
fi

echo "✓ API_BASE_URL injected: $API_BASE_URL"
echo "✓ Starting nginx on port $PORT..."

# Start nginx
exec nginx -g "daemon off;"

