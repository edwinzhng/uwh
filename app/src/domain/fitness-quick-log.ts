export const nextFitnessLogPerson = (
	people: readonly { id: string }[],
	currentId: string,
): string | undefined => {
	const index = people.findIndex((person) => person.id === currentId);
	return index < 0 ? undefined : people.at(index + 1)?.id;
};

export const fitnessQuickLogSaveLabel = (
	nextPersonId: string | undefined,
): string => (nextPersonId ? "Save & next" : "Save result");
