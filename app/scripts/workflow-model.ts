export const verifyWorkflow = <State, Action>({
	initial,
	actions,
	transition,
	invariant,
	key,
	depth,
}: {
	initial: State;
	actions: (state: State) => readonly Action[];
	transition: (state: State, action: Action) => State;
	invariant: (before: State, action: Action, after: State) => void;
	key: (state: State) => string;
	depth: number;
}): { states: number; transitions: number } => {
	const visited = new Set([key(initial)]);
	const counts = { transitions: 0 };
	const walk = (
		frontier: readonly { state: State; trace: readonly Action[] }[],
		remaining: number,
	): void => {
		if (!remaining || !frontier.length) return;
		const next: { state: State; trace: readonly Action[] }[] = [];
		for (const entry of frontier)
			for (const action of actions(entry.state)) {
				const trace = [...entry.trace, action];
				const after = transition(entry.state, action);
				try {
					invariant(entry.state, action, after);
				} catch (error) {
					throw new Error(
						`Workflow invariant failed after ${JSON.stringify(trace)}`,
						{ cause: error },
					);
				}
				counts.transitions += 1;
				const id = key(after);
				if (!visited.has(id)) {
					visited.add(id);
					next.push({ state: after, trace });
				}
			}
		walk(next, remaining - 1);
	};
	walk([{ state: initial, trace: [] }], depth);
	return { states: visited.size, transitions: counts.transitions };
};
