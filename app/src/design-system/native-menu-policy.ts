export const loadAvailableMenu = <Menu>(
	available: boolean,
	load: () => Menu,
): Menu | undefined => {
	if (!available) return undefined;
	try {
		return load();
	} catch {
		return undefined;
	}
};
