import * as vscode from 'vscode';
import * as fs from 'fs';

type Difficulty = 'easy' | 'normal' | 'hard';

interface DiffNode {
  id: string;
  label: string;
  description?: string;
  difficulty: Difficulty;
}

const TREE: DiffNode[] = [
  { id: 'easy', label: '简单', description: '轻松对战', difficulty: 'easy' },
  { id: 'normal', label: '普通', description: '标准对战', difficulty: 'normal' },
  { id: 'hard', label: '困难', description: '硬核对战', difficulty: 'hard' }
];

class SevenColorsTreeDataProvider implements vscode.TreeDataProvider<DiffNode> {
  getTreeItem(element: DiffNode): vscode.TreeItem {
    const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
    if (element.description) {
      item.description = element.description;
    }
    item.tooltip = element.label;
    item.command = {
      command: 'sevenColors.open',
      title: '打开',
      arguments: [element.difficulty]
    };
    return item;
  }

  getChildren(element?: DiffNode): DiffNode[] {
    return element ? [] : TREE;
  }
}

let panel: vscode.WebviewPanel | undefined;

// 读取 src/webview/game.html，注入难度与消息钩子后作为 webview 内容
function getWebviewContent(context: vscode.ExtensionContext, difficulty: Difficulty): string {
  const htmlPath = vscode.Uri.joinPath(context.extensionUri, 'src', 'webview', 'game.html');
  let html = fs.readFileSync(htmlPath.fsPath, 'utf-8');

  // 用树选中的难度覆盖默认值
  html = html.replace("difficulty='normal';", `difficulty=${JSON.stringify(difficulty)};`);

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
  panel.onDidDispose(() => { panel = undefined; }, null, context.subscriptions);
}

export function activate(context: vscode.ExtensionContext) {
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
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('sevenColors.diff', new SevenColorsTreeDataProvider())
  );
}

export function deactivate() {}
