import { Entry, EntryContent } from "./journalTypes";
import { Accessor, createSignal, Setter } from "solid-js";

function deepFreeze<T extends Object>(obj: T) {
	for (const name of Reflect.ownKeys(obj)) {
		const value = obj[name as keyof T];
		if ((value && typeof value === "object") || typeof value === "function") deepFreeze(value);
	}
	return Object.freeze(obj);
}

class JournalManager {
	static instance: JournalManager | undefined;
	private readonly setArray!: Setter<Entry[]>;
	private readonly array!: Accessor<readonly Entry[]>;
	private readonly db!: Promise<IDBDatabase>;

	constructor() {
		if (JournalManager.instance) return JournalManager.instance;
		JournalManager.instance = this;
		this.db = this.openDb();
		this.db.catch(err => alert(`Could not open database: ${err}`));
		const [array, setArray] = createSignal([], {equals: false});
		this.array = array;
		this.setArray = setArray;
	}

	new_entry(date: Date, entry: EntryContent) {
		let item = structuredClone({date, content: entry});
		this.setArray(array => {
			array.push(deepFreeze(item));
			return array;
		});
		this.addDb(item)
			.then(r => console.log("Added item to DB", r))
			.catch(err => alert(`Could not store entry on database: ${err}`));
	}

	async get_entry_list(): Promise<readonly Entry[]> {
		return await this.retrieveDb();
	}

	get_entry_list_signal(): Accessor<readonly Entry[]> {
		return this.array;
	}

	async clear() {
		this.setArray([]);
		const db = await this.db;
		const request = db.transaction(["journal"], "readwrite").objectStore("journal").clear();
		await new Promise((resolve, reject) => {
			request.onerror = (_event) => {
				console.error("Transaction failed, could not get all itens from DB", request.error);
				reject(request.error);
			};
			request.onsuccess = (_event) => resolve(request.result);
		});
	}

	private async openDb() {
		console.log("Opening DB");
		const request = window.indexedDB.open("journal");
		let promise = new Promise<IDBDatabase>((resolve, reject) => {
			request.onerror = (event) => {
				console.error("Why didn't you allow my web app to use IndexedDB?!");
				reject((event.target as IDBOpenDBRequest).error);
			};
			request.onsuccess = (event: Event) => {
				console.log("DB is open");
				let db = (event.target as IDBOpenDBRequest).result;
				db.onerror = (event) => {
					// Generic error handler for all errors targeted at this database's requests!
					let target = event.target as IDBTransaction;
					console.error("Database error:", target.error);
				};
				this.retrieveDb().then(result => this.setArray(array => array.concat(result)));
				resolve(db);
			};
		});
		request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
			console.debug("Database upgrade", event.oldVersion, "to", event.newVersion);
			const db = (event.target as IDBOpenDBRequest).result;

			db.createObjectStore("journal", {keyPath: "id", autoIncrement: true});
		};
		return promise;
	}

	private async retrieveDb() {
		const db = await this.db;
		const request = db.transaction(["journal"], "readonly").objectStore("journal").getAll();
		return new Promise<Entry[]>((resolve, reject) => {
			request.onerror = (_event) => {
				// Handle errors!
				console.error("Transaction failed, could not get all itens from DB", request.error);
				reject(request.error);
			};
			request.onsuccess = (_event) => {
				// Do something with the request.result!
				const result = request.result;
				result.forEach(deepFreeze);
				console.log("Itens from DB", result);
				resolve(result);
			};
		});
	}

	private async addDb(item: Entry) {
		const db = await this.db;
		const request = db.transaction(["journal"], "readwrite").objectStore("journal").add(item);
		return new Promise<IDBValidKey>((resolve, reject) => {
			request.onerror = (_event) => {
				// Handle errors!
				console.error("Transaction failed, could not add item to DB", request.error);
				reject(request.error);
			};
			request.onsuccess = (_event) => {
				console.log("Item was added to DB", request.result);
				resolve(request.result);
			};
		});
	}
}

export { JournalManager };