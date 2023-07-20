import "./journalForm.css";
import { createSignal, For } from "solid-js";
import { EntryContent, Mood } from "../lib/journalTypes";
import { JournalManager } from "../lib/journalManager";

const INITIAL_MOOD = Mood.NEUTRAL;

export function JournalForm() {
	const [locked, setLocked] = createSignal(false);
	const [text, setText] = createSignal("");
	const [mood, setMood] = createSignal<Mood>(INITIAL_MOOD);
	const manager = new JournalManager();

	function onSubmit(e: SubmitEvent) {
		e.preventDefault();

		function lock() {
			setLocked(true);
			setText("Saving...");
		}

		function unlock() {
			setLocked(false);
			setText(entry.text);
		}

		function unlock_clear() {
			unlock();
			setText("");
			setMood(INITIAL_MOOD);
		}

		let entry: EntryContent = {
			mood: mood(), text: text()
		};
		console.log("Creating new entry", entry, Mood[entry.mood]);
		lock();
		manager.new_entry(new Date(), entry).then(unlock_clear).catch(unlock);
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
				Locked: {JSON.stringify(locked())}<br/>
				Mood:
				<div class="moods">
					<For each={moods}>
						{(item) => <label class="mood">
							<input type="radio" onInput={onMoodInput} name="mood" value={item[1]}
								   checked={item[1] == mood()} disabled={locked()} required/>
							<span>{item[0]}</span>
						</label>}
					</For>
				</div>
			</div>
			<label class="text">
				<span>Journal:</span>
				<textarea value={text()} onInput={onText} rows="5" placeholder="Type something here"
						  disabled={locked()}></textarea>
			</label>
			<div class="submit"><input type="submit" disabled={locked()}/></div>
		</form>
	);
}