import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import {
	resourceDemoBlob,
	resourceDemoMedia,
} from "../src/demo/resource-media-fixtures";
import { defaultProgramRsvp } from "../src/domain/programs";
import { type ResourceFile, resourceLimits } from "../src/domain/resources";
import {
	createVerificationRun,
	type VerificationFixture as Fixture,
} from "./verification-fixtures";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
const site = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;
if (url !== "http://127.0.0.1:3210" || site !== "http://127.0.0.1:3211")
	throw new Error("Local backend only.");
const verification = createVerificationRun("resources");
const fixture = verification.fixture;
const request = (
	actor: Fixture | undefined,
	params: Record<string, string>,
	options: RequestInit = {},
): Promise<Response> =>
	fetch(`${site}/resources/file?${new URLSearchParams(params)}`, {
		...options,
		headers: {
			...options.headers,
			...(actor ? { Authorization: `Bearer ${actor.token}` } : {}),
		},
	});
try {
	const owner = await fixture("Resource coach");
	await owner.client.mutation(api.club.create, {
		name: "Resources verification",
		samples: true,
	});
	const clubCode = (
		await owner.client.query(api.club.current, { screen: "settings" })
	)?.inviteCode;
	assert(clubCode);
	const guardian = await fixture("Resource guardian");
	await guardian.client.mutation(api.club.requestToJoin, { clubCode });
	const guardianAccount = (await guardian.client.query(api.club.current, {}))
		?.account;
	assert(guardianAccount);
	await owner.client.mutation(api.club.setAccess, {
		accountId: guardianAccount.id,
		children: ["sam"],
		coachPrograms: [],
		admin: false,
	});
	const teammate = await fixture("Resource teammate");
	await teammate.client.mutation(api.club.requestToJoin, { clubCode });
	const outsider = await fixture("Other resource club");
	await outsider.client.mutation(api.club.create, {
		name: "Other resources club",
		samples: false,
	});
	const draft = {
		key: crypto.randomUUID(),
		revision: 0,
		title: "Practice video",
		description: "A private training reference",
		kind: "video" as const,
		audience: "players" as const,
		personIds: ["sam"],
		url: "https://example.com/training",
	};
	const resourceId = await owner.client.mutation(api.resources.save, draft);
	assert.equal(
		await owner.client.mutation(api.resources.save, draft),
		resourceId,
	);
	await assert.rejects(
		owner.client.mutation(api.resources.save, {
			...draft,
			title: "Changed retry",
		}),
	);
	assert.equal(
		(await guardian.client.query(api.resources.details, { id: resourceId }))
			.resource.title,
		draft.title,
	);
	await assert.rejects(
		teammate.client.query(api.resources.details, { id: resourceId }),
	);
	await assert.rejects(
		outsider.client.query(api.resources.details, { id: resourceId }),
	);
	await assert.rejects(
		new ConvexHttpClient(url, { logger: false }).query(api.resources.details, {
			id: resourceId,
		}),
	);
	await assert.rejects(
		guardian.client.mutation(api.resources.save, {
			...draft,
			key: crypto.randomUUID(),
		}),
	);
	await assert.rejects(
		outsider.client.mutation(api.resources.save, {
			...draft,
			id: resourceId,
			revision: 1,
		}),
	);
	await assert.rejects(
		owner.client.mutation(api.resources.save, {
			...draft,
			key: crypto.randomUUID(),
			url: "javascript:alert(1)",
		}),
	);
	await assert.rejects(
		owner.client.mutation(api.resources.save, {
			...draft,
			key: crypto.randomUUID(),
			personIds: ["not-a-member"],
		}),
	);
	const commentsKey = crypto.randomUUID();
	await guardian.client.mutation(api.resources.comment, {
		id: resourceId,
		body: "Can we try this on Monday?",
		key: commentsKey,
	});
	await assert.rejects(
		guardian.client.mutation(api.resources.comment, {
			id: resourceId,
			body: "Actually, Tuesday?",
			key: commentsKey,
		}),
	);
	await guardian.client.mutation(api.resources.comment, {
		id: resourceId,
		body: "Can we try this on Monday?",
		key: commentsKey,
	});
	const comment = (
		await owner.client.query(api.resources.details, { id: resourceId })
	).comments.at(0);
	assert(comment);
	assert.equal(
		(await owner.client.query(api.resources.details, { id: resourceId }))
			.comments.length,
		1,
	);
	await assert.rejects(
		teammate.client.mutation(api.resources.comment, {
			id: resourceId,
			body: "Unrelated",
			key: crypto.randomUUID(),
		}),
	);
	await assert.rejects(
		teammate.client.mutation(api.resources.removeComment, {
			id: comment.id as Id<"resourceComments">,
		}),
	);
	await guardian.client.mutation(api.resources.removeComment, {
		id: comment.id as Id<"resourceComments">,
	});
	await owner.client.mutation(api.resources.archive, {
		id: resourceId,
		revision: 1,
		archived: true,
	});
	await assert.rejects(
		guardian.client.mutation(api.resources.comment, {
			id: resourceId,
			body: "Archived",
			key: crypto.randomUUID(),
		}),
	);
	await assert.rejects(
		owner.client.mutation(api.resources.archive, {
			id: resourceId,
			revision: 1,
			archived: false,
		}),
	);
	await owner.client.mutation(api.resources.archive, {
		id: resourceId,
		revision: 2,
		archived: false,
	});
	await assert.rejects(
		owner.client.mutation(api.resources.save, {
			...draft,
			id: resourceId,
			revision: 1,
		}),
	);
	const coachesId = await owner.client.mutation(api.resources.save, {
		...draft,
		key: crypto.randomUUID(),
		audience: "coaches",
		personIds: [],
	});
	await assert.rejects(
		guardian.client.query(api.resources.details, { id: coachesId }),
	);
	const publicId = await owner.client.mutation(api.resources.save, {
		...draft,
		key: crypto.randomUUID(),
		audience: "club",
		personIds: [],
	});
	assert.equal(
		(await teammate.client.query(api.resources.details, { id: publicId }))
			.resource.id,
		publicId,
	);
	const list = await guardian.client.query(api.resources.list, {
		search: "",
		archived: false,
		paginationOpts: { cursor: null, numItems: 25 },
	});
	assert(list.page.some((entry) => entry.id === resourceId));
	assert(!list.page.some((entry) => entry.id === coachesId));
	const pdf = new Blob(["%PDF-1.7\nResource verification\n%%EOF"], {
		type: "application/pdf",
	});
	assert.equal(
		(
			await request(
				undefined,
				{ name: "rules.pdf" },
				{ method: "POST", body: pdf },
			)
		).status,
		401,
	);
	assert.equal(
		(
			await request(
				guardian,
				{ name: "rules.pdf" },
				{ method: "POST", body: pdf },
			)
		).status,
		403,
	);
	assert.equal(
		(
			await request(
				owner,
				{ name: "bad.html" },
				{
					method: "POST",
					body: new Blob(["<html>not a PDF</html>"], {
						type: "application/pdf",
					}),
				},
			)
		).status,
		415,
	);
	const uploaded = await request(
		owner,
		{ name: "rules.pdf" },
		{ method: "POST", body: pdf },
	);
	assert.equal(uploaded.status, 200);
	const file: ResourceFile = await uploaded.json();
	const documentId = await owner.client.mutation(api.resources.save, {
		...draft,
		key: crypto.randomUUID(),
		kind: "document",
		url: undefined,
		fileId: file.id as Id<"resourceFiles">,
	});
	assert.equal((await request(undefined, { id: documentId })).status, 401);
	assert.equal((await request(outsider, { id: documentId })).status, 404);
	assert.equal((await request(teammate, { id: documentId })).status, 404);
	const downloaded = await request(guardian, { id: documentId });
	assert.equal(downloaded.status, 200);
	assert.equal(downloaded.headers.get("content-type"), "application/pdf");
	assert.equal(downloaded.headers.get("cache-control"), "private, no-store");
	assert.equal(await downloaded.text(), await pdf.text());
	await owner.client.mutation(api.resources.save, {
		...draft,
		key: crypto.randomUUID(),
		id: documentId,
		revision: 1,
		kind: "document",
		url: undefined,
		fileId: file.id as Id<"resourceFiles">,
		category: "rules",
	});
	assert(
		(
			await guardian.client.query(api.resources.list, {
				search: "",
				archived: false,
				category: "rules",
				paginationOpts: { cursor: null, numItems: 25 },
			})
		).page.some((entry) => entry.id === documentId),
	);
	assert(
		!(
			await guardian.client.query(api.resources.list, {
				search: "",
				archived: false,
				category: "drills",
				paginationOpts: { cursor: null, numItems: 25 },
			})
		).page.some((entry) => entry.id === documentId),
	);
	const uploadMedia = async (
		purpose: "video" | "thumbnail" | "voice",
	): Promise<ResourceFile> => {
		const response = await request(
			owner,
			{ name: resourceDemoMedia[purpose].name, purpose },
			{
				method: "POST",
				body: resourceDemoBlob(purpose),
				headers: { "Content-Type": resourceDemoMedia[purpose].mime },
			},
		);
		assert.equal(response.status, 200, await response.clone().text());
		return response.json();
	};
	const [videoFile, thumbnailFile, voiceFile] = await Promise.all([
		uploadMedia("video"),
		uploadMedia("thumbnail"),
		uploadMedia("voice"),
	]);
	const videoDraft = {
		...draft,
		title: "Private uploaded video",
		key: crypto.randomUUID(),
		url: undefined,
		fileId: videoFile.id as Id<"resourceFiles">,
		thumbnailFileId: thumbnailFile.id as Id<"resourceFiles">,
		voiceFileId: voiceFile.id as Id<"resourceFiles">,
		sessionNumber: 3,
		voiceTranscript: "Demo audio playback verification.",
	};
	const videoId = await owner.client.mutation(api.resources.save, videoDraft);
	const videoDetail = await guardian.client.query(api.resources.details, {
		id: videoId,
	});
	if (process.env.VERIFY_LARGE_MEDIA === "1") {
		const sample = resourceDemoBlob("video");
		const target = resourceLimits.videoBytes - 1024;
		const freeSize = target - sample.size;
		const header = new Uint8Array(8);
		new DataView(header.buffer).setUint32(0, freeSize);
		header.set(new TextEncoder().encode("free"), 4);
		const large = new Blob([sample, header, new Uint8Array(freeSize - 8)], {
			type: "video/mp4",
		});
		const response = await request(
			owner,
			{ name: "near-limit.mp4", purpose: "video" },
			{ method: "POST", body: large, headers: { "Content-Type": "video/mp4" } },
		);
		assert.equal(response.status, 200, await response.clone().text());
		const largeFile: ResourceFile = await response.json();
		assert.equal(largeFile.size, target);
		const largeId = await owner.client.mutation(api.resources.save, {
			...draft,
			key: crypto.randomUUID(),
			url: undefined,
			fileId: largeFile.id as Id<"resourceFiles">,
		});
		const range = await request(
			guardian,
			{ id: largeId },
			{ headers: { Range: `bytes=${target - 64}-` } },
		);
		assert.equal(range.status, 206);
		assert.equal((await range.arrayBuffer()).byteLength, 64);
		assert.equal(
			range.headers.get("content-range"),
			`bytes ${target - 64}-${target - 1}/${target}`,
		);
		console.log(
			`Near-limit resource video verified: ${target} raw bytes uploaded; authenticated suffix seek returned64 bytes.`,
		);
	}
	assert.equal(videoDetail.resource.sessionNumber, 3);
	assert.equal(
		videoDetail.resource.voiceTranscript,
		videoDraft.voiceTranscript,
	);
	assert(!JSON.stringify(videoDetail).includes("storageId"));
	for (const slot of ["primary", "thumbnail", "voice"] as const) {
		const purpose = slot === "primary" ? "video" : slot;
		assert.equal((await request(undefined, { id: videoId, slot })).status, 401);
		assert.equal((await request(outsider, { id: videoId, slot })).status, 404);
		assert.equal((await request(teammate, { id: videoId, slot })).status, 404);
		const response = await request(guardian, { id: videoId, slot });
		assert.equal(response.status, 200);
		assert.equal(
			response.headers.get("content-type"),
			resourceDemoMedia[purpose].mime,
		);
		assert.equal(response.headers.get("cache-control"), "private, no-store");
		assert.match(response.headers.get("content-disposition") ?? "", /^inline;/);
		assert.deepEqual(
			new Uint8Array(await response.arrayBuffer()),
			new Uint8Array(await resourceDemoBlob(purpose).arrayBuffer()),
		);
	}
	const range = await request(
		guardian,
		{ id: videoId },
		{ headers: { Range: "bytes=0-15" } },
	);
	assert.equal(range.status, 206);
	assert.equal(
		range.headers.get("content-range"),
		`bytes 0-15/${resourceDemoBlob("video").size}`,
	);
	assert.equal((await range.arrayBuffer()).byteLength, 16);
	assert.equal(
		(
			await request(
				guardian,
				{ id: videoId },
				{ headers: { Range: "bytes=999999-" } },
			)
		).status,
		416,
	);
	await assert.rejects(
		owner.client.mutation(api.resources.save, {
			...videoDraft,
			key: crypto.randomUUID(),
			fileId: thumbnailFile.id as Id<"resourceFiles">,
			thumbnailFileId: undefined,
		}),
	);
	await assert.rejects(
		owner.client.mutation(api.resources.save, {
			...videoDraft,
			key: crypto.randomUUID(),
		}),
	);
	assert.equal(
		(
			await request(
				owner,
				{ purpose: "video", name: "fake.mp4" },
				{
					method: "POST",
					body: new Blob(["<html>not video</html>"], { type: "video/mp4" }),
				},
			)
		).status,
		415,
	);
	assert.equal(
		(
			await request(
				owner,
				{ purpose: "thumbnail", name: "too-large.jpg" },
				{
					method: "POST",
					body: new Blob([new Uint8Array(2 * 1024 * 1024 + 1)], {
						type: "image/jpeg",
					}),
				},
			)
		).status,
		413,
	);
	const replacementVoice = await uploadMedia("voice");
	await owner.client.mutation(api.resources.save, {
		...videoDraft,
		id: videoId,
		revision: 1,
		voiceFileId: replacementVoice.id as Id<"resourceFiles">,
	});
	await assert.rejects(
		owner.client.mutation(api.resources.save, {
			...videoDraft,
			id: videoId,
			revision: 2,
		}),
	);
	await owner.client.mutation(api.club.setAccess, {
		accountId: guardianAccount.id,
		children: [],
		coachPrograms: [],
		admin: false,
	});
	for (const slot of ["primary", "thumbnail", "voice"])
		assert.equal((await request(guardian, { id: videoId, slot })).status, 404);
	await assert.rejects(
		guardian.client.query(api.resources.details, { id: videoId }),
	);
	await owner.client.mutation(api.club.setAccess, {
		accountId: guardianAccount.id,
		children: ["sam"],
		coachPrograms: [],
		admin: false,
	});
	const program = {
		id: `resource-program-${crypto.randomUUID()}`,
		name: "Resource audience verification",
		archived: false,
		status: "active" as const,
		kind: "hockey" as const,
		rsvp: defaultProgramRsvp(),
	};
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "save-program",
			draft: program,
			expectedRevision: 0,
			memberIds: ["sam"],
		},
	});
	const programVideo = await uploadMedia("video");
	const programDraft = {
		...draft,
		key: crypto.randomUUID(),
		audience: "programs" as const,
		personIds: [],
		programIds: [program.id],
		url: undefined,
		fileId: programVideo.id as Id<"resourceFiles">,
	};
	const programResourceId = await owner.client.mutation(
		api.resources.save,
		programDraft,
	);
	assert.equal(
		(await request(guardian, { id: programResourceId })).status,
		200,
	);
	assert.equal(
		(await request(teammate, { id: programResourceId })).status,
		404,
	);
	await assert.rejects(
		owner.client.mutation(api.resources.save, {
			...programDraft,
			key: crypto.randomUUID(),
			url: draft.url,
			fileId: undefined,
			programIds: ["not-a-program"],
		}),
	);
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "save-program",
			draft: { ...program, archived: true },
			expectedRevision: 1,
			memberIds: ["sam"],
		},
	});
	assert.equal(
		(await request(guardian, { id: programResourceId })).status,
		200,
		"Archiving a program preserves historical resource access.",
	);
	await owner.client.mutation(api.resources.save, {
		...programDraft,
		id: programResourceId,
		revision: 1,
	});
	await assert.rejects(
		owner.client.mutation(api.resources.save, {
			...programDraft,
			key: crypto.randomUUID(),
			url: draft.url,
			fileId: undefined,
		}),
	);
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "save-program",
			draft: program,
			expectedRevision: 2,
			memberIds: [],
		},
	});
	assert.equal(
		(await request(guardian, { id: programResourceId })).status,
		404,
		"Removing the household's program membership revokes media access.",
	);
	await assert.rejects(
		guardian.client.query(api.resources.details, { id: programResourceId }),
	);
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "save-program",
			draft: program,
			expectedRevision: 3,
			memberIds: ["sam"],
		},
	});
	assert.equal(
		(await request(guardian, { id: programResourceId })).status,
		200,
	);
	await owner.client.mutation(api.club.apply, {
		action: { type: "set-member-archived", personId: "sam", archived: true },
	});
	assert.equal(
		(await request(guardian, { id: programResourceId })).status,
		404,
		"Archived household profiles do not grant program access.",
	);
	console.log(
		"Resources checks passed: links/documents, binary video/thumbnail/voice upload and private bytes, seek ranges, signatures/size/slot ownership, category filters, program and guardian revocation, archived-program history, retry deduplication, archive/restore and stale-write protection.",
	);
} finally {
	await verification.close();
}
