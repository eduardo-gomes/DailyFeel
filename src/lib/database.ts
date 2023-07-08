import { Entry } from "./journalTypes";
import { SSR } from "./ssr_const";
import { deepFreeze } from "./utils/deepFreeze";

export class Database {
	private static opening: Promise<void>[] = [];
	private readonly db!: Promise<IDBDatabase>;
	private readonly name: string;

	constructor(name?: string) {
		this.name = name ?? "journal";//Used to isolate concurrent test suites
		if (!SSR) {
			const [lock, resolver] = this.open_lock();
			this.db = this.openDb(lock);
			this.db.finally(resolver);
			this.db.catch(err => alert(`Could not open database: ${err}`));
		} else {
			this.db = new Promise((_resolve, reject) => reject("Only works on browser")).catch(() => {
			}) as Promise<IDBDatabase>;
		}
	}

	async clear() {
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

	async retrieve_entries() {
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

	async add_entry(item: Entry) {
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

	///Database open operations will fail if a versionchange transaction is running.
	///To avoid this, this function ensures only
	private open_lock(): [Promise<unknown>, (() => void)] {
		const lock = Promise.all(Database.opening);
		let resolver = () => {
		};
		let opening = new Promise<void>((resolve) => {
			resolver = resolve;
		});
		Database.opening.push(opening);
		return [lock, resolver];
	}

	private async openDb(lock: Promise<unknown>) {
		await lock;
		console.log("Opening DB");
		const request = window.indexedDB.open(this.name);
		let promise = new Promise<IDBDatabase>((resolve, reject) => {
			request.onerror = (event) => {
				let target = event.target as IDBOpenDBRequest;
				console.error("Why didn't you allow my web app to use IndexedDB?!", target.error);
				reject(target.error);
			};
			request.onsuccess = (event: Event) => {
				console.log("DB is open");
				let db = (event.target as IDBOpenDBRequest).result;
				db.onerror = (event) => {
					// Generic error handler for all errors targeted at this database's requests!
					let target = event.target as IDBTransaction;
					console.error("Database error:", target.error);
				};
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
}