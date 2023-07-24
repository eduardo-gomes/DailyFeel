import { Entry } from "./journalTypes";
import { SSR } from "./ssr_const";
import { deepFreeze } from "./utils/deepFreeze";
import event_to_promise from "./utils/event_to_promise";
import { v4 as uuidV4, v5 as uuidv5 } from "uuid";
import { DatabaseExport } from "./database/export";

export type DatabaseEntry = Entry & {
	id: string,
	created_at: string
};

export class Database {
	static readonly LATEST_VERSION = 3;
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
		if (this.id === undefined) throw new Error("Database not ready, can not get client id");
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

	get_entry_uuid(entry: Entry): string {
		const timestamp = entry.date.toISOString();
		return uuidv5(timestamp, this.client_id);
	}

	async add_entry(item: Entry | DatabaseEntry) {
		/// Add entry to database and return its ID
		if (this.id == undefined) await this.ready;
		item = this.to_entry_with_id(item);
		return await this.add_entry_operation(item);
	}

	async to_export() {
		return await DatabaseExport.export(this);
	}

	close() {
		this.db.then((db) => db.close());
	}

	private async add_entry_operation(item: Entry) {
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

	private to_entry_with_id(entry: Entry): DatabaseEntry {
		return {...entry, id: this.get_entry_uuid(entry), created_at: this.client_id};
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

	private open_lock(): [Promise<unknown>, (() => void)] {
		///Database open operations will fail if a versionchange transaction is running.D
		///To avoid this, this function make an open request wait for previous requests
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
				uuid_request.onsuccess = () => console.info("Defined client id", client_id);
			case 2:
				//Retrieve client id to use on migration
				open_request.transaction.objectStore("client_info").get("id").onsuccess = (event: Event) => this.id = (event.target as IDBRequest<string>).result;
				this.migrate_to_3(open_request);
		}
	}

	private migrate_to_3(open_request: IDBOpenDBRequest) {
		if (!open_request.transaction || open_request.transaction.mode != "versionchange") throw new Error("Not in versionchange transaction");
		const db = open_request.transaction.db;
		const transaction = open_request.transaction;

		function copy_to_journal() {
			db.deleteObjectStore("journal");
			const journal = db.createObjectStore("journal", {keyPath: "id"});
			const journal_cursor = transaction.objectStore("journal_upgrade_key").openCursor();
			journal_cursor.onsuccess = (event: Event) => {
				//Copy upgraded entries back to journal
				const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null;
				if (!cursor) {
					db.deleteObjectStore("journal_upgrade_key");
					return;
				}
				const entry = cursor.value as DatabaseEntry;
				const request = journal.add(entry);
				cursor.continue();
			};
		}

		const upgrade = () => {
			const upgraded_store = db.createObjectStore("journal_upgrade_key", {keyPath: "id"});
			const old_journal_cursor = transaction.objectStore("journal").openCursor();
			old_journal_cursor.onsuccess = (event: Event) => {
				//Upgrade and store a copy of entries
				const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null;
				if (!cursor) {
					console.log("all journal entries were upgraded and stored on journal_upgrade_key");
					copy_to_journal();
					return
				}
				const upgraded = this.to_entry_with_id(cursor.value as Entry);
				const request = upgraded_store.add(upgraded);
				cursor.continue();
			}
		};

		console.debug("Migrating database to version 3");
		upgrade();
		console.log("Migrated journal ids to UUID v5");
	}
}