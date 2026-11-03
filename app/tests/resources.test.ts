import { describe, expect, test } from "bun:test";
import {
	canManageResources,
	canReadResource,
	documentMime,
	type Resource,
	type ResourceActor,
	resourceByteRange,
	resourceFileLimit,
	resourceHouseholdPrograms,
	resourceLimits,
	resourceMatches,
	resourceMediaMime,
	resourceTimestamps,
	resourceUrl,
	sameResourceDraft,
	validateResource,
	validateResourceComment,
	youtubeThumbnail,
} from "../src/domain/resources";

const player: ResourceActor = {
	clubId: "club-a",
	personId: "sam",
	children: [],
	coachPrograms: [],
	admin: false,
};
const guardian: ResourceActor = {
	...player,
	personId: "jamie",
	children: ["sam", "mila"],
};
const coach: ResourceActor = {
	...player,
	personId: "casey",
	coachPrograms: ["club"],
};
const admin: ResourceActor = { ...player, personId: "morgan", admin: true };
const resource: Resource = {
	id: "resource-1",
	clubId: "club-a",
	title: "Passing practice",
	description: "Support after passing",
	kind: "video",
	audience: "players",
	personIds: ["sam"],
	url: "https://youtu.be/dQw4w9WgXcQ",
	archived: false,
	revision: 1,
	updatedAt: 1,
};

describe("resource access", () => {
	test("tagged resources are readable by the player, guardian and staff", () => {
		expect(
			[player, guardian, coach, admin].every((actor) =>
				canReadResource(actor, resource),
			),
		).toBe(true);
		expect(canReadResource({ ...player, personId: "taylor" }, resource)).toBe(
			false,
		);
	});
	test("club membership is required even for admin and club resources", () => {
		for (const actor of [player, guardian, coach, admin]) {
			expect(
				canReadResource(
					{ ...actor, clubId: "club-b" },
					{ ...resource, audience: "club" },
				),
			).toBe(false);
		}
	});
	test("coach material stays hidden from players and guardians", () => {
		const privateResource = { ...resource, audience: "coaches" as const };
		expect(canReadResource(player, privateResource)).toBe(false);
		expect(canReadResource(guardian, privateResource)).toBe(false);
		expect(canReadResource(coach, privateResource)).toBe(true);
		expect(canReadResource(admin, privateResource)).toBe(true);
	});
	test("only staff manage resources; ordinary members can read club resources", () => {
		expect(canManageResources(player)).toBe(false);
		expect(canManageResources(guardian)).toBe(false);
		expect(canManageResources(coach)).toBe(true);
		expect(canManageResources(admin)).toBe(true);
		expect(
			canReadResource(
				{ ...player, personId: "taylor" },
				{ ...resource, audience: "club" },
			),
		).toBe(true);
	});
});
describe("resource validation", () => {
	test("create retries compare normalized metadata without losing a saved resource", () => {
		expect(
			sameResourceDraft(resource, {
				...resource,
				title: ` ${resource.title} `,
				description: ` ${resource.description} `,
			}),
		).toBe(true);
		expect(
			sameResourceDraft(
				{ ...resource, personIds: ["sam", "mila"] },
				{ ...resource, personIds: ["mila", "sam"] },
			),
		).toBe(true);
		expect(
			sameResourceDraft(resource, { ...resource, title: "Changed title" }),
		).toBe(false);
		expect(
			sameResourceDraft(
				{ ...resource, personIds: ["sam\nmila"] },
				{ ...resource, personIds: ["sam", "mila"] },
			),
		).toBe(false);
		expect(sameResourceDraft(resource, { ...resource, audience: "club" })).toBe(
			false,
		);
	});
	test("accepts a secure link or one uploaded document", () => {
		expect(validateResource(resource)).toBeUndefined();
		expect(
			validateResource({
				...resource,
				kind: "document",
				url: undefined,
				fileId: "file-1",
			}),
		).toBeUndefined();
		expect(validateResource({ ...resource, fileId: "file-1" })).toContain(
			"link or upload",
		);
		expect(validateResource({ ...resource, url: undefined })).toContain(
			"link or upload",
		);
		expect(
			validateResource({ ...resource, url: undefined, fileId: "file-1" }),
		).toBeUndefined();
	});
	test("rejects script URLs, unsafe protocols and embedded credentials", () => {
		for (const url of [
			"javascript:alert(1)",
			"data:text/html,<script>bad</script>",
			"file:///private/file",
			"http://example.com",
			"https://user:password@example.com",
		])
			expect(resourceUrl(url)).toBeUndefined();
		expect(resourceUrl("https://example.com/watch?v=1")).toBe(
			"https://example.com/watch?v=1",
		);
	});
	test("requires an audience for private player clips and bounds metadata", () => {
		expect(validateResource({ ...resource, personIds: [] })).toContain(
			"Choose the players",
		);
		expect(
			validateResource({ ...resource, personIds: ["sam", "sam"] }),
		).toContain("only once");
		expect(validateResource({ ...resource, title: " " })).toContain("title");
		expect(
			validateResource({
				...resource,
				title: "a".repeat(resourceLimits.title + 1),
			}),
		).toContain("title");
		expect(
			validateResource({
				...resource,
				description: "a".repeat(resourceLimits.description + 1),
			}),
		).toContain("description");
	});
	test("comment submission validates once against bounded plain text", () => {
		expect(validateResourceComment(" ")).toBeDefined();
		expect(validateResourceComment("Useful passing lane")).toBeUndefined();
		expect(
			validateResourceComment("a".repeat(resourceLimits.comment + 1)),
		).toBeDefined();
	});
	test("file signatures accept supported documents and reject active web content", () => {
		expect(documentMime(new TextEncoder().encode("%PDF-1.7"))).toBe(
			"application/pdf",
		);
		expect(
			documentMime(
				new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
			),
		).toBe("image/png");
		expect(documentMime(new Uint8Array([0xff, 0xd8, 0xff, 0x00]))).toBe(
			"image/jpeg",
		);
		expect(documentMime(new TextEncoder().encode("RIFF1234WEBP"))).toBe(
			"image/webp",
		);
		expect(
			documentMime(new TextEncoder().encode("<html>not a document</html>")),
		).toBeUndefined();
		expect(
			documentMime(
				new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'>"),
			),
		).toBeUndefined();
	});
	test("filters combine type, player, search and archive state", () => {
		expect(
			resourceMatches(resource, {
				kind: "video",
				personId: "sam",
				search: "PASSING",
				archived: false,
			}),
		).toBe(true);
		expect(
			resourceMatches(resource, {
				kind: "document",
				search: "",
				archived: false,
			}),
		).toBe(false);
		expect(
			resourceMatches(resource, {
				kind: "all",
				personId: "mila",
				search: "",
				archived: false,
			}),
		).toBe(false);
		expect(
			resourceMatches(resource, { kind: "all", search: "", archived: true }),
		).toBe(false);
	});
});

