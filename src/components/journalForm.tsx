import "./journalForm.css";
import { createSignal, For, Setter, Signal } from "solid-js";
import { EntryContent, Mood } from "../lib/journalTypes";
import { JournalManager } from "../lib/journalManager";
import { SSR } from "../lib/ssr_const";

const INITIAL_MOOD = Mood.NEUTRAL;

/// Signal that persists data with localStorage
function persistentTextSignal(): Signal<string> {
	const key = "new_journal";

	function getItem() {
		if (SSR) return "";
		return localStorage.getItem(key) ?? "";
	}

	function setItem(value: string) {
		localStorage.setItem(key, value);
	}

	const [text, setText] = createSignal(getItem());
	const set: Setter<string> = (value) => {
		const text = setText(value);
		setItem(text);
		return text;
	}

	return [text, set];
}

export function JournalForm() {
	const [locked, setLocked] = createSignal(false);
	const [persistentText, setText] = persistentTextSignal();
	const [mood, setMood] = createSignal<Mood>(INITIAL_MOOD);
	const text = () => locked() ? "Saving..." : persistentText();
	const manager = new JournalManager();

	function onSubmit(e: SubmitEvent) {
		e.preventDefault();

		function lock() {
			setLocked(true);
		}

		function unlock() {
			setLocked(false);
		}

		function clear() {
			setText("");
			setMood(INITIAL_MOOD);
		}

		let entry: EntryContent = {
			mood: mood(), text: text()
		};
		console.log("Creating new entry", entry, Mood[entry.mood]);
		lock();
		manager.new_entry(new Date(), entry).then(clear).finally(unlock);
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