# 打包说明

## 打包产物

- `dist/LunarMissionClassroom-V4.exe`：单文件便携版，双击即可运行。
- 文件体积约 90MB~130MB（包含 Chromium 运行时）。
- 所有游戏资源均已内嵌，可离线运行，无需额外安装浏览器。

## 运行方式

1. 将 `LunarMissionClassroom-V4.exe` 复制到电脑任意位置（桌面 / U 盘均可）。
2. 双击运行，程序会自动进入全屏课堂模式。
3. 右上角/右下角有半透明悬浮按钮：
   - ⌂ 返回首页
   - ⛶ 切换全屏 / 窗口
   - ✕ 退出程序
4. 快捷键：
   - `F11`：切换全屏
   - `Esc`：退出全屏
   - `Alt + F4` / `Ctrl + Q`：退出程序

## 重新打包

如果游戏源码（`index.html`、`mission.html`、`assets/`、`js/`）有更新：

```bash
cd packaging
bash build.sh
```

打包完成后新 exe 会出现在 `packaging/dist/` 目录。

## 文件说明

- `main.js`：Electron 主进程，控制窗口、全屏、快捷键、菜单等。
- `preload.js`：预加载脚本，负责注入悬浮控制按钮。
- `build/icon.ico`：应用图标。
- `app/`：从项目根目录复制进来的游戏文件（打包时自动生成）。
- `dist/`：最终 exe 输出目录。
