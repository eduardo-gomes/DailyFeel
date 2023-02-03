import { createSignal, For } from "solid-js";
import { JournalEntryContent, Mood } from "./lib/journalEntry";

function JournalForm() {
	const [text, setText] = createSignal("");
	const [mood, setMood] = createSignal<Mood>(Mood.NEUTRAL);

	function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		let entry: JournalEntryContent = {
			mood: mood(), text: text()
		};
		console.log(entry, Mood[entry.mood]);
	}

	function onMoodInput(e: InputEvent) {
		const value = (e.target as HTMLInputElement).value;
		const int = parseInt(value) as Mood;
		setMood(int);
	}

	function onText(e: InputEvent) {
		const target = (e.target as HTMLTextAreaElement);
		const value = target.value;
		setText(value);
	}

	const moods: [string, Mood][] = [
		["Very Bad", Mood.VERY_BAD],
		["Bad", Mood.BAD],
		["Neutral", Mood.NEUTRAL],
		["Good", Mood.GOOD],
		["Very Good", Mood.VERY_GOOD]
	];

	return (
		<form onSubmit={onSubmit}>
			<div>
				Mood:
				<For each={moods}>
					{(item) => <label>{item[0]}
						<input type="radio" onInput={onMoodInput} name="mood" value={item[1]} required/>
					</label>}
				</For>
			</div>
			<label>
				Journal:
				<textarea value={text()} onInput={onText} placeholder="Type something here"></textarea>
			</label>
			<input type="submit"/>
		</form>
	);
}

function Journal() {
	return (<>
		<h1>Hello</h1>
		<JournalForm/>
	</>);
}

export default Journal;