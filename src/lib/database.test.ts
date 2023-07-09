import "./indexeddb_node";
import { validate as uuid_check } from "uuid";

import { Entry } from "./journalTypes";
import { Database } from "./database";

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
