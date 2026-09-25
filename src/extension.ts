import * as vscode from 'vscode';
import * as fs from 'fs';
import { LanMultiplayer } from './common';

type Difficulty = 'easy' | 'normal' | 'hard';

// 联机相关持久化键
const NICK_KEY = 'sevenColors.nickname';
const SOUND_KEY = 'sevenColors.soundOn';

function getNickname(ctx: vscode.ExtensionContext): string {
  return ctx.globalState.get<string>(NICK_KEY) || '玩家';
}
function getSoundOn(ctx: vscode.ExtensionContext): boolean {
  return ctx.globalState.get<boolean>(SOUND_KEY, true);
}

// ---------- TreeView 节点 ----------
type TreeNode =
  | { kind: 'diff'; id: string; label: string; description?: string; difficulty: Difficulty }
  | { kind: 'group'; id: string; label: string; children: TreeNode[] }
  | { kind: 'action'; id: string; label: string; description?: string; command: string };

const ROOT: TreeNode[] = [
  { kind: 'diff', id: 'easy', label: '简单', description: '轻松对战', difficulty: 'easy' },
  { kind: 'diff', id: 'normal', label: '普通', description: '标准对战', difficulty: 'normal' },
  { kind: 'diff', id: 'hard', label: '困难', description: '硬核对战', difficulty: 'hard' },
  {
    kind: 'group', id: 'multi', label: '联机对战', children: [
      { kind: 'action', id: 'create', label: '创建房间', description: '作为房主开局', command: 'sevenColors.multiCreate' },
      { kind: 'action', id: 'join', label: '加入房间', description: '输入房主 IP:端口', command: 'sevenColors.multiJoin' },
      { kind: 'action', id: 'nick', label: '设定昵称', description: '玩家', command: 'sevenColors.setNickname' }
    ]
  },
  { kind: 'action', id: 'sound', label: '音效开关', description: '开', command: 'sevenColors.toggleSound' }
];

class SevenColorsTreeDataProvider implements vscode.TreeDataProvider<TreeNode> {
  constructor(private context: vscode.ExtensionContext) {}

  private _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  refresh() { this._onDidChangeTreeData.fire(undefined); }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    if (element.kind === 'group') {
      const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Collapsed);
      item.id = element.id;
      item.iconPath = new vscode.ThemeIcon('organization');
      return item;
    }
    const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
    item.id = element.id;
    if (element.kind === 'diff') {
      item.command = { command: 'sevenColors.open', title: '打开游戏', arguments: [element.difficulty] };
      item.iconPath = new vscode.ThemeIcon('play');
    } else {
      item.command = { command: element.command, title: element.label };
      item.iconPath = new vscode.ThemeIcon(
        element.id === 'create' ? 'add' :
        element.id === 'join' ? 'sign-in' :
        element.id === 'nick' ? 'edit' : 'volume'
      );
    }
    let desc = element.description;
    if (element.kind === 'action' && element.id === 'nick') {
      desc = '当前：' + getNickname(this.context);
    } else if (element.kind === 'action' && element.id === 'sound') {
      desc = getSoundOn(this.context) ? '开' : '关';
    }
    item.description = desc;
    item.tooltip = element.label;
    return item;
  }

  getChildren(element?: TreeNode): TreeNode[] {
    if (!element) return ROOT;
    if (element.kind === 'group') return element.children;
    return [];
  }
}

let panel: vscode.WebviewPanel | undefined;
let lan: LanMultiplayer;

