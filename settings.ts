import { App, PluginSettingTab, Setting } from 'obsidian';
import GTDManagerPlugin from './main';
import { GTDSettings } from './types';

export class GTDSettingTab extends PluginSettingTab {
	plugin: GTDManagerPlugin;

	constructor(app: App, plugin: GTDManagerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		// GTD管理ディレクトリ設定
		new Setting(containerEl)
			.setName('GTD管理ディレクトリ')
			.setDesc('GTDタスクファイルを保存するディレクトリパスを指定してください')
			.addText(text => text
				.setPlaceholder('GTD/Tasks')
				.setValue(this.plugin.settings.gtdDirectory)
				.onChange(async (value) => {
					this.plugin.settings.gtdDirectory = value;
					await this.plugin.saveSettings();
				}));

		// #TODO検索対象ディレクトリ設定
		new Setting(containerEl)
			.setName('#TODO検索対象ディレクトリ')
			.setDesc('#TODOタグを検索するディレクトリパスをカンマ区切りで指定してください')
			.addTextArea(text => text
				.setPlaceholder('Notes, Projects, Daily')
				.setValue(this.plugin.settings.searchDirectories.join(', '))
				.onChange(async (value) => {
					this.plugin.settings.searchDirectories = value
						.split(',')
						.map(dir => dir.trim())
						.filter(dir => dir.length > 0);
					await this.plugin.saveSettings();
				}));

		// 自動実行機能の設定
		containerEl.createEl('h3', { text: '自動実行機能' });

		new Setting(containerEl)
			.setName('完了タスクの自動削除')
			.setDesc('task status: done のタスクファイルを自動的に削除します')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoDeleteCompleted)
				.onChange(async (value) => {
					this.plugin.settings.autoDeleteCompleted = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('完了タスク削除間隔 (時間)')
			.setDesc('完了タスクの削除チェックを行う間隔を時間単位で指定')
			.addSlider(slider => slider
				.setLimits(1, 168, 1)
				.setValue(this.plugin.settings.deleteCompletedInterval)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.deleteCompletedInterval = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('ごみ箱タスクの自動削除')
			.setDesc('task kind: ごみ箱 のタスクファイルを自動的に削除します')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoDeleteTrash)
				.onChange(async (value) => {
					this.plugin.settings.autoDeleteTrash = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('ごみ箱タスク削除間隔 (時間)')
			.setDesc('ごみ箱タスクの削除チェックを行う間隔を時間単位で指定')
			.addSlider(slider => slider
				.setLimits(1, 168, 1)
				.setValue(this.plugin.settings.deleteTrashInterval)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.deleteTrashInterval = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('期限切れタスクの自動更新')
			.setDesc('scheduled date が過去のタスクを今日の日付に自動更新します')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoUpdateSchedule)
				.onChange(async (value) => {
					this.plugin.settings.autoUpdateSchedule = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('期限切れタスク更新間隔 (時間)')
			.setDesc('期限切れタスクの更新チェックを行う間隔を時間単位で指定')
			.addSlider(slider => slider
				.setLimits(1, 168, 1)
				.setValue(this.plugin.settings.updateScheduleInterval)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.updateScheduleInterval = value;
					await this.plugin.saveSettings();
				}));

		// #TODO関連機能
		containerEl.createEl('h3', { text: '#TODO関連機能' });

		new Setting(containerEl)
			.setName('#TODOからタスク自動作成')
			.setDesc('マークダウンファイル内の- [ ] #TODO項目から自動的にタスクファイルを作成します')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoCreateFromTodo)
				.onChange(async (value) => {
					this.plugin.settings.autoCreateFromTodo = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('#TODO検索間隔 (時間)')
			.setDesc('#TODOタグの検索を行う間隔を時間単位で指定')
			.addSlider(slider => slider
				.setLimits(1, 24, 1)
				.setValue(this.plugin.settings.createFromTodoInterval)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.createFromTodoInterval = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('チェックボックス自動更新')
			.setDesc('タスク完了時に元のチェックボックスを自動的に [ ] から [x] に変更します')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoUpdateCheckbox)
				.onChange(async (value) => {
					this.plugin.settings.autoUpdateCheckbox = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('チェックボックス更新間隔 (時間)')
			.setDesc('チェックボックスの同期チェックを行う間隔を時間単位で指定')
			.addSlider(slider => slider
				.setLimits(1, 24, 1)
				.setValue(this.plugin.settings.updateCheckboxInterval)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.updateCheckboxInterval = value;
					await this.plugin.saveSettings();
				}));

		// マニュアル操作ボタン
		containerEl.createEl('h3', { text: 'マニュアル実行' });

		new Setting(containerEl)
			.setName('今すぐ実行')
			.setDesc('各機能を手動で実行します')
			.addButton(button => button
				.setButtonText('完了タスク削除')
				.onClick(async () => {
					const count = await this.plugin.gtdManager.deleteCompletedTasks();
					this.plugin.showNotice(`${count}個の完了タスクを削除しました`);
				}))
			.addButton(button => button
				.setButtonText('ごみ箱タスク削除')
				.onClick(async () => {
					const count = await this.plugin.gtdManager.deleteTrashTasks();
					this.plugin.showNotice(`${count}個のごみ箱タスクを削除しました`);
				}))
			.addButton(button => button
				.setButtonText('期限切れタスク更新')
				.onClick(async () => {
					const count = await this.plugin.gtdManager.updateOverdueTasks();
					this.plugin.showNotice(`${count}個の期限切れタスクを更新しました`);
				}))
			.addButton(button => button
				.setButtonText('#TODO検索')
				.onClick(async () => {
					const count = await this.plugin.gtdManager.createTasksFromTodos();
					this.plugin.showNotice(`${count}個の新しいタスクを作成しました`);
				}))
			.addButton(button => button
				.setButtonText('チェックボックス同期')
				.onClick(async () => {
					const count = await this.plugin.gtdManager.updateCheckboxesFromTasks();
					this.plugin.showNotice(`${count}個のチェックボックスを更新しました`);
				}));
	}
}