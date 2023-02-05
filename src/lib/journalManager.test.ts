import { JournalManager } from "./journalManager";
import { Entry } from "./journalTypes";

function clearManager() {
	new JournalManager().clear();
}

afterEach(clearManager);
beforeAll(clearManager);

test("New journal manager has no entries", () => {
	const manager = new JournalManager();
	let entryList = manager.get_entry_list();
	expect(entryList.length).toBe(0);
});

test("New journal after add entries, has one entry", () => {
	const manager = new JournalManager();
	let content = {
		mood: 0, text: "ASD"
	};
	manager.new_entry(new Date(), content);
	let entryList = manager.get_entry_list();
	expect(entryList.length).toBe(1);
});

test("New journal after add entries, get same content and date", () => {
	const manager = new JournalManager();
	let content = {
		mood: 0, text: "ASD"
	};
	let date = new Date();
	manager.new_entry(date, content);
	let got_entry = manager.get_entry_list().at(0) as Entry;
	expect(got_entry.content).toEqual(content);
	expect(got_entry.date).toEqual(date);
});

test("Changes on the added entry are not visible", () => {
	const manager = new JournalManager();
	let content = {
		mood: 0, text: "ASD"
	};
	let date = new Date();
	manager.new_entry(date, content);
	{
		let got_entry = manager.get_entry_list().at(0) as Entry;
		expect(got_entry.content).toEqual(content);
		expect(got_entry.date).toEqual(date);
	}
	content.text = "Other";
	date.setDate(0);
	{
		let got_entry = manager.get_entry_list().at(0) as Entry;
		expect(got_entry.content).not.toEqual(content);
		expect(got_entry.date).not.toEqual(date);
	}
});

test("Got entries are not writable", () => {
	const manager = new JournalManager();
	let content = {
		mood: 0, text: "ASD"
	};
	let date = new Date();
	manager.new_entry(date, content);
	let got_entry = manager.get_entry_list().at(0) as Entry;
	expect(() => {
		got_entry.content.text = "Other";
	}).toThrow();
	expect(() => {
		got_entry.date = new Date();
	}).toThrow();
});

test(".clear removes all entries", () => {
	const manager = new JournalManager();
	let content = {
		mood: 0, text: "ASD"
	};
	manager.new_entry(new Date(), content);
	manager.clear();
	let entries = manager.get_entry_list();
	expect(entries).toHaveLength(0);
});

test("Manager persists entries", () => {
	{
		const manager = new JournalManager();
		let content = {
			mood: 0, text: "ASD"
		};
		manager.new_entry(new Date(), content);
	}
	const manager = new JournalManager();
	let entries = manager.get_entry_list();
	expect(entries).toHaveLength(1);
});