test("binary media signatures are purpose-specific and bounded", (): void => {
	const bytes = (value: string): Uint8Array => new TextEncoder().encode(value);
	expect(resourceMediaMime(bytes("0000ftypisom0000"), "video")).toBe(
		"video/mp4",
	);
	expect(resourceMediaMime(bytes("0000ftypqt  0000"), "video")).toBe(
		"video/quicktime",
	);
	expect(resourceMediaMime(bytes("0000ftypM4A 0000"), "voice")).toBe(
		"audio/mp4",
	);
	expect(
		resourceMediaMime(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]), "video"),
	).toBe("video/webm");
	expect(
		resourceMediaMime(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]), "voice"),
	).toBe("audio/webm");
	expect(resourceMediaMime(bytes("RIFF0000WAVE"), "voice")).toBe("audio/wav");
	expect(resourceMediaMime(bytes("ID3audio"), "voice")).toBe("audio/mpeg");
	expect(resourceMediaMime(bytes("OggSaudio"), "voice")).toBe("audio/ogg");
	expect(resourceMediaMime(bytes("%PDF-1.7"), "thumbnail")).toBeUndefined();
	expect(
		resourceMediaMime(bytes("<html>video</html>"), "video", "video/mp4"),
	).toBeUndefined();
	expect(
		resourceMediaMime(bytes("0000ftypisom0000"), "document"),
	).toBeUndefined();
	expect(resourceFileLimit("video")).toBe(50 * 1024 * 1024);
	expect(resourceFileLimit("thumbnail")).toBe(2 * 1024 * 1024);
});

test("document categories and video annotation metadata validate and filter consistently", (): void => {
	const document: Resource = {
		...resource,
		kind: "document",
		category: "drills",
	};
	expect(
		resourceMatches(document, {
			kind: "document",
			category: "drills",
			search: "",
			archived: false,
		}),
	).toBe(true);
	expect(
		resourceMatches(document, {
			kind: "all",
			category: "rules",
			search: "",
			archived: false,
		}),
	).toBe(false);
	expect(
		resourceMatches(
			{ ...document, category: undefined },
			{ kind: "document", category: "other", search: "", archived: false },
		),
	).toBe(true);
	expect(validateResource({ ...document, voiceFileId: "voice" })).toContain(
		"video clips",
	);
	expect(validateResource({ ...resource, sessionNumber: 1.5 })).toContain(
		"session number",
	);
	expect(
		validateResource({
			...resource,
			thumbnailFileId: "image",
			voiceFileId: "voice",
			sessionNumber: 3,
			voiceTranscript: "Keep supporting the puck.",
		}),
	).toBeUndefined();
	expect(
		validateResource({
			...resource,
			thumbnailFileId: "same",
			voiceFileId: "same",
		}),
	).toContain("separate file");
	expect(
		sameResourceDraft(resource, {
			...resource,
			voiceTranscript: "Different note",
		}),
	).toBe(false);
});

