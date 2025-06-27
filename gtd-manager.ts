import { App, Notice, TFile } from 'obsidian';
import { GTDSettings, TaskMetadata, TodoItem, TaskSyncData, TASK_STATUS, TASK_KIND } from './types';

export class GTDManager {
	private app: App;
	private settings: GTDSettings;
	private syncData: Map<string, TaskSyncData> = new Map();

	constructor(app: App, settings: GTDSettings) {
		this.app = app;
		this.settings = settings;
	}

	// 設定の更新
	updateSettings(settings: GTDSettings) {
		this.settings = settings;
	}

	// 同期データの読み込み
	loadSyncData(data: Record<string, TaskSyncData>) {
		this.syncData = new Map(Object.entries(data));
	}

	// 同期データの保存用データ取得
	getSyncData(): Record<string, TaskSyncData> {
		return Object.fromEntries(this.syncData);
	}

	// 完了タスクの削除
	async deleteCompletedTasks(): Promise<number> {
		const taskFiles = await this.getTaskFiles();
		let deletedCount = 0;

		for (const file of taskFiles) {
			try {
				const metadata = await this.parseTaskFile(file);
				if (this.isTaskCompleted(metadata)) {
					await this.app.vault.delete(file);
					deletedCount++;
					
					// 同期データからも削除
					for (const [key, syncData] of this.syncData.entries()) {
						if (syncData.taskFile === file.path) {
							this.syncData.delete(key);
							break;
						}
					}
				}
			} catch (error) {
				console.error(`Failed to process task file ${file.path}:`, error);
			}
		}

		return deletedCount;
	}

	// ごみ箱タスクの削除
	async deleteTrashTasks(): Promise<number> {
		const taskFiles = await this.getTaskFiles();
		let deletedCount = 0;

		for (const file of taskFiles) {
			try {
				const metadata = await this.parseTaskFile(file);
				if (this.isTaskTrash(metadata)) {
					await this.app.vault.delete(file);
					deletedCount++;
					
					// 同期データからも削除
					for (const [key, syncData] of this.syncData.entries()) {
						if (syncData.taskFile === file.path) {
							this.syncData.delete(key);
							break;
						}
					}
				}
			} catch (error) {
				console.error(`Failed to process trash task file ${file.path}:`, error);
			}
		}

		return deletedCount;
	}

	// 期限切れタスクの日付更新
	async updateOverdueTasks(): Promise<number> {
		const taskFiles = await this.getTaskFiles();
		let updatedCount = 0;
		const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

		for (const file of taskFiles) {
			try {
				const metadata = await this.parseTaskFile(file);
				if (this.isTaskOverdue(metadata)) {
					await this.app.fileManager.processFrontMatter(file, (frontmatter: any) => {
						frontmatter['scheduled date'] = today;
					});
					updatedCount++;
				}
			} catch (error) {
				console.error(`Failed to update overdue task ${file.path}:`, error);
			}
		}

		return updatedCount;
	}

	// #TODOからタスクファイル作成
	async createTasksFromTodos(): Promise<number> {
		const markdownFiles = await this.getMarkdownFiles(this.settings.searchDirectories);
		let createdCount = 0;

		for (const file of markdownFiles) {
			try {
				const todoItems = await this.findTodoItems(file);
				for (const todo of todoItems) {
					// 既存のタスクかチェック
					if (!this.syncData.has(todo.taskId)) {
						const success = await this.createTaskFromTodo(todo);
						if (success) {
							createdCount++;
						}
					}
				}
			} catch (error) {
				console.error(`Failed to process file ${file.path} for TODOs:`, error);
			}
		}

		return createdCount;
	}

	// 完了タスクからチェックボックス更新
	async updateCheckboxesFromTasks(): Promise<number> {
		let updatedCount = 0;

		for (const [todoId, syncData] of this.syncData.entries()) {
			try {
				// タスクファイルが存在するかチェック
				const taskFile = this.app.vault.getAbstractFileByPath(syncData.taskFile);
				if (!(taskFile instanceof TFile)) {
					// タスクファイルが削除されている場合は同期データから削除
					this.syncData.delete(todoId);
					continue;
				}

				const metadata = await this.parseTaskFile(taskFile);
				if (this.isTaskCompleted(metadata)) {
					const success = await this.updateCheckboxInFile(
						syncData.sourceFile,
						syncData.sourceLine
					);
					if (success) {
						updatedCount++;
						// 完了済みの同期データを削除
						this.syncData.delete(todoId);
					}
				}
			} catch (error) {
				console.error(`Failed to update checkbox for todo ${todoId}:`, error);
			}
		}

		return updatedCount;
	}

	// プライベートメソッド
	private async getTaskFiles(): Promise<TFile[]> {
		const files = this.app.vault.getMarkdownFiles();
		return files.filter(file => 
			file.path.startsWith(this.settings.gtdDirectory + '/') ||
			file.path === this.settings.gtdDirectory
		);
	}

	private async getMarkdownFiles(directories: string[]): Promise<TFile[]> {
		const allFiles = this.app.vault.getMarkdownFiles();
		
		if (directories.length === 0 || (directories.length === 1 && directories[0] === '')) {
			return allFiles;
		}

		return allFiles.filter(file => {
			return directories.some(dir => {
				if (dir === '') return true;
				return file.path.startsWith(dir + '/') || file.path === dir;
			});
		});
	}