// 读取 src/webview/game.html，注入难度与消息钩子后作为 webview 内容
function getWebviewContent(context: vscode.ExtensionContext, difficulty: Difficulty): string {
  const htmlPath = vscode.Uri.joinPath(context.extensionUri, 'src', 'webview', 'game.html');
  let html = fs.readFileSync(htmlPath.fsPath, 'utf-8');

  // 用树选中的难度覆盖默认值
  html = html.replace("difficulty='normal';", `difficulty=${JSON.stringify(difficulty)};`);
  // 用扩展中保存的音量状态初始化单机音效（同时由 TreeView「音效开关」下发 setSound 覆盖）
  html = html.replace("let soundOn = true;", `let soundOn = ${JSON.stringify(getSoundOn(context))};`);

  // 接收来自扩展的难度切换 / 重开消息
  const hook = `<script>
    window.addEventListener('message', e => {
      if (!e.data) return;
      if (e.data.type === 'difficulty') {
        try { difficulty = e.data.value; } catch (_) {}
        try { showDifficulty(); } catch (_) {}
      } else if (e.data.type === 'restart') {
        try { init(); } catch (_) {}
      }
    });
  </script>`;
  html = html.replace('</body>', hook + '\n</body>');

  return html;
}

function openGame(context: vscode.ExtensionContext, difficulty: Difficulty) {
  if (panel) {
    panel.reveal(vscode.ViewColumn.One);
    panel.webview.postMessage({ type: 'difficulty', value: difficulty });
    panel.webview.postMessage({ type: 'setSound', on: getSoundOn(context) });
    return;
  }
  panel = vscode.window.createWebviewPanel(
    'sevenColors',
    '7Colors 你 vs 机器人',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'src', 'webview')]
    }
  );
  panel.webview.html = getWebviewContent(context, difficulty);
  panel.webview.postMessage({ type: 'setSound', on: getSoundOn(context) });
  panel.onDidDispose(() => { panel = undefined; }, null, context.subscriptions);
}

export function activate(context: vscode.ExtensionContext) {
  const provider = new SevenColorsTreeDataProvider(context);

  // 单机：难度选择 / 重开
  context.subscriptions.push(
    vscode.commands.registerCommand('sevenColors.open', (d?: Difficulty) => openGame(context, d ?? 'normal'))
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('sevenColors.restart', () => {
      if (panel) {
        panel.webview.postMessage({ type: 'restart' });
      }
    })
  );

  // 联机：对接 common 的 lan-multiplayer（不修改 common 代码）
  lan = new LanMultiplayer({
    context,
    commandPrefix: 'sevenColors',
    viewTypeHost: 'sevenColors.multiHost',
    viewTypeClient: 'sevenColors.multiClient',
    port: 18765,
    maxPeers: 1,                                  // 1v1 对战
    webviewHtmlPath: (ctx) =>
      vscode.Uri.joinPath(ctx.extensionUri, 'src', 'webview', 'game-multi.html'),
    buildBootstrap: (p) => ({
      role: p.role,
      host: p.host,
      port: p.port,
      localIp: p.localIp,
      nickname: getNickname(context),
      soundOn: getSoundOn(context)
    })
  });
  lan.registerCommands();

  // 联机菜单：设定昵称 / 音效开关
  context.subscriptions.push(
    vscode.commands.registerCommand('sevenColors.setNickname', async () => {
      const cur = getNickname(context);
      const input = await vscode.window.showInputBox({
        prompt: '设置你的联机昵称',
        value: cur,
        ignoreFocusOut: true,
        validateInput: (v) => (v.length > 12 ? '最多 12 个字符' : undefined)
      });
      if (input === undefined) return;
      const name = (input.trim() || '玩家').slice(0, 12);
      await context.globalState.update(NICK_KEY, name);
      lan.postToWebview({ type: 'setNick', name });
      provider.refresh();
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('sevenColors.toggleSound', async () => {
      const on = !getSoundOn(context);
      await context.globalState.update(SOUND_KEY, on);
      // 同时控制单机（game.html）与联机（game-multi.html）的音效状态
      if (panel) panel.webview.postMessage({ type: 'setSound', on });
      lan.postToWebview({ type: 'setSound', on });
      provider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('sevenColors.diff', provider)
  );
}

export function deactivate() {}
