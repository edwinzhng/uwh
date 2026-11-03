import { notificationPath } from "../domain/push-routing";

type PushPayload = { title: string; body: string; path: string };
type PushEvent = {
	data?: { json: () => unknown };
	waitUntil: (promise: Promise<void>) => void;
};
type NotificationClickEvent = {
	notification: { data?: unknown; close: () => void };
	waitUntil: (promise: Promise<void>) => void;
};
type PushWorkerScope = {
	location: { origin: string };
	registration: {
		showNotification: (
			title: string,
			options: {
				body: string;
				data: { path: string };
				icon: string;
				tag?: string;
			},
		) => Promise<void>;
	};
	clients: {
		matchAll: (options: {
			type: "window";
			includeUncontrolled: boolean;
		}) => Promise<
			{
				url: string;
				focus: () => Promise<void>;
				navigate: (url: string) => Promise<void>;
			}[]
		>;
		openWindow: (url: string) => Promise<void>;
	};
	addEventListener: {
		(type: "push", handler: (event: PushEvent) => void): void;
		(
			type: "notificationclick",
			handler: (event: NotificationClickEvent) => void,
		): void;
	};
};
declare const self: PushWorkerScope;
const payload = (value: unknown): PushPayload | undefined => {
	if (
		!value ||
		typeof value !== "object" ||
		!("title" in value) ||
		!("body" in value) ||
		!("path" in value) ||
		typeof value.title !== "string" ||
		typeof value.body !== "string"
	)
		return undefined;
	const path = notificationPath(value.path);
	return path && value.title.length <= 100 && value.body.length <= 500
		? { title: value.title, body: value.body, path }
		: undefined;
};
self.addEventListener("push", (event): void => {
	const read = (): PushPayload | undefined => {
		try {
			return payload(event.data?.json());
		} catch {
			return undefined;
		}
	};
	const value = read();
	event.waitUntil(
		self.registration.showNotification(value?.title ?? "UWH Club", {
			body: value?.body ?? "Open the app for your latest activity.",
			data: { path: value?.path ?? "/club" },
			icon: "/club-logo-192.png",
		}),
	);
});
self.addEventListener("notificationclick", (event): void => {
	event.notification.close();
	const data = event.notification.data;
	const path =
		data && typeof data === "object" && "path" in data
			? notificationPath(data.path)
			: undefined;
	const url = new URL(path ?? "/club", self.location.origin).href;
	event.waitUntil(
		(async (): Promise<void> => {
			const windows = await self.clients.matchAll({
				type: "window",
				includeUncontrolled: true,
			});
			const existing = windows.find(
				(client) => new URL(client.url).origin === self.location.origin,
			);
			if (existing) {
				await existing.navigate(url);
				await existing.focus();
			} else await self.clients.openWindow(url);
		})(),
	);
});