	private async parseTaskFile(file: TFile): Promise<TaskMetadata> {
		const cache = this.app.metadataCache.getFileCache(file);
		return cache?.frontmatter || {};
	}

	private async findTodoItems(file: TFile): Promise<TodoItem[]> {
		const content = await this.app.vault.read(file);
		const lines = content.split('\n');
		const todoItems: TodoItem[] = [];
		
		const todoRegex = /^- \[ \] #TODO (.+)$/;
		
		for (let i = 0; i < lines.length; i++) {
			const match = lines[i].match(todoRegex);
			if (match) {
				const taskId = this.generateTaskId(file.path, i, match[1]);
				todoItems.push({
					content: match[1],
					sourceFile: file.path,
					lineNumber: i,
					taskId: taskId
				});
			}
		}

		return todoItems;
	}

	private async createTaskFromTodo(todo: TodoItem): Promise<boolean> {
		try {
			const now = new Date();
			const taskId = this.formatDateTime(now);
			const filename = `${taskId}_${this.sanitizeFileName(todo.content)}.md`;
			const taskPath = `${this.settings.gtdDirectory}/${filename}`;

			// GTDディレクトリが存在しない場合は作成
			if (!await this.app.vault.adapter.exists(this.settings.gtdDirectory)) {
				await this.app.vault.createFolder(this.settings.gtdDirectory);
			}

			const taskContent = this.generateTaskContent(taskId, todo, now);
			
			await this.app.vault.create(taskPath, taskContent);

			// 同期データに登録
			const syncData: TaskSyncData = {
				todoId: todo.taskId,
				taskFile: taskPath,
				sourceFile: todo.sourceFile,
				sourceLine: todo.lineNumber,
				created: now.toISOString()
			};
			this.syncData.set(todo.taskId, syncData);

			return true;
		} catch (error) {
			console.error('Failed to create task from TODO:', error);
			return false;
		}
	}

	private async updateCheckboxInFile(filePath: string, lineNumber: number): Promise<boolean> {
		try {
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (!(file instanceof TFile)) {
				return false;
			}

			const content = await this.app.vault.read(file);
			const lines = content.split('\n');
			
			if (lineNumber < lines.length) {
				const line = lines[lineNumber];
				if (line.includes('- [ ] #TODO')) {
					lines[lineNumber] = line.replace('- [ ]', '- [x]');
					await this.app.vault.modify(file, lines.join('\n'));
					return true;
				}
			}

			return false;
		} catch (error) {
			console.error('Failed to update checkbox:', error);
			return false;
		}
	}

	private isTaskCompleted(metadata: TaskMetadata): boolean {
		return metadata.taskStatus === TASK_STATUS.DONE;
	}

	private isTaskTrash(metadata: TaskMetadata): boolean {
		return metadata.taskKind === TASK_KIND.TRASH;
	}

	private isTaskOverdue(metadata: TaskMetadata): boolean {
		if (!metadata.scheduledDate) return false;
		
		try {
			const scheduledDate = new Date(metadata.scheduledDate);
			const today = new Date();
			today.setHours(0, 0, 0, 0); // Start of day
			return scheduledDate < today;
		} catch {
			return false;
		}
	}

	private generateTaskId(filePath: string, lineNumber: number, content: string): string {
		// ファイルパス、行番号、内容からハッシュ値を生成
		const str = `${filePath}:${lineNumber}:${content}`;
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // 32bit整数に変換
		}
		return Math.abs(hash).toString(36);
	}

	private sanitizeFileName(content: string): string {
		// ファイル名として使用できない文字を除去
		return content
			.replace(/[<>:"/\\|?*]/g, '')
			.replace(/\s+/g, '_')
			.substring(0, 50); // 長すぎる場合は切り詰め
	}

	private formatDateTime(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hour = String(date.getHours()).padStart(2, '0');
		const minute = String(date.getMinutes()).padStart(2, '0');
		return `${year}${month}${day}${hour}${minute}`;
	}

	private formatDateTimeReadable(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hour = String(date.getHours()).padStart(2, '0');
		const minute = String(date.getMinutes()).padStart(2, '0');
		return `${year}-${month}-${day} ${hour}:${minute}`;
	}

	private formatDateTimeWithSeconds(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hour = String(date.getHours()).padStart(2, '0');
		const minute = String(date.getMinutes()).padStart(2, '0');
		const second = String(date.getSeconds()).padStart(2, '0');
		return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
	}

	private generateTaskContent(taskId: string, todo: TodoItem, now: Date): string {
		const sourceFileLink = `[[${todo.sourceFile}]]`;
		
		return `---
ID: ${taskId}
created: ${this.formatDateTimeReadable(now)}
title: ${todo.content}
aliases: 
deadline: 
scheduled date: 
project: 
task kind: 
task status: ${TASK_STATUS.NOT_YET}
created_from: todo
source_file: "${sourceFileLink}"
source_line: ${todo.lineNumber}
todo_id: ${todo.taskId}
---

## 作成元
このタスクは以下のファイルの#TODOから自動作成されました：
- ファイル: ${sourceFileLink}
- 行番号: ${todo.lineNumber}
- 作成日時: ${this.formatDateTimeWithSeconds(now)}

## タスク内容
${todo.content}
`;
	}
}