#!/bin/sh
set -e

echo "🔧 ImageBox Docker Entrypoint"

# 确保数据目录存在（即使没有挂载 volume，也要创建）
mkdir -p /app/data
mkdir -p /app/public/generated/thumbnails

# 如果数据库不存在，从模板复制初始化
if [ ! -f /app/data/imagebox.db ]; then
    echo "📦 Database not found, initializing from template..."
    if [ -f /app/prisma/template.db ]; then
        cp /app/prisma/template.db /app/data/imagebox.db
        echo "✅ Database initialized successfully"
    else
        echo "❌ Template database not found!"
        exit 1
    fi
else
    echo "✅ Database found at /app/data/imagebox.db"
fi

echo "🚀 Starting ImageBox server..."
exec "$@"

