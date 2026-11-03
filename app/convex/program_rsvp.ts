import { defaultProgramResponses } from "../src/domain/programs";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export const applyProgramRsvpDefaults = async (
	ctx: MutationCtx,
	event: Doc<"events">,
): Promise<void> => {
	if (
		!event.value.programRsvp ||
		event.value.programRsvp.defaultResponse === "none" ||
		event.value.cancelled ||
		(event.value.closesAt ?? Infinity) > Date.now()
	)
		return;
	const [members, responses] = await Promise.all([
		ctx.db
			.query("members")
			.withIndex("by_club", (q) => q.eq("clubId", event.clubId))
			.collect(),
		ctx.db
			.query("responses")
			.withIndex("by_event", (q) =>
				q.eq("clubId", event.clubId).eq("value.eventId", event.value.id),
			)
			.collect(),
	]);
	const next = defaultProgramResponses(
		event.value,
		members.map((row) => row.value),
		responses.map((row) => row.value),
		Date.now(),
	);
	for (const value of next) {
		const previous = responses.find(
			(row) => row.value.personId === value.personId,
		);
		if (previous) {
			if (
				JSON.stringify(previous.value) !==
				JSON.stringify({ ...value, id: previous.value.id })
			)
				await ctx.db.patch(previous._id, {
					value: { ...value, id: previous.value.id },
				});
		} else
			await ctx.db.insert("responses", {
				clubId: event.clubId,
				value: { ...value, id: `${value.eventId}:${value.personId}` },
			});
	}
};
