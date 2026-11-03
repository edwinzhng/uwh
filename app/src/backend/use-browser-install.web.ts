import { useEffect, useState } from "react";

type InstallPrompt = Event & {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
export const useBrowserInstall = (): {
	available: boolean;
	installed: boolean;
	install: () => Promise<void>;
	instructions: string;
} => {
	const [prompt, setPrompt] = useState<InstallPrompt>();
	const [installed, setInstalled] = useState(false);
	useEffect(() => {
		setInstalled(window.matchMedia("(display-mode: standalone)").matches);
		const capture = (event: Event): void => {
			if (
				!("prompt" in event) ||
				typeof event.prompt !== "function" ||
				!("userChoice" in event)
			)
				return;
			event.preventDefault();
			setPrompt(event as InstallPrompt);
		};
		const complete = (): void => {
			setInstalled(true);
			setPrompt(undefined);
		};
		window.addEventListener("beforeinstallprompt", capture);
		window.addEventListener("appinstalled", complete);
		return (): void => {
			window.removeEventListener("beforeinstallprompt", capture);
			window.removeEventListener("appinstalled", complete);
		};
	}, []);
	return {
		available: Boolean(prompt),
		installed,
		install: async (): Promise<void> => {
			if (prompt) {
				await prompt.prompt();
				if ((await prompt.userChoice).outcome === "accepted")
					setInstalled(true);
				setPrompt(undefined);
			}
		},
		instructions: installed
			? "This web app is installed."
			: "On iPhone: Share → Add to Home Screen. In Chrome or Edge: browser menu → Install app.",
	};
};
