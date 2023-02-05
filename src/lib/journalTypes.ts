type Entry = {
	date: Date,
	content: EntryContent
};

enum Mood {
	VERY_BAD,
	BAD,
	NEUTRAL,
	GOOD,
	VERY_GOOD
}

type EntryContent = {
	mood: Mood,
	text: string
};

export { Entry, EntryContent, Mood };