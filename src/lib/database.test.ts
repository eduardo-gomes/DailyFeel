import "./indexeddb_node";
import { v5 as uuidv5, validate as uuid_check } from "uuid";

import { Entry, Mood } from "./journalTypes";
import { Database } from "./database";
import { DatabaseExport } from "./database/export";

const SAMPLE_CONTENT = {
	mood: 0, text: "ASD"
};

async function clear() {
	await make_database().clear();
}

const TEST_DB = "database_test";

function make_database(): Database {
	return new Database(TEST_DB);
}

afterEach(clear);
beforeAll(clear);

test("New database has no entries", async () => {
	const database = make_database();
	let entryList = await database.retrieve_entries();
	expect(entryList.length).toBe(0);
});

test("New database after add entries, has one entry", async () => {
	const database = make_database();
	const entry: Entry = {date: new Date(), content: SAMPLE_CONTENT};
	await database.add_entry(entry);
	let entryList = await database.retrieve_entries();
	expect(entryList.length).toBe(1);
});

test("New database after add entries, get same content and date", async () => {
	const database = make_database();
	let date = new Date();
	const entry: Entry = {date: new Date(), content: SAMPLE_CONTENT};
	await database.add_entry(entry);
	let got_entry = (await database.retrieve_entries()).at(0) as Entry;
	expect(got_entry.content).toEqual(SAMPLE_CONTENT);
	expect(got_entry.date).toEqual(date);
});

test("Changes on the added entry are not visible", async () => {
	const database = make_database();
	const true_date = new Date();
	let date = new Date(true_date.valueOf());
	let content = structuredClone(SAMPLE_CONTENT);
	const entry: Entry = {date, content: content};
	await database.add_entry(entry);
	{
		let got_entry = (await database.retrieve_entries()).at(0) as Entry;
		expect(got_entry.content).toEqual(SAMPLE_CONTENT);
		expect(got_entry.date).toEqual(true_date);
	}
	content.text = "Other";
	date.setDate(0);
	{
		let got_entry: Entry = (await database.retrieve_entries()).at(0) as Entry;
		expect(got_entry.content).toEqual(SAMPLE_CONTENT);
		expect(got_entry.date).toEqual(true_date);
	}
});

test("Got entries are not writable", async () => {
	const database = make_database();
	let date = new Date();
	const entry: Entry = {date, content: SAMPLE_CONTENT};
	await database.add_entry(entry);
	let got_entry = (await database.retrieve_entries()).at(0) as Entry;
	expect(() => {
		got_entry.content.text = "Other";
	}).toThrow();
	expect(() => {
		got_entry.date = new Date();
	}).toThrow();
});

test(".clear removes all entries", async () => {
	const database = make_database();
	const entry: Entry = {date: new Date(), content: SAMPLE_CONTENT};
	await database.add_entry(entry);
	await database.clear();
	let entries = await database.retrieve_entries();
	expect(entries).toHaveLength(0);
});

test("Database data persists entries", async () => {
	{
		const database = make_database();
		const entry: Entry = {date: new Date(), content: SAMPLE_CONTENT};
		await database.add_entry(entry);
	}
	const database = make_database();
	let entries = await database.retrieve_entries();
	expect(entries).toHaveLength(1);
});

test("Database data persists entries across instances", async () => {
	{
		const database = make_database();
		const entry: Entry = {date: new Date(), content: SAMPLE_CONTENT};
		await database.add_entry(entry);
	}
	const database = make_database();
	let entries = await database.retrieve_entries();
	expect(entries).toHaveLength(1);
});

test("Database client id throws if not connected", () => {
	const database = make_database();
	const get_uuid = () => database.client_id;
	expect(get_uuid).toThrow("Database not ready");
});

test("Database client id don't throw after is ready", async () => {
	const database = make_database();
	await database.ready;
	const get_uuid = () => database.client_id;
	expect(get_uuid).not.toThrow("Database not ready");
});
test("Database has valid id", async () => {
	const database = make_database();
	await database.ready;
	const id = database.client_id;
	const is_uuid = uuid_check(id);
	expect(is_uuid).toBe(true);
});
test("Database client id persist", async () => {
	let id;
	{
		const database = make_database();
		await database.ready;
		id = database.client_id;
	}
	const database = make_database();
	await database.ready;
	const other_id = database.client_id;
	expect(other_id).toMatch(id);
});
test("Database open on latest version", async () => {
	const database = make_database();
	await database.ready;
	expect(database.version).toBe(Database.LATEST_VERSION);
});

