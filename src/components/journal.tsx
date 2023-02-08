import { JournalManager } from "../lib/journalManager";
import { JournalEntryList } from "./journalEntry";
import { JournalForm } from "./journalForm";

function Journal() {
	const manager = new JournalManager();
	return (<>
		<h1>Hello</h1>
		<JournalForm/>
		<JournalEntryList list={manager.get_entry_list_signal()}/>
	</>);
}

export default Journal;