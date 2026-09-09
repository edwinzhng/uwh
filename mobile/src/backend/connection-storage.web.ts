export const connectionStorage = {
	getItem: (key: string): string | null => window.sessionStorage.getItem(key),
	setItem: (key: string, value: string): void =>
		window.sessionStorage.setItem(key, value),
	removeItem: (key: string): void => window.sessionStorage.removeItem(key),
};
