// GTD Manager Plugin Types
// ===========================

export interface GTDSettings {
	gtdDirectory: string;                    // GTD管理ディレクトリ
	searchDirectories: string[];             // #TODO検索対象ディレクトリリスト
	autoDeleteCompleted: boolean;            // 完了タスク自動削除の有効/無効
	autoDeleteTrash: boolean;                // ごみ箱タスク自動削除の有効/無効
	autoUpdateSchedule: boolean;             // 期限切れタスク自動更新の有効/無効
	autoCreateFromTodo: boolean;             // #TODOからタスク自動作成の有効/無効
	autoUpdateCheckbox: boolean;             // チェックボックス自動更新の有効/無効
	deleteCompletedInterval: number;         // 完了タスク削除間隔（時間）
	deleteTrashInterval: number;             // ごみ箱タスク削除間隔（時間）
	updateScheduleInterval: number;          // 期限切れタスク更新間隔（時間）
	createFromTodoInterval: number;          // #TODO検索間隔（時間）
	updateCheckboxInterval: number;          // チェックボックス更新間隔（時間）
}

export interface TaskMetadata {
	ID?: string;
	created?: string;
	title?: string;
	aliases?: string[];
	deadline?: string;
	scheduledDate?: string;
	project?: string;
	taskKind?: string;
	taskStatus?: string;
	createdFrom?: string;                    // #TODOから作成された場合のソース情報
	sourceFile?: string;                     // 元ファイルのパス
	sourceLine?: number;                     // 元ファイルの行番号
	todoId?: string;                         // TODO項目の一意識別子
}

export interface TodoItem {
	content: string;                         // TODO内容
	sourceFile: string;                      // ソースファイルパス
	lineNumber: number;                      // 行番号
	taskId: string;                          // 一意識別子
}

export interface TaskSyncData {
	todoId: string;                          // TODO項目のID
	taskFile: string;                        // 作成されたタスクファイルのパス
	sourceFile: string;                      // 元のファイルパス
	sourceLine: number;                      // 元の行番号
	created: string;                         // 作成日時
}

export const DEFAULT_SETTINGS: GTDSettings = {
	gtdDirectory: 'GTD/Tasks',
	searchDirectories: [''],
	autoDeleteCompleted: false,
	autoDeleteTrash: false,
	autoUpdateSchedule: false,
	autoCreateFromTodo: false,
	autoUpdateCheckbox: false,
	deleteCompletedInterval: 24,             // 24時間
	deleteTrashInterval: 24,                 // 24時間
	updateScheduleInterval: 24,              // 24時間
	createFromTodoInterval: 1,               // 1時間
	updateCheckboxInterval: 1,               // 1時間
};

// タスク状態の定数
export const TASK_STATUS = {
	NOT_YET: 'not_yet',
	DOING: 'doing',
	DONE: 'done',
	HOLD: 'hold',
	CANCEL: 'cancel'
} as const;

// タスクカテゴリの定数
export const TASK_KIND = {
	TRASH: 'ごみ箱',
	INBOX: 'inbox',
	NEXT_ACTION: 'next_action',
	PROJECT: 'project',
	SOMEDAY: 'someday',
	REFERENCE: 'reference'
} as const;

export type TaskStatus = typeof TASK_STATUS[keyof typeof TASK_STATUS];
export type TaskKind = typeof TASK_KIND[keyof typeof TASK_KIND];