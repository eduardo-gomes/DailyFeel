import { Entry, EntryContent } from "./journalTypes";

function deepFreeze<T extends Object>(obj: T) {
	for (const name of Reflect.ownKeys(obj)) {
		const value = obj[name as keyof T];
		if ((value && typeof value === "object") || typeof value === "function") deepFreeze(value);
	}
	return Object.freeze(obj);
}

class JournalManager {
	static instance: JournalManager;
	array: Array<Entry> = [];

	constructor() {
		if (JournalManager.instance)
			return JournalManager.instance;
		JournalManager.instance = this;
	}

	new_entry(date: Date, entry: EntryContent) {
		let items = structuredClone({date, content: entry});
		this.array.push(deepFreeze(items));
	}

	get_entry_list(): readonly Entry[] {
		return this.array;
	}

	clear() {
		this.array.length = 0;
	}
}

export { JournalManager };