import { Entry } from "./journalTypes";
import { SSR } from "./ssr_const";
import { deepFreeze } from "./utils/deepFreeze";
import event_to_promise from "./utils/event_to_promise";
import { v4 as uuidV4 } from "uuid";

type DatabaseEntry = Entry & {
	id: number
};

export class Database {
	private static readonly version = 2;
	private static opening: Promise<void>[] = [];
	readonly ready: Promise<void>;
	private readonly db!: Promise<IDBDatabase>;
	private readonly name: string;
	private id: string | undefined;

	constructor(name?: string) {
		this.name = name ?? "journal";//Used to isolate concurrent test suites
		if (!SSR) {
			const [lock, resolver] = this.open_lock();
			this.db = this.openDb(lock);
			this.db.finally(resolver);
			this.db.catch(err => alert(`Could not open database: ${err}`));
			this.ready = this.retrieve_id().then((id) => {
				this.id = id;
				return;
			});
		} else {
			const error = Promise.reject("Database only works on client");
			this.db = error as Promise<IDBDatabase>;
			this.ready = error;
			const ignore = (err: any) => console.warn("Ignoring error trying to open database in SSR", err);
			error.catch(ignore);
		}
	}

	get client_id() {
		if (this.id === undefined) throw "Database not ready";
		return this.id;
	}

	async clear() {
		const db = await this.db;
		const request = db.transaction(["journal"], "readwrite").objectStore("journal").clear();
		await new Promise((resolve, reject) => {
			request.onerror = (_event) => {
				console.error("Transaction failed, could not erase all itens from DB", request.error);
				reject(request.error);
			};
			request.onsuccess = (_event) => resolve(request.result);
		});
	}

	async retrieve_entries() {
		const db = await this.db;
		const request = db.transaction(["journal"], "readonly").objectStore("journal").getAll();
		return new Promise<DatabaseEntry[]>((resolve, reject) => {
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

	private async retrieve_id(): Promise<string> {
		const db = await this.db;
		const request = db.transaction(["client_info"], "readonly").objectStore("client_info").get("id");
		await event_to_promise(request);
		if (typeof request.result !== "string") throw "Failed to get client_id";
		const id = request.result;
		console.info("Retrieved client id", request.result);
		return id;
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
		const request = window.indexedDB.open(this.name, Database.version);
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
		request.onupgradeneeded = this.database_upgrade.bind(this);
		return promise;
	}

	private async database_upgrade(event: IDBVersionChangeEvent) {
		console.debug("Database upgrade", event.oldVersion, "to", event.newVersion);
		const db = (event.target as IDBOpenDBRequest).result;
		const open_request = event.target as IDBOpenDBRequest;
		if (!open_request.transaction) throw new Error("Something with versionchange transaction went wrong");
		// noinspection FallThroughInSwitchStatementJS

		switch (event.oldVersion) {
			// DatabaseEntry: {date: Date, content: EntryContent, id: number};
			case 0:
				console.debug("Migrating database to version 1");
				db.createObjectStore("journal", {keyPath: "id", autoIncrement: true});
			case 1:
				console.debug("Migrating database to version 2");
				db.createObjectStore("client_info");
				const client_id = uuidV4();
				let uuid_request = open_request.transaction.objectStore("client_info").add(client_id, "id");
				await event_to_promise(uuid_request);
				console.info("Defined client id", client_id);
		}
	}
}