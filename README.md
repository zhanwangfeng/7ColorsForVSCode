# 7Colors for VS Code

[![VS Marketplace](https://vsmarketplacebadges.dev/version-short/zhanwangfeng.7colors-vscode.svg)](https://marketplace.visualstudio.com/items?itemName=zhanwangfeng.7colors-vscode)
[![Installs](https://vsmarketplacebadges.dev/installs/zhanwangfeng.7colors-vscode.svg)](https://marketplace.visualstudio.com/items?itemName=zhanwangfeng.7colors-vscode)

在 VS Code 中直接游玩 7Colors 染色对战小游戏的扩展插件。

- GitHub: https://github.com/zhanwangfeng/7ColorsForVSCode
- VSCode: https://marketplace.visualstudio.com/items?itemName=zhanwangfeng.7colors-vscode

## 游戏截图

![游戏截图](resources/shortcut_001.png)

## 1. 插件说明

- **新功能**：从 0.2.0 版本开始，支持局域网联机对战（创建 / 加入房间），并统一了单机与联机的音效开关。
- **功能**：通过内置 Webview 在编辑器内运行 7Colors 染色对战，不离开 VS Code 即可休闲娱乐。
- **入口**：活动栏「7Colors」难度树，或命令面板执行 `7Colors: 打开游戏`。
- **主要特性**：
  - 侧栏提供 **简单 / 普通 / 困难** 三档难度，点击即开一局。
  - Webview 棋盘：7 色调色盘、悬停预览将要染色的格子、落子后颜色沿相邻格传播扩散的动画。
  - 侧栏「音效开关」一键切换单机与联机音效；棋盘内「重开一局」随时重开（联机仅房主在结束后可重开）。
  - 对局中可随时在侧栏切换难度，立即应用到当前局。
  - 每局随机布置、双方基地异色，保证公平开局。
- **规则简介**：
  - 轮到你时选择一种颜色，你的所有领地以及与之相邻的同色格都会被染成该色。
  - 不能选择与对方基地相同的颜色。
  - 双方都无法继续扩展时，按占地格数判定胜负，占地多者获胜。
- **操作按键**：
  - `1`–`7`：选择对应颜色落子
  - `R`：重开一局
  - 鼠标：点击调色盘选色；悬停格子预览染色范围

## 2. 联机对战（局域网 1v1）

在活动栏「7Colors」难度树展开 **联机对战**：

- **创建房间**：作为房主开启本地 WebSocket 服务并等待好友加入，顶栏会显示房间地址（如 `192.168.1.20:18765`）。
- **加入房间**：作为客机，输入房主显示的 `IP:端口`（同一局域网）即可连接开局。
- **设定昵称**：设置联机昵称（最长 12 字符）。

规则与单机一致：双方各据一侧基地，按占地格数判定胜负；房主在游戏结束后可点击「重开一局」再战，客机不显示该按钮。

## 3. 插件启动说明

### 方式一：VS Code 插件市场安装（推荐）

1. 打开 VS Code，进入扩展市场（快捷键 `Cmd/Ctrl + Shift + X`）。
2. 搜索 **`7Colors`**（或本插件发布名 `7colors-vscode`），点击 **安装**。
3. 安装完成后，点击活动栏的 **7Colors** 图标打开难度树，选择一个难度即可开始；或按 `Cmd/Ctrl + Shift + P` 执行命令 **`7Colors: 打开游戏`**。
4. 对局中可随时在难度树切换难度，或点击棋盘内的「重开一局」重新开始。

> 安装后若命令/视图未出现，可重启 VS Code 重新加载扩展。

### 方式二：本地源码调试运行（F5）

适用于从源码二次开发或本地预览：

1. 安装依赖：

   ```bash
   npm install
   ```

2. 使用 VS Code 打开本项目根目录，按 **F5** 启动调试。
   - 调试前会自动编译 TypeScript（`src` → `out`）并后台监听改动。
   - VS Code 会打开一个新的「扩展开发宿主」窗口。
3. 在扩展开发窗口中，点击活动栏 **7Colors** 图标打开难度树并选择难度，或执行命令 **`7Colors: 打开游戏`** 即可游玩。

### 其他编译方式

- 单次编译：`npm run compile`
- 监听编译：`npm run watch`（调试时修改代码自动重新编译，重跑命令即生效）
- 打包发布：`npm run package`（自动先执行 `vscode:prepublish` 编译，生成带版本号的 .vsix）
