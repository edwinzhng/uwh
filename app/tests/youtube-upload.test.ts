import { describe, expect, test } from "bun:test";
import { youtubePosition } from "../convex/youtube_api";
import { youtubeOAuthClient } from "../convex/youtube_config";
import {
	validateYoutubeUpload,
	youtubeReceivedBytes,
	youtubeSessionUrl,
	youtubeUploadLimit,
	youtubeVideoId,
} from "../src/domain/youtube-upload";

describe("YouTube uploads", (): void => {
	test("reuses Google sign-in credentials unless a complete dedicated client is configured", (): void => {
		const google = {
			AUTH_GOOGLE_ID: "fixture-google-id",
			AUTH_GOOGLE_SECRET: "fixture-google-secret",
		};
		expect(youtubeOAuthClient(google)).toEqual({
			clientId: "fixture-google-id",
			clientSecret: "fixture-google-secret",
		});
		expect(
			youtubeOAuthClient({
				...google,
				YOUTUBE_CLIENT_ID: "fixture-youtube-id",
				YOUTUBE_CLIENT_SECRET: "fixture-youtube-secret",
			}),
		).toEqual({
			clientId: "fixture-youtube-id",
			clientSecret: "fixture-youtube-secret",
		});
		expect(
			youtubeOAuthClient({
				...google,
				YOUTUBE_CLIENT_ID: "fixture-youtube-id",
			}),
		).toBeUndefined();
		expect(
			youtubeOAuthClient({
				...google,
				YOUTUBE_CLIENT_SECRET: "fixture-youtube-secret",
			}),
		).toBeUndefined();
		expect(youtubeOAuthClient({})).toBeUndefined();
	});
	test("recognizes equivalent video links so editing a URL does not delete the same video", (): void => {
		expect(youtubeVideoId("https://youtu.be/abcdefghijk")).toBe("abcdefghijk");
		expect(
			youtubeVideoId("https://www.youtube.com/watch?v=abcdefghijk&t=30"),
		).toBe("abcdefghijk");
		expect(youtubeVideoId("https://vimeo.com/123456")).toBeUndefined();
	});
	test("accepts large coaching videos and rejects invalid media before reserving uploads", (): void => {
		expect(
			validateYoutubeUpload(750 * 1024 * 1024, "video/quicktime"),
		).toBeUndefined();
		expect(validateYoutubeUpload(0, "video/mp4")).toBeDefined();
		expect(
			validateYoutubeUpload(youtubeUploadLimit + 1, "video/mp4"),
		).toBeDefined();
		expect(validateYoutubeUpload(1.5, "video/mp4")).toBeDefined();
		expect(validateYoutubeUpload(100, "application/pdf")).toBeDefined();
	});
	test("resumes after the last acknowledged byte and rejects malformed positions", (): void => {
		expect(youtubeReceivedBytes(null, 1000)).toBe(0);
		expect(youtubeReceivedBytes("bytes=0-511", 1000)).toBe(512);
		for (const range of [
			"bytes=1-511",
			"bytes=0-1000",
			"bytes=0-NaN",
			"bytes=0-999999999999999999999",
		])
			expect(() => youtubeReceivedBytes(range, 1000)).toThrow();
	});
	test("only accepts Google's exact upload endpoint", (): void => {
		expect(
			youtubeSessionUrl(
				"https://www.googleapis.com/upload/youtube/v3/videos?upload_id=fixture",
			),
		).toContain("upload_id=fixture");
		for (const url of [
			"http://www.googleapis.com/upload/youtube/v3/videos?upload_id=x",
			"https://www.googleapis.com.attacker.test/upload/youtube/v3/videos?upload_id=x",
			"https://www.googleapis.com/youtube/v3/videos?upload_id=x",
			"https://www.googleapis.com/upload/youtube/v3/videos",
		])
			expect(() => youtubeSessionUrl(url)).toThrow();
	});
	test("keeps incomplete uploads pending and accepts verified unlisted completions", async (): Promise<void> => {
		expect(
			await youtubePosition(
				new Response(null, { status: 308, headers: { Range: "bytes=0-511" } }),
				1000,
			),
		).toEqual({ received: 512 });
		expect(
			await youtubePosition(
				Response.json({
					id: "abcdefghijk",
					status: { privacyStatus: "unlisted", uploadStatus: "uploaded" },
				}),
				1000,
			),
		).toEqual({
			received: 1000,
			url: "https://www.youtube.com/watch?v=abcdefghijk",
		});
	});
	test("does not save rejected, private, malformed or expired upload results as playable videos", async (): Promise<void> => {
		for (const payload of [
			{ id: "abcdefghijk", status: { privacyStatus: "private" } },
			{
				id: "abcdefghijk",
				status: { privacyStatus: "unlisted", uploadStatus: "rejected" },
			},
			{ id: "bad", status: { privacyStatus: "unlisted" } },
		])
			await expect(
				youtubePosition(Response.json(payload), 1000),
			).rejects.toThrow();
		await expect(
			youtubePosition(new Response(null, { status: 404 }), 1000),
		).rejects.toThrow("expired");
	});
	test("cleanup can identify a completed video even if YouTube changed its visibility", async (): Promise<void> => {
		expect(
			await youtubePosition(
				Response.json({
					id: "abcdefghijk",
					status: { privacyStatus: "private" },
				}),
				1000,
				false,
			),
		).toEqual({
			received: 1000,
			url: "https://www.youtube.com/watch?v=abcdefghijk",
		});
	});
});
