import "./journalForm.css";
import { createSignal, For, untrack } from "solid-js";
import { EntryContent, Mood } from "../lib/journalTypes";
import { JournalManager } from "../lib/journalManager";

export function JournalForm() {
	const [text, setText] = createSignal("");
	const [mood, setMood] = createSignal<Mood>(Mood.NEUTRAL);
	const initialMood = untrack(() => mood());
	const manager = new JournalManager();

	function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		let entry: EntryContent = {
			mood: mood(), text: text()
		};
		console.log(entry, Mood[entry.mood]);
		manager.new_entry(new Date(), entry);
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
		<form onSubmit={onSubmit} class="journalForm">
			<div>
				Mood:
				<div class="moods">
					<For each={moods}>
						{(item) => <label class="mood">
							<input type="radio" onInput={onMoodInput} name="mood" value={item[1]}
								   checked={item[1] == initialMood} required/>
							<span>{item[0]}</span>
						</label>}
					</For>
				</div>
			</div>
			<label class="text">
				<span>Journal:</span>
				<textarea value={text()} onInput={onText} rows="5" placeholder="Type something here"></textarea>
			</label>
			<div class="submit"><input type="submit"/></div>
		</form>
	);
}