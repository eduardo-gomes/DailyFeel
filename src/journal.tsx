import { createSignal } from "solid-js";
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

	return (
		<form onSubmit={onSubmit}>
			<div>
				Mood:
				<label>Very Bad
					<input type="radio" onInput={onMoodInput} name="mood" value={Mood.VERY_BAD} required/>
				</label>
				<label>Bad
					<input type="radio" onInput={onMoodInput} name="mood" value={Mood.BAD}/>
				</label>
				<label>Neutral
					<input type="radio" onInput={onMoodInput} name="mood" value={Mood.NEUTRAL}/>
				</label>
				<label>Good
					<input type="radio" onInput={onMoodInput} name="mood" value={Mood.GOOD}/>
				</label>
				<label>Very Good
					<input type="radio" onInput={onMoodInput} name="mood" value={Mood.VERY_GOOD}/>
				</label>
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