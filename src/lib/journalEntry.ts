type JournalEntry = {
	date: Date,
	content: JournalEntryContent
};

enum Mood {
	VERY_BAD,
	BAD,
	NEUTRAL,
	GOOD,
	VERY_GOOD
}

type JournalEntryContent = {
	mood: Mood,
	text: string
};

export { JournalEntry, JournalEntryContent, Mood };