test("authenticated media range requests support seeking and reject malformed ranges", (): void => {
	expect(resourceByteRange(null, 100)).toBeUndefined();
	expect(resourceByteRange("bytes=0-9", 100)).toEqual({ start: 0, end: 9 });
	expect(resourceByteRange("bytes=50-", 100)).toEqual({ start: 50, end: 99 });
	expect(resourceByteRange("bytes=-20", 100)).toEqual({ start: 80, end: 99 });
	expect(resourceByteRange("bytes=90-999", 100)).toEqual({
		start: 90,
		end: 99,
	});
	for (const value of [
		"bytes=100-",
		"bytes=10-1",
		"bytes=0-1,3-4",
		"bytes=-",
		"items=1-2",
		"bytes=-0",
	])
		expect(() => resourceByteRange(value, 100)).toThrow();
});

test("YouTube thumbnails only derive from supported HTTPS video URLs", (): void => {
	expect(youtubeThumbnail("https://youtu.be/dQw4w9WgXcQ")).toBe(
		"https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
	);
	expect(
		youtubeThumbnail("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
	).toContain("/dQw4w9WgXcQ/");
	expect(
		youtubeThumbnail("https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ"),
	).toBeUndefined();
	expect(
		youtubeThumbnail("javascript:youtube.com/watch?v=dQw4w9WgXcQ"),
	).toBeUndefined();
});

test("program audiences follow only active self or verified guardian memberships", (): void => {
	const scoped: Resource = {
		...resource,
		audience: "programs",
		personIds: [],
		programIds: ["youth"],
	};
	const members = [
		{ id: "sam", programs: ["youth"] },
		{ id: "mila", archived: true, programs: ["archived-program"] },
		{ id: "other", programs: ["unrelated"] },
	];
	expect(resourceHouseholdPrograms(guardian, members)).toEqual(["youth"]);
	expect(
		resourceHouseholdPrograms({ ...guardian, children: [] }, members),
	).toEqual([]);
	expect(
		canReadResource(
			{ ...guardian, programIds: resourceHouseholdPrograms(guardian, members) },
			scoped,
		),
	).toBe(true);
	expect(canReadResource({ ...guardian, programIds: [] }, scoped)).toBe(false);
	expect(
		canReadResource(
			{ ...guardian, clubId: "other", programIds: ["youth"] },
			scoped,
		),
	).toBe(false);
	expect(canReadResource(admin, scoped)).toBe(true);
	expect(canReadResource(coach, scoped)).toBe(true);
	expect(validateResource({ ...scoped, programIds: [] })).toContain(
		"Choose the programs",
	);
	expect(
		validateResource({ ...scoped, programIds: ["youth", "youth"] }),
	).toContain("each program once");
	expect(validateResource({ ...scoped, audience: "club" })).toContain(
		"program selections",
	);
});

test("resource upload date survives edits, archive and legacy updates", () => {
	const uploaded = resourceTimestamps(undefined, 100);
	const edited = resourceTimestamps(uploaded, 200);
	const archived = resourceTimestamps(edited, 300);
	const restored = resourceTimestamps(archived, 400);
	expect(uploaded).toEqual({ createdAt: 100, updatedAt: 100 });
	expect(restored).toEqual({ createdAt: 100, updatedAt: 400 });
	const legacyEdited = resourceTimestamps({ updatedAt: 50 }, 200);
	expect(resourceTimestamps(legacyEdited, 300)).toEqual({
		createdAt: 50,
		updatedAt: 300,
	});
});

test("resource links require supported media rather than generic websites", () => {
	expect(
		validateResource({ ...resource, url: "https://example.com/" }),
	).toContain("YouTube or Vimeo");
	expect(
		validateResource({
			...resource,
			url: "https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ",
		}),
	).toContain("YouTube or Vimeo");
	expect(
		validateResource({
			...resource,
			kind: "document",
			url: "https://example.com/rules.pdf?version=2",
		}),
	).toBeUndefined();
	expect(
		validateResource({
			...resource,
			kind: "document",
			url: "https://example.com/rules",
		}),
	).toContain("direct PDF");
	expect(
		validateResource({ ...resource, url: "https://vimeo.com/123456789" }),
	).toBeUndefined();
});

test("document links are previewable while Office documents require upload", () => {
	expect(
		validateResource({
			...resource,
			kind: "document",
			url: "https://example.com/file.docx",
		}),
	).toContain("direct PDF");
	expect(
		validateResource({
			...resource,
			kind: "document",
			url: "https://example.com/image.png",
		}),
	).toBeUndefined();
	expect(
		validateResource({
			...resource,
			kind: "document",
			url: undefined,
			fileId: "uploaded-office-file",
		}),
	).toBeUndefined();
});
