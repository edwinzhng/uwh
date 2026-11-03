export const useBrowserInstall = (): {
	available: boolean;
	installed: boolean;
	install: () => Promise<void>;
	instructions: string;
} => ({
	available: false,
	installed: false,
	install: async (): Promise<void> => {},
	instructions: "Open the web app to install a browser shortcut.",
});
