import { VoidProps } from "solid-js";
import { Entry, Mood } from "../lib/journalTypes";

function JournalEntry(props: VoidProps<{ entry: Entry }>) {
	const entry = props.entry;
	return (<div class="journalEntry">
		<p>Date: <time datetime={entry.date.toISOString()}>{entry.date.toLocaleString()}</time></p>
		<p>Mood: {Mood[entry.content.mood]}</p>
		<p>Journal: {entry.content.text}</p>
	</div>);
}

export default JournalEntry;