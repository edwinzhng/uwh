import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

export const calendarFeed = httpAction(
	async (ctx, request): Promise<Response> => {
		const token = new URL(request.url).searchParams.get("token") ?? "";
		const calendar = await ctx.runMutation(internal.calendar.read, { token });
		const headers = {
			"Cache-Control": "no-store",
			"X-Robots-Tag": "noindex, nofollow, noarchive",
			"Referrer-Policy": "no-referrer",
			"X-Content-Type-Options": "nosniff",
		};
		return calendar
			? new Response(calendar, {
					headers: {
						...headers,
						"Content-Type": "text/calendar; charset=utf-8",
						"Content-Disposition": 'inline; filename="crocs-calendar.ics"',
					},
				})
			: new Response("Calendar unavailable.", { status: 404, headers });
	},
);
