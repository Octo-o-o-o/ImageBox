#!/bin/sh
set -e

echo "🔧 ImageBox Docker Entrypoint"

# 确保数据目录存在
mkdir -p /app/data
mkdir -p /app/public/generated

echo "✅ Data directories ready"
echo "🚀 Starting ImageBox server..."
exec "$@"
