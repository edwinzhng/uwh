import { httpRouter } from "convex/server";
import { receive as appleNotification } from "./apple_notifications";
import { auth } from "./auth";
import { calendarFeed } from "./calendar_http";
import { download, preflight, upload } from "./image_http";
import {
	download as downloadProfilePhoto,
	preflight as profilePhotoPreflight,
	upload as uploadProfilePhoto,
} from "./member_profile_http";
import { feed as publicCalendarFeed } from "./public_calendar";
import {
	download as downloadResource,
	preflight as resourcePreflight,
	upload as uploadResource,
} from "./resource_http";
import {
	callback as youtubeCallback,
	chunk as youtubeChunk,
	preflight as youtubePreflight,
} from "./youtube_http";

const http = httpRouter();
http.route({
	path: "/apple/notifications",
	method: "POST",
	handler: appleNotification,
});
http.route({
	path: "/youtube/callback",
	method: "GET",
	handler: youtubeCallback,
});
http.route({ path: "/youtube/upload", method: "POST", handler: youtubeChunk });
http.route({
	path: "/youtube/upload",
	method: "OPTIONS",
	handler: youtubePreflight,
});
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
http.route({
	path: "/profiles/photo",
	method: "GET",
	handler: downloadProfilePhoto,
});
http.route({
	path: "/profiles/photo",
	method: "POST",
	handler: uploadProfilePhoto,
});
http.route({
	path: "/profiles/photo",
	method: "OPTIONS",
	handler: profilePhotoPreflight,
});
http.route({
	path: "/resources/file",
	method: "GET",
	handler: downloadResource,
});
http.route({
	path: "/resources/file",
	method: "POST",
	handler: uploadResource,
});
http.route({
	path: "/resources/file",
	method: "OPTIONS",
	handler: resourcePreflight,
});
export default http;
