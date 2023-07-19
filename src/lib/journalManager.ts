import { Entry, EntryContent } from "./journalTypes";
import { Accessor, createSignal, Setter } from "solid-js";
import { Database } from "./database";
import { deepFreeze } from "./utils/deepFreeze";
import { SSR } from "./ssr_const";

class JournalManager {
	static instance: JournalManager | undefined;
	private readonly setArray!: Setter<Entry[]>;
	private readonly array!: Accessor<readonly Entry[]>;
	private readonly database!: Database;

	constructor() {
		if (JournalManager.instance) return JournalManager.instance;
		JournalManager.instance = this;
		this.database = new Database();
		const [array, setArray] = createSignal([], {equals: false});
		this.array = array;
		this.setArray = setArray;
		this.database.retrieve_entries().then(result => this.setArray(array => array.concat(result))).catch((err) => {
			//Ignore database error on SSR
			if (SSR && "Database only works on client" == err)
				return;
			else throw err;
		});
	}

	new_entry(date: Date, entry: EntryContent) {
		let item = structuredClone({date, content: entry});
		this.setArray(array => {
			array.push(deepFreeze(item));
			return array;
		});
		this.database.add_entry(item)
			.then(r => console.log("Added item to DB", r))
			.catch(err => alert(`Could not store entry on database: ${err}`));
	}

	async get_entry_list(): Promise<readonly Entry[]> {
		return await this.database.retrieve_entries();
	}

	get_entry_list_signal(): Accessor<readonly Entry[]> {
		return this.array;
	}

	async clear() {
		this.setArray([]);
		await this.database.clear();
	}

	export() {
		return this.database.to_export().then((exp) => exp.to_JSON());
	}
}

export { JournalManager };