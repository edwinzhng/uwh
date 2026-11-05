export const workspaceRequest = (
	screen: string,
	params: Readonly<Record<string, unknown>>,
	selected?: string,
): { screen: string; id?: string } => {
	const value = (key: string): string | undefined => {
		const entry = params[key];
		return typeof entry === "string"
			? entry
			: Array.isArray(entry) && typeof entry.at(0) === "string"
				? entry.at(0)
				: undefined;
	};
	const name = ["progress", "my-progress"].includes(screen) ? "member" : screen;
	return {
		screen: name,
		id:
			name === "session"
				? (value("event") ?? value("id"))
				: name === "fitness" || name === "resources"
					? value("person")
					: ["member", "membership", "account"].includes(name)
						? (value("id") ?? selected)
						: undefined,
	};
};
