import { Database, DatabaseEntry } from "../database";

type Data = {
	id: string;
	journal: Array<DatabaseEntry>;
};

export class DatabaseExport {
	private data: Data;

	private constructor(data: Data) {
		this.data = data;
	}

	get client_id() {
		return this.data.id;
	}

	get journal_entries() {
		return this.data.journal;
	}

	static async export(db: Database): Promise<DatabaseExport> {
		return new DatabaseExport({id: db.client_id, journal: await db.retrieve_entries()})
	}

	journal_length() {
		const journal = this.data.journal;
		return journal.length;
	}
}