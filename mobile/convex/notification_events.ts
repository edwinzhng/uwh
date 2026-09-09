import type { AppData } from "../src/domain/app-types";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { enqueue } from "./notifications";

export const notifyChanges = async (
	ctx: MutationCtx,
	clubId: Id<"clubs">,
	actorId: Id<"users">,
	previous: AppData,
	next: AppData,
): Promise<void> => {
	const changedEvents = next.events.filter((event) => {
		const before = previous.events.find((entry) => entry.id === event.id);
		return (
			before &&
			!before.cancelled &&
			(event.cancelled ||
				event.date !== before.date ||
				event.start !== before.start ||
				event.end !== before.end ||
				event.title !== before.title ||
				event.venue !== before.venue)
		);
	});
	for (const eventPhase of ["changed", "cancelled"] as const) {
		const events = changedEvents.filter(
			(event) => event.cancelled === (eventPhase === "cancelled"),
		);
		const first = events.at(0);
		if (first)
			await enqueue(ctx, {
				clubId,
				actorId,
				kind: "events",
				entityId: first.id,
				eventIds: events.map((event) => event.id),
				eventPhase,
				key: `${clubId}:edit:${eventPhase}:${first.id}:${first.editId ?? Date.now()}`,
			});
	}

	for (const message of next.messages.filter(
		(entry) => !previous.messages.some((old) => old.id === entry.id),
	))
		await enqueue(ctx, {
			clubId,
			actorId,
			kind: "messages",
			entityId: message.id,
			key: `${clubId}:message:${message.id}`,
		});
	for (const feedback of next.feedback.filter(
		(entry) =>
			entry.visibility === "published" &&
			!previous.feedback.some(
				(old) => old.id === entry.id && old.visibility === "published",
			),
	))
		await enqueue(ctx, {
			clubId,
			actorId,
			kind: "feedback",
			entityId: feedback.id,
			key: `${clubId}:feedback:${feedback.id}`,
		});
	for (const notice of next.notices.filter(
		(entry) => !previous.notices.some((old) => old.id === entry.id),
	))
		await enqueue(ctx, {
			clubId,
			actorId,
			kind: "announcements",
			entityId: notice.id,
			key: `${clubId}:notice:${notice.id}`,
		});
};
