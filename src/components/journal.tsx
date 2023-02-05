import "./journal.css";
import { createSignal, For, untrack } from "solid-js";
import { EntryContent, Mood } from "../lib/journalTypes";

function JournalForm() {
	const [text, setText] = createSignal("");
	const [mood, setMood] = createSignal<Mood>(Mood.NEUTRAL);
	const initialMood = untrack(() => mood());

	function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		let entry: EntryContent = {
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
					{(item) => <label class="mood">
						<input type="radio" onInput={onMoodInput} name="mood" value={item[1]}
							   checked={item[1] == initialMood} required/>
						<span>{item[0]}</span>
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