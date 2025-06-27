# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
- `npm run dev` - Start development mode with file watching and hot reload
- `npm run build` - Build for production (includes TypeScript type checking)
- `npm install` - Install dependencies

### Development Workflow
1. Run `npm run dev` to start development mode
2. The plugin will be automatically rebuilt when files change
3. Reload Obsidian to see changes (Ctrl+R in developer mode)
4. Check the Developer Console (Ctrl+Shift+I) for errors

### Project Architecture (Current State)
This is currently an Obsidian sample plugin template that needs to be converted to a GTD management plugin:

- `main.ts` - Main plugin file (currently sample plugin template)
- `manifest.json` - Plugin metadata and configuration  
- `package.json` - Dependencies and build scripts
- `esbuild.config.mjs` - Build configuration using esbuild
- `tsconfig.json` - TypeScript configuration
- `styles.css` - Plugin styles

### Obsidian Plugin Development Notes
- **Plugin Lifecycle**: Use `onload()` for initialization, `onunload()` for cleanup
- **Settings Management**: Use `loadData()` and `saveData()` for plugin settings persistence
- **File Operations**: Use `app.vault` API for all file system operations
- **Metadata Access**: Use `app.metadataCache` for efficient YAML frontmatter parsing
- **UI Elements**: Use `addRibbonIcon()`, `addCommand()`, `PluginSettingTab`
- **Periodic Tasks**: Use `registerInterval()` to ensure cleanup on plugin unload

# GTD Management Plugin for Obsidian

## 概要
ObsidianでGTD（Getting Things Done）システムを効率的に管理するためのプラグインを作成します.

## 機能要件

### 1. GTD管理ディレクトリ指定機能
- ユーザーがGTDタスクを管理するディレクトリパスを設定可能
- デフォルト: `GTD/Tasks`
- 設定画面で変更可能

### 2. 完了タスクの自動削除機能
- YAML frontmatterで `task status: done` のファイルを削除
- 自動削除の実行間隔を設定可能（1日,3日,1週間,1ヶ月など）
- マニュアル実行機能（コマンドパレット,リボンアイコン）

### 3. ごみ箱タスクの自動削除機能
- YAML frontmatterで `task kind: ごみ箱` のファイルを削除
- 自動削除の実行間隔を設定可能
- マニュアル実行機能

### 4. 期限切れタスクの日付更新機能
- YAML frontmatterで `scheduled date` が今日より過去のタスクを今日の日付に更新
- 自動更新の実行間隔を設定可能
- マニュアル実行機能

### 5. #TODOタグからのタスクファイル自動作成機能
- 指定されたディレクトリ内のmdファイルから `- [ ] #TODO <task content>` を検索
- 検索対象ディレクトリを複数指定可能
- #TODOタグから自動作成されたタスクファイルにマーカーを追加
- 元のチェックボックスファイルへのリンクをタスクファイルに追加
- **タスク完了時のチェックボックス自動更新機能**
  - タスクファイルの `task status: done` になったら元のチェックボックスを `- [x]` に変更
  - 自動チェック更新の実行間隔を設定可能
  - マニュアル実行機能

## 技術仕様

### プロジェクト構造
```
obsidian-gtd-manager/
├── main.ts              # メインプラグインファイル
├── settings.ts          # 設定管理
├── gtd-manager.ts       # GTD操作のロジック
├── todo-parser.ts       # #TODO解析とタスク作成
├── checkbox-sync.ts     # チェックボックス同期機能
├── types.ts             # 型定義
├── manifest.json        # プラグインマニフェスト
├── package.json         # 依存関係
├── tsconfig.json        # TypeScript設定
├── esbuild.config.mjs   # ビルド設定
└── styles.css           # スタイル（必要に応じて）
```

### 依存関係
- TypeScript 4.7.4+
- **Obsidian API (メイン依存)**: ファイル操作,UI,設定管理
- **Node.js標準ライブラリ**: 基本的なユーティリティ機能
- esbuild (ビルドツールのみ)
- 外部ライブラリの使用は最小限に抑制

