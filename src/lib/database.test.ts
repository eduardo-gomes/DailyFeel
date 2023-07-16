import "./indexeddb_node";
import { validate as uuid_check } from "uuid";

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

describe("Database export", () => {
	const DATA_TEST_DB = "filled_database_test";
	const ENTRIES = [
		{date: new Date("2023-07-12T18:58:21-03:00"), content: {mood: Mood.NEUTRAL, text: "It works"}},
		{date: new Date("2023-07-12T19:01:22-03:00"), content: {mood: Mood.GOOD, text: "You can export and import"}}
	];

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
	test("Export and import database as json", async () => {
		const database = await make_populated_database();
		await database.ready;
		const exported = await database.retrieve_entries();
		const dump = await database.to_export();

		const json = dump.to_JSON();
		expect(typeof json).toBe(typeof "");
		const from_json = await DatabaseExport.import_json(json);
		expect(from_json).toStrictEqual(dump);

		const imported_database = await Database.from_export(dump);
		const imported = await imported_database.retrieve_entries();
		expect(imported).toEqual(expect.arrayContaining(exported));
		imported_database.close();
	});
});
