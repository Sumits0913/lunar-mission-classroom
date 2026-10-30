#!/usr/bin/env bash
set -e

# 定位到脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# 清理旧的游戏文件并重新从源码复制
rm -rf app
mkdir -p app

cp -r ../index.html app/
cp -r ../mission.html app/
cp -r ../assets app/
cp -r ../js app/

echo "已同步游戏文件到 packaging/app/"

# 开始打包
npm run dist

echo "打包完成，输出目录：$SCRIPT_DIR/dist"