test.failing("Database operations fails after close", async () => {
	const database = make_database();
	await database.ready;
	database.close();

	await database.retrieve_entries();
});

test("Add entry returns entry id", async () => {
	const database = make_database();
	const entry: Entry = {date: new Date(), content: SAMPLE_CONTENT};
	const id = await database.add_entry(entry);

	const got = (await database.retrieve_entries())[0];
	expect(got.id).toBe(id);
});

test("Entry id is an UUIDv5 generated from the client id and entry date", async () => {
	const database = make_database();
	await database.ready;
	const entry: Entry = {date: new Date(), content: SAMPLE_CONTENT};
	const date_str = entry.date.toISOString();
	const expected_id = uuidv5(date_str, database.client_id);

	console.log(date_str, expected_id);
	const id = await database.add_entry(entry);
	expect(id).toBe(expected_id);
});

test("Stored entry has client_id and data used to generate it's uuid", async () => {
	const database = make_database();
	await database.ready;
	const entry: Entry = {date: new Date(), content: SAMPLE_CONTENT};
	await database.add_entry(entry);

	const got = (await database.retrieve_entries())[0];
	expect(got.created_at).toBe(database.client_id);
	const date_str = got.date.toISOString();
	const expected_id = uuidv5(date_str, got.created_at);

	console.log(date_str, expected_id);
	expect(got.id).toBe(expected_id);
});

describe("Database export", () => {
	const DATA_TEST_DB = "filled_database_test";
	const ENTRIES = [
		{date: new Date("2023-07-12T18:58:21-03:00"), content: {mood: Mood.NEUTRAL, text: "It works"}},
		{date: new Date("2023-07-12T19:01:22-03:00"), content: {mood: Mood.GOOD, text: "You can export and import"}}
	];
	const EXPORT_V2 = '{"data":{"id":"4c7d9ed9-4603-494a-9d19-73b0e7dbc9fb","version":2,"journal":[{"date":"2023-07-12T21:58:21.000Z","content":{"mood":2,"text":"It works"},"id":1},{"date":"2023-07-12T22:01:22.000Z","content":{"mood":3,"text":"You can export and import"},"id":2}]}}';

	async function make_populated_database() {
		const db = new Database(DATA_TEST_DB);
		await db.ready;
		await db.clear();
		await Promise.all(ENTRIES.map((entry) => db.add_entry(entry)));
		return db;
	}

	test("Database export has client id", async () => {
		const database = await make_populated_database();
		await database.ready;

		const dump = await database.to_export();
		expect(dump.client_id).toBe(database.client_id);
	});

	test("Exported database has entry count", async () => {
		const database = await make_populated_database();
		await database.ready;
		const dump = await database.to_export();

		const entries = dump.journal_length();
		expect(entries).toBe(ENTRIES.length);
	});

	test("Exported database has version", async () => {
		const database = await make_populated_database();
		await database.ready;
		const dump = await database.to_export();

		expect(dump.version).toBe(database.version);
	});

	test("Imported database has same client_id", async () => {
		const database = await make_populated_database();
		await database.ready;
		const dump = await database.to_export();

		const imported_database = await Database.from_export(dump);
		expect(imported_database.client_id).toBe(dump.client_id);
		imported_database.close();
	});
	test("Imported database has same entries", async () => {
		const database = await make_populated_database();
		await database.ready;
		const exported = await database.retrieve_entries();
		const dump = await database.to_export();

		const imported_database = await Database.from_export(dump);
		const imported = await imported_database.retrieve_entries();
		expect(imported).toEqual(expect.arrayContaining(exported));
		imported_database.close();
	});
	test("Export and import DatabaseExport as json", async () => {
		const database = await make_populated_database();
		await database.ready;
		const dump = await database.to_export();

		const json = dump.to_JSON();
		expect(typeof json).toBe(typeof "");
		const from_json = await DatabaseExport.import_json(json);
		//imported DatabaseExport is equal to exported
		expect(from_json).toStrictEqual(dump);
	});
	test("Import from version 2 update all ids to UUID", async () => {
		const old_version = await DatabaseExport.import_json(EXPORT_V2);
		const migrated = await Database.from_export(old_version);
		expect(migrated.version).toBeGreaterThan(old_version.version);
		const entries = await migrated.retrieve_entries();
		const check_id_is_uuid = entries.map((entry) => uuid_check(entry.id));
		const any_is_not_uuid = check_id_is_uuid.indexOf(false) == -1;
		expect(any_is_not_uuid).toBeTruthy();
	});
});