### 設定項目
```typescript
interface GTDSettings {
  gtdDirectory: string;           // GTD管理ディレクトリ
  searchDirectories: string[];    // #TODO検索対象ディレクトリリスト
  autoDeleteCompleted: boolean;   // 完了タスク自動削除の有効/無効
  autoDeleteTrash: boolean;       // ごみ箱タスク自動削除の有効/無効
  autoUpdateSchedule: boolean;    // 期限切れタスク自動更新の有効/無効
  autoCreateFromTodo: boolean;    // #TODOからタスク自動作成の有効/無効
  autoUpdateCheckbox: boolean;    // チェックボックス自動更新の有効/無効
  deleteCompletedInterval: number; // 完了タスク削除間隔（時間）
  deleteTrashInterval: number;     // ごみ箱タスク削除間隔（時間）
  updateScheduleInterval: number;  // 期限切れタスク更新間隔（時間）
  createFromTodoInterval: number;  // #TODO検索間隔（時間）
  updateCheckboxInterval: number;  // チェックボックス更新間隔（時間）
}
```

### 主要機能実装

#### 1. YAML frontmatter解析
- **Obsidian標準のApp.metadataCache**を使用してfrontmatterを解析
- `app.metadataCache.getFileCache(file).frontmatter`でメタデータ取得
- `app.fileManager.processFrontMatter()`でfrontmatterの更新

#### 2. ファイル操作
- **Obsidian Vault API**を使用したファイル検索（`app.vault.getFiles()`）
- **Obsidian FileManager**を使用したファイル削除（`app.vault.delete()`）
- **Obsidian標準API**でのfrontmatter更新
- **内蔵正規表現**でのマークダウンファイル内チェックボックス検索
- **JavaScript標準機能**での#TODOタグ抽出と解析

#### 3. タスク作成機能
- **Obsidian Vault API**での新規ファイル作成（`app.vault.create()`）
- **Obsidian標準のウィキリンク**での元ファイルへのリンク作成
- **Plugin Data API**での作成元情報記録（`this.saveData()`）
- **JavaScript Set/Map**での重複タスク作成防止

#### 4. 双方向同期機能
- **Obsidian FileManager**でのファイル内容更新（`app.vault.modify()`）
- **Plugin Data Storage**での関連付け管理（`this.loadData()`/`this.saveData()`）
- **JavaScript標準機能**での同期状態追跡

#### 5. 定期実行機能
- **JavaScript標準のsetInterval**を使用した定期実行
- **Obsidian Plugin lifecycle**での適切なクリーンアップ
- **Plugin registerInterval**での複数定期タスク管理

#### 6. UI要素
- **Obsidian標準UI API**での設定タブ（`PluginSettingTab`）
- **Obsidian Ribbon API**でのリボンアイコン（`addRibbonIcon`）
- **Obsidian Command API**でのコマンドパレット統合（`addCommand`）
- **Obsidian Notice API**での通知表示（`new Notice()`）

## 実装の詳細

### メインプラグインクラス
```typescript
export default class GTDManagerPlugin extends Plugin {
  settings: GTDSettings;
  gtdManager: GTDManager;

  async onload() {
    // 設定読み込み
    // コマンド登録
    // リボンアイコン追加
    // 定期実行タスクの開始
    // 設定タブ追加
  }

  onunload() {
    // 定期実行タスクのクリーンアップ
  }
}
```

### GTD管理クラス
```typescript
class GTDManager {
  // 既存機能
  async deleteCompletedTasks(): Promise<number>
  async deleteTrashTasks(): Promise<number>
  async updateOverdueTasks(): Promise<number>

  // 新機能: #TODOタスク作成
  async createTasksFromTodos(): Promise<number>
  async updateCheckboxesFromTasks(): Promise<number>

  // プライベートメソッド
  private async getTaskFiles(): Promise<TFile[]>
  private async getMarkdownFiles(directories: string[]): Promise<TFile[]>
  private async parseTaskFile(file: TFile): Promise<TaskMetadata>
  private async findTodoItems(file: TFile): Promise<TodoItem[]>
  private async createTaskFromTodo(todo: TodoItem): Promise<boolean>
  private async updateCheckboxInFile(file: TFile, lineNumber: number): Promise<boolean>
  private isTaskCompleted(metadata: TaskMetadata): boolean
  private isTaskTrash(metadata: TaskMetadata): boolean
  private isTaskOverdue(metadata: TaskMetadata): boolean
}

// 新しい型定義
interface TodoItem {
  content: string;
  sourceFile: string;
  lineNumber: number;
  taskId: string; // 一意識別子
}

interface TaskMetadata {
  taskStatus: string;
  taskKind: string;
  scheduledDate: string;
  createdFrom?: string; // #TODOから作成された場合のソース情報
  sourceFile?: string;  // 元ファイルのパス
  sourceLine?: number;  // 元ファイルの行番号
}
```

