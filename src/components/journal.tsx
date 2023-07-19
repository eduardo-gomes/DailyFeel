import { JournalManager } from "../lib/journalManager";
import { JournalEntryList } from "./journalEntry";
import { JournalForm } from "./journalForm";

function Journal() {
	const manager = new JournalManager();

	function exporter(event: MouseEvent) {
		manager.export().then((json) => {
			const blob = new Blob([json], {type: "application/json"});
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "daily-feel.json";
			a.click();
			URL.revokeObjectURL(url);
			console.log("Exported journal");
		});
	}

	return (<>
		<h1>Daily Feel journal</h1>
		<JournalForm/>
		<JournalEntryList list={manager.get_entry_list_signal()}/>
		<button onClick={exporter}>Export journal</button>
	</>);
}

export default Journal;