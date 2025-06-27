import { Notice, Plugin } from 'obsidian';
import { GTDSettings, DEFAULT_SETTINGS, TaskSyncData } from './types';
import { GTDManager } from './gtd-manager';
import { GTDSettingTab } from './settings';

export default class GTDManagerPlugin extends Plugin {
	settings: GTDSettings;
	gtdManager: GTDManager;
	private intervals: number[] = [];

	async onload() {
		await this.loadSettings();

		// GTDマネージャーの初期化
		this.gtdManager = new GTDManager(this.app, this.settings);
		
		// 同期データの読み込み
		const syncData = await this.loadData();
		if (syncData?.taskSyncData) {
			this.gtdManager.loadSyncData(syncData.taskSyncData);
		}

		// リボンアイコンの追加
		const ribbonIconEl = this.addRibbonIcon('checkmark', 'GTD Manager', async (evt: MouseEvent) => {
			await this.runAllOperations();
		});
		ribbonIconEl.addClass('gtd-manager-ribbon-class');

		// コマンドパレットの登録
		this.addCommand({
			id: 'gtd-delete-completed',
			name: 'GTD: Clean completed tasks',
			callback: async () => {
				const count = await this.gtdManager.deleteCompletedTasks();
				this.showNotice(`${count}個の完了タスクを削除しました`);
				await this.saveSyncData();
			}
		});

		this.addCommand({
			id: 'gtd-delete-trash',
			name: 'GTD: Clean trash tasks',
			callback: async () => {
				const count = await this.gtdManager.deleteTrashTasks();
				this.showNotice(`${count}個のごみ箱タスクを削除しました`);
				await this.saveSyncData();
			}
		});

		this.addCommand({
			id: 'gtd-update-overdue',
			name: 'GTD: Update overdue tasks',
			callback: async () => {
				const count = await this.gtdManager.updateOverdueTasks();
				this.showNotice(`${count}個の期限切れタスクを更新しました`);
			}
		});

		this.addCommand({
			id: 'gtd-scan-todos',
			name: 'GTD: Scan for #TODO items',
			callback: async () => {
				const count = await this.gtdManager.createTasksFromTodos();
				this.showNotice(`${count}個の新しいタスクを作成しました`);
				await this.saveSyncData();
			}
		});

		this.addCommand({
			id: 'gtd-update-checkboxes',
			name: 'GTD: Update checkboxes from completed tasks',
			callback: async () => {
				const count = await this.gtdManager.updateCheckboxesFromTasks();
				this.showNotice(`${count}個のチェックボックスを更新しました`);
				await this.saveSyncData();
			}
		});

		this.addCommand({
			id: 'gtd-run-all',
			name: 'GTD: Run all operations',
			callback: async () => {
				await this.runAllOperations();
			}
		});

		// 設定タブの追加
		this.addSettingTab(new GTDSettingTab(this.app, this));

		// 定期実行の開始
		this.startPeriodicTasks();
	}

	onunload() {
		// 定期実行タスクのクリーンアップ
		this.intervals.forEach(intervalId => {
			window.clearInterval(intervalId);
		});
		this.intervals = [];
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		
		// GTDマネージャーの設定更新
		if (this.gtdManager) {
			this.gtdManager.updateSettings(this.settings);
		}

		// 定期実行タスクの再起動
		this.restartPeriodicTasks();
	}

	async saveSyncData() {
		const data = await this.loadData() || {};
		data.taskSyncData = this.gtdManager.getSyncData();
		await this.saveData(data);
	}

	showNotice(message: string) {
		new Notice(message);
	}

	private async runAllOperations() {
		let totalOperations = 0;

		try {
			if (this.settings.autoCreateFromTodo) {
				const todoCount = await this.gtdManager.createTasksFromTodos();
				totalOperations += todoCount;
				if (todoCount > 0) {
					this.showNotice(`${todoCount}個のタスクを#TODOから作成しました`);
				}
			}

			if (this.settings.autoUpdateCheckbox) {
				const checkboxCount = await this.gtdManager.updateCheckboxesFromTasks();
				totalOperations += checkboxCount;
				if (checkboxCount > 0) {
					this.showNotice(`${checkboxCount}個のチェックボックスを更新しました`);
				}
			}

			if (this.settings.autoUpdateSchedule) {
				const overdueCount = await this.gtdManager.updateOverdueTasks();
				totalOperations += overdueCount;
				if (overdueCount > 0) {
					this.showNotice(`${overdueCount}個の期限切れタスクを更新しました`);
				}
			}

			if (this.settings.autoDeleteCompleted) {
				const completedCount = await this.gtdManager.deleteCompletedTasks();
				totalOperations += completedCount;
				if (completedCount > 0) {
					this.showNotice(`${completedCount}個の完了タスクを削除しました`);
				}
			}

			if (this.settings.autoDeleteTrash) {
				const trashCount = await this.gtdManager.deleteTrashTasks();
				totalOperations += trashCount;
				if (trashCount > 0) {
					this.showNotice(`${trashCount}個のごみ箱タスクを削除しました`);
				}
			}

			await this.saveSyncData();

			if (totalOperations === 0) {
				this.showNotice('GTD操作完了（変更なし）');
			}

		} catch (error) {
			console.error('GTD operations failed:', error);
			this.showNotice('GTD操作中にエラーが発生しました');
		}
	}

	private startPeriodicTasks() {
		// 完了タスク削除
		if (this.settings.autoDeleteCompleted) {
			const interval = this.registerInterval(
				window.setInterval(async () => {
					await this.gtdManager.deleteCompletedTasks();
					await this.saveSyncData();
				}, this.settings.deleteCompletedInterval * 60 * 60 * 1000)
			);
			this.intervals.push(interval);
		}

		// ごみ箱タスク削除
		if (this.settings.autoDeleteTrash) {
			const interval = this.registerInterval(
				window.setInterval(async () => {
					await this.gtdManager.deleteTrashTasks();
					await this.saveSyncData();
				}, this.settings.deleteTrashInterval * 60 * 60 * 1000)
			);
			this.intervals.push(interval);
		}

		// 期限切れタスク更新
		if (this.settings.autoUpdateSchedule) {
			const interval = this.registerInterval(
				window.setInterval(async () => {
					await this.gtdManager.updateOverdueTasks();
				}, this.settings.updateScheduleInterval * 60 * 60 * 1000)
			);
			this.intervals.push(interval);
		}

		// #TODOタスク作成
		if (this.settings.autoCreateFromTodo) {
			const interval = this.registerInterval(
				window.setInterval(async () => {
					await this.gtdManager.createTasksFromTodos();
					await this.saveSyncData();
				}, this.settings.createFromTodoInterval * 60 * 60 * 1000)
			);
			this.intervals.push(interval);
		}

		// チェックボックス更新
		if (this.settings.autoUpdateCheckbox) {
			const interval = this.registerInterval(
				window.setInterval(async () => {
					await this.gtdManager.updateCheckboxesFromTasks();
					await this.saveSyncData();
				}, this.settings.updateCheckboxInterval * 60 * 60 * 1000)
			);
			this.intervals.push(interval);
		}
	}

	private restartPeriodicTasks() {
		// 既存の定期実行タスクをクリア
		this.intervals.forEach(intervalId => {
			window.clearInterval(intervalId);
		});
		this.intervals = [];

		// 新しい設定で再開
		this.startPeriodicTasks();
	}
}