## 開発手順

1. **プロジェクト初期化**
   ```bash
   mkdir obsidian-gtd-manager
   cd obsidian-gtd-manager
   npm init -y
   ```

2. **依存関係インストール**
   ```bash
   npm install -D typescript @types/node esbuild obsidian
   ```

3. **設定ファイル作成**
   - `tsconfig.json`
   - `esbuild.config.mjs`
   - `manifest.json`

4. **コア機能実装**
   - `main.ts`: プラグインメインクラス
   - `settings.ts`: 設定管理
   - `gtd-manager.ts`: GTD操作ロジック
   - `todo-parser.ts`: #TODO解析とタスク作成
   - `checkbox-sync.ts`: チェックボックス同期機能

5. **UI実装**
   - 設定タブ
   - リボンアイコン
   - 通知システム

6. **テストとデバッグ**
   - 開発モードでの動作確認
   - エラーハンドリングの実装

## 注意事項

- **Obsidian標準APIの活用**: 可能な限りObsidianが提供する標準APIとツールのみを使用し,外部ライブラリへの依存を最小限に抑える
- **軽量な実装**: Node.jsの標準ライブラリとObsidian APIで実現できる機能は外部依存を避ける
- ファイル削除前に確認ダイアログを表示する
- バックアップの重要性をユーザーに伝える
- エラーハンドリングを適切に実装する
- パフォーマンスを考慮したファイル検索の実装
- プラグイン無効化時のリソースクリーンアップ
- #TODO検索時の正規表現パフォーマンス最適化
- チェックボックスとタスクファイルの関連付けデータの管理
- 重複タスク作成の防止機能
- 元ファイルが削除された場合の対応

## #TODOタスク作成の詳細仕様

### 検索パターン
```regex
- \[ \] #TODO (.+)
```

### 作成されるタスクファイルの形式
```yaml
---
ID: 202412271545
created: 2024-12-27 15:45
title: <TODO content>
aliases:
deadline:
scheduled date:
project:
task kind:
task status: not_yet
created_from: todo
source_file: "[[<source file path>]]"
source_line: <line number>
todo_id: <unique identifier>
---

## 作成元
このタスクは以下のファイルの#TODOから自動作成されました：
- ファイル: [[<source file path>]]
- 行番号: <line number>
- 作成日時: <timestamp>

## タスク内容
<TODO content>
```

### 同期メカニズム
1. **タスク作成時**: #TODOアイテムに一意のIDを内部で関連付け
2. **状態同期**: タスクファイルの`task status`が`done`になったら対応するチェックボックスを`[x]`に変更
3. **関連付け管理**: プラグインデータとして同期関係を保存

### コマンドとUI
- **リボンアイコン**: GTD管理パネルの表示
- **コマンドパレット**:
  - "GTD: Scan for #TODO items"
  - "GTD: Update checkboxes from completed tasks"
  - "GTD: Clean completed tasks"
  - "GTD: Clean trash tasks"
  - "GTD: Update overdue tasks"

## テスト環境

- Obsidian 1.8.10+
- 既存のGTDディレクトリ構造との互換性確保
- 大量のタスクファイルでのパフォーマンステスト

## 拡張予定機能

- タスク統計の表示
- GTDワークフローの可視化
- 他のプラグインとの連携機能
- #TODOタグの優先度設定（#TODO-HIGH,#TODO-LOWなど）
- 複数の#TODOタグ形式への対応
- タスク作成時の自動カテゴリ分類
- 完了タスクのアーカイブ機能

## 実装優先度

### Phase 1 (高優先度)
1. 基本的なGTD管理機能（完了タスク削除,ごみ箱削除,期限更新）
2. #TODOからのタスク作成機能
3. 基本的な設定画面

### Phase 2 (中優先度)
1. チェックボックス自動更新機能
2. 定期実行機能の完全実装
3. エラーハンドリングの強化

### Phase 3 (低優先度)
1. UI/UXの改善
2. 統計機能
3. 拡張機能の実装
