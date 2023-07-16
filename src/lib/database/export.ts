import { Database, DatabaseEntry } from "../database";

type Data = {
	id: string;
	version: number;
	journal: Array<DatabaseEntry>;
};

export class DatabaseExport {
	private readonly data: Data;

	private constructor(data: Data) {
		this.data = data;
	}

	get client_id() {
		return this.data.id;
	}

	get journal_entries() {
		return this.data.journal;
	}

	get version() {
		return this.data.version;
	}

	static async export(db: Database): Promise<DatabaseExport> {
		const version = db.version;
		const id = db.client_id;
		const journal = await db.retrieve_entries();
		return new DatabaseExport({id, version, journal})
	}

	static async import_json(dump: string): Promise<DatabaseExport> {
		const object = JSON.parse(dump) as DatabaseExport;
		object.data.journal.forEach((entry) => entry.date = new Date(entry.date));
		return new DatabaseExport(object.data);
	}

	journal_length() {
		const journal = this.data.journal;
		return journal.length;
	}

	to_JSON() {
		return JSON.stringify(this);
	}
}