import { Entry } from "./journalTypes";
import { SSR } from "./ssr_const";
import { deepFreeze } from "./utils/deepFreeze";
import event_to_promise from "./utils/event_to_promise";
import { v4 as uuidV4 } from "uuid";
import { DatabaseExport } from "./database/export";

export type DatabaseEntry = Entry & {
	id: number
};

export class Database {
	static readonly LATEST_VERSION = 2;
	private static opening: Promise<void>[] = [];
	readonly version: number;
	readonly ready: Promise<void>;
	private readonly db!: Promise<IDBDatabase>;
	private readonly name: string;
	private id: string | undefined;

	constructor(name?: string, import_id?: string) {
		this.name = name ?? "journal";//Used to isolate concurrent test suites
		this.version = Database.LATEST_VERSION;
		if (!SSR) {
			const [lock, resolver] = this.open_lock();
			this.db = this.openDb(lock, import_id);
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

	static async from_export(source: DatabaseExport): Promise<Database> {
		const name = "import_for_" + source.client_id;
		await event_to_promise(window.indexedDB.deleteDatabase(name));
		const db = new Database(name, source.client_id);
		await db.ready;
		const operations = source.journal_entries.map((entry) => db.add_entry(entry));
		await Promise.all(operations);
		return db;
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
		return new Promise<void>((resolve, reject) => {
			request.onerror = (_event) => {
				// Handle errors!
				console.error("Transaction failed, could not add item to DB", request.error);
				reject(request.error);
			};
			request.onsuccess = (_event) => {
				console.log("Item was added to DB", request.result);
				resolve();
			};
		});
	}

	///Database open operations will fail if a versionchange transaction is running.

	async to_export() {
		return await DatabaseExport.export(this);
	}

	close() {
		this.db.then((db) => db.close());
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

	private async openDb(lock: Promise<unknown>, client_id?: string) {
		await lock;
		console.log("Opening DB");
		const request = window.indexedDB.open(this.name, this.version);
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
		request.onupgradeneeded = (event) => {
			this.database_upgrade(event, client_id);
		};
		return promise;
	}

	private async database_upgrade(event: IDBVersionChangeEvent, import_id?: string) {
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
				const client_id = import_id ?? uuidV4();
				let uuid_request = open_request.transaction.objectStore("client_info").add(client_id, "id");
				await event_to_promise(uuid_request);
				console.info("Defined client id", client_id);
			//TODO: Version3, add client_id to every entry, replace autoIncrement with uuidV5 from client_id and date
		}
	}
}