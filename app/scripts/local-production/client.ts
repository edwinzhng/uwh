import {
	localSignInHandoff,
	localSignInHandoffHash,
	localSignInHandoffPath,
} from "../../src/domain/local-account-tools";
import { type LocalAccount, localAppOrigin, localPickerOrigin } from "./policy";

const status = document.querySelector("output");
const list = document.querySelector("main");
const search = document.querySelector("input");
const state: { accounts: LocalAccount[]; signingIn: boolean } = {
	accounts: [],
	signingIn: false,
};
const show = (message: string): void => {
	if (status) status.textContent = message;
};
const handoffHash = (credentials: unknown): string | undefined => {
	if (
		typeof credentials !== "object" ||
		credentials === null ||
		!("email" in credentials) ||
		typeof credentials.email !== "string" ||
		!("code" in credentials) ||
		typeof credentials.code !== "string"
	)
		return;
	const hash = localSignInHandoffHash({
		email: credentials.email,
		code: credentials.code,
	});
	return localSignInHandoff(hash) ? hash : undefined;
};
const signIn = (account: LocalAccount): void => {
	state.signingIn = true;
	show(`Opening the local app as ${account.name}…`);
	render();
	void fetch("/api/session", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ id: account.id }),
	})
		.then(async (response): Promise<unknown> => {
			if (!response.ok) throw new Error("Local sign-in could not start.");
			return response.json();
		})
		.then((credentials): void => {
			const hash = handoffHash(credentials);
			if (!hash) throw new Error("Local sign-in returned no code.");
			window.location.assign(
				`${localAppOrigin}${localSignInHandoffPath}${hash}`,
			);
		})
		.catch((): void => {
			state.signingIn = false;
			show(
				"Local sign-in failed. Check that the isolated backend is running, then retry.",
			);
			render();
		});
};
const render = (): void => {
	if (!list) return;
	list.replaceChildren(
		...state.accounts
			.filter((account) =>
				`${account.name} ${account.email}`
					.toLowerCase()
					.includes(search?.value.toLowerCase() ?? ""),
			)
			.map((account): HTMLButtonElement => {
				const button = document.createElement("button");
				button.textContent = `${account.name} · ${account.email}`;
				button.disabled = state.signingIn;
				button.onclick = (): void => signIn(account);
				return button;
			}),
	);
};
search?.addEventListener("input", render);
window.addEventListener("pageshow", (event): void => {
	if (!event.persisted) return;
	state.signingIn = false;
	render();
});
void fetch("/api/accounts")
	.then(async (response): Promise<LocalAccount[]> => {
		if (!response.ok) throw new Error("Account list unavailable.");
		return response.json();
	})
	.then((accounts): void => {
		state.accounts = accounts;
		show(
			`${accounts.length} copied production login accounts. Email and push delivery are disabled.`,
		);
		render();
	})
	.catch((): void => show("Reload the local picker to reconnect."));
if (window.location.origin !== localPickerOrigin)
	show("Use the local picker address printed by the development command.");
