import { type LocalAccount, localAppOrigin, localPickerOrigin } from "./policy";

type Pending = {
	id: string;
	requestId: string;
	popup: Window;
	issued: boolean;
};
const status = document.querySelector("output");
const list = document.querySelector("main");
const search = document.querySelector("input");
const state: { accounts: LocalAccount[]; pending?: Pending } = { accounts: [] };
const show = (message: string): void => {
	if (status) status.textContent = message;
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
				button.disabled = Boolean(state.pending);
				button.onclick = (): void => {
					const requestId = crypto.randomUUID();
					const popup = window.open(
						`${localAppOrigin}/local-login?request=${requestId}`,
						"uwh-local-app",
					);
					if (!popup) {
						show("Allow the local app tab to open, then try again.");
						return;
					}
					state.pending = { id: account.id, requestId, popup, issued: false };
					show(`Opening the local app as ${account.name}…`);
					render();
				};
				return button;
			}),
	);
};
search?.addEventListener("input", render);
window.addEventListener("message", (event: MessageEvent<unknown>): void => {
	const pending = state.pending;
	if (
		!pending ||
		event.origin !== localAppOrigin ||
		event.source !== pending.popup ||
		typeof event.data !== "object" ||
		event.data === null ||
		!("requestId" in event.data) ||
		event.data.requestId !== pending.requestId ||
		!("type" in event.data)
	)
		return;
	if (event.data.type === "uwh-local-sign-in-complete") {
		show(
			"ok" in event.data && event.data.ok === true
				? "Signed in. Switch back to the app tab to test this account."
				: "Sign-in failed. Choose the account again to retry.",
		);
		state.pending = undefined;
		render();
		return;
	}
	if (event.data.type !== "uwh-local-sign-in-ready" || pending.issued) return;
	pending.issued = true;
	void fetch("/api/session", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ id: pending.id }),
	})
		.then(async (response): Promise<unknown> => {
			if (!response.ok) throw new Error("Local sign-in could not start.");
			return response.json();
		})
		.then((credentials): void => {
			if (state.pending !== pending) return;
			pending.popup.postMessage(
				{
					type: "uwh-local-sign-in",
					requestId: pending.requestId,
					...(credentials && typeof credentials === "object"
						? credentials
						: {}),
				},
				localAppOrigin,
			);
		})
		.catch((): void => {
			state.pending = undefined;
			show(
				"Local sign-in failed. Check that the isolated backend is running, then retry.",
			);
			render();
		});
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
