import { JournalEntry, JournalEntryContent } from "./journalEntry";

function deepFreeze<T extends Object>(obj: T) {
	for (const name of Reflect.ownKeys(obj)) {
		const value = obj[name as keyof T];
		if ((value && typeof value === "object") || typeof value === "function") deepFreeze(value);
	}
	return Object.freeze(obj);
}

class JournalManager {
	array: Array<JournalEntry> = [];

	new_entry(date: Date, entry: JournalEntryContent) {
		let items = structuredClone({date, content: entry});
		this.array.push(deepFreeze(items));
	}

	get_entry_list(): readonly JournalEntry[] {
		return this.array;
	}
}

export { JournalManager };