import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { calendarFeed } from "./calendar_http";
import { download, preflight, upload } from "./image_http";
import { feed as publicCalendarFeed } from "./public_calendar";

const http = httpRouter();
auth.addHttpRoutes(http);
http.route({ path: "/calendar.ics", method: "GET", handler: calendarFeed });
http.route({
	path: "/public-calendar.ics",
	method: "GET",
	handler: publicCalendarFeed,
});
http.route({ path: "/images", method: "GET", handler: download });
http.route({ path: "/images", method: "POST", handler: upload });
http.route({ path: "/images", method: "OPTIONS", handler: preflight });
export default http;
