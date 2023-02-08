import "./journalEntry.css";
import { Accessor, For, VoidProps } from "solid-js";
import { Entry, Mood } from "../lib/journalTypes";

function JournalEntry(props: VoidProps<{ entry: Entry }>) {
	const entry = props.entry;
	return (<article class="journalEntry">
		<p>Date: <time datetime={entry.date.toISOString()}>{entry.date.toLocaleString()}</time></p>
		<p>Mood: {Mood[entry.content.mood]}</p>
		<p class="journal">{entry.content.text}</p>
	</article>);
}

function JournalEntryList(props: VoidProps<{ list: Accessor<readonly Entry[]> }>) {
	return (<div class="journalEntryContainer">
		<For each={props.list()}>
			{(item) => <JournalEntry entry={item}/>}
		</For>
	</div>);
}

export { JournalEntryList };