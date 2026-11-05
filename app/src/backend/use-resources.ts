import { useAuthToken } from "@convex-dev/auth/react";
import {
	type RequestForQueries,
	useMutation,
	usePaginatedQuery,
	useQueries,
} from "convex/react";
import { atom, useAtom } from "jotai";
import { useMemo, useState } from "react";
import { Linking } from "react-native";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { newId, useApp } from "../demo/app-state";
import { previewResources } from "../demo/resource-state";
import { openDocument } from "../design-system";
import { clubPrograms } from "../domain/programs";
import {
	canManageResources,
	canReadResource,
	type Resource,
	type ResourceComment,
	type ResourceDraft,
	type ResourceFile,
	type ResourceFilePurpose,
	type ResourceFileSlot,
	type ResourceFilters,
	resourceFileIds,
	resourceFileLimit,
	resourceHouseholdPrograms,
	resourceMatches,
	resourceMediaMime,
	resourceSlotFileId,
	resourceTimestamps,
	resourceUrl,
	sameResourceDraft,
	validateResource,
	validateResourceComment,
} from "../domain/resources";
import { readImageBytes } from "./image-bytes";
import { useYoutubeUploads, type YoutubeUploader } from "./use-youtube-uploads";

type Detail = {
	resource: Resource;
	comments: ResourceComment[];
	limited: boolean;
};
export type ResourceState = {
	youtube?: YoutubeUploader;
	items: Resource[];
	loading: boolean;
	loadingMore: boolean;
	loadMore?: () => void;
	detail?: Detail;
	detailError?: string;
	save: (
		draft: ResourceDraft,
		key: string,
		previous?: Resource,
	) => Promise<string>;
	archive: (resource: Resource, archived: boolean) => Promise<void>;
	comment: (id: string, body: string, key: string) => Promise<void>;
	removeComment: (id: string) => Promise<void>;
	upload: (
		blob: Blob,
		name: string,
		purpose?: ResourceFilePurpose,
	) => Promise<ResourceFile>;
	read: (
		resource: Resource,
		slot: ResourceFileSlot,
	) => Promise<{ blob: Blob; name: string; mime: string }>;
	open: (resource: Resource) => Promise<void>;
};
const site =
	process.env.EXPO_PUBLIC_CONVEX_SITE_URL ??
	process.env.EXPO_PUBLIC_CONVEX_URL?.replace(
		".convex.cloud",
		".convex.site",
	).replace(":3210", ":3211");
const requestFile = async (
	token: string | undefined,
	params: Record<string, string>,
	options: RequestInit = {},
): Promise<Response> => {
	if (!token || !site) throw new Error("Sign in to use document storage.");
	const response = await fetch(
		`${site}/resources/file?${new URLSearchParams(params)}`,
		{
			...options,
			headers: { ...options.headers, Authorization: `Bearer ${token}` },
		},
	);
	if (!response.ok) {
		const payload: { error?: string } = await response.json();
		throw new Error(payload.error ?? "Could not open this document.");
	}
	return response;
};
const openLink = async (resource: Resource): Promise<void> => {
	const url = resource.url ? resourceUrl(resource.url) : undefined;
	if (!url) throw new Error("This resource has no valid link.");
	await Linking.openURL(url);
};
export const useLiveResources = (
	filters: ResourceFilters,
	id?: string,
	options: { optionalDetail?: boolean } = {},
): ResourceState => {
	const token = useAuthToken() ?? undefined;
	const youtube = useYoutubeUploads(token);
	const list = usePaginatedQuery(
		api.resources.list,
		id
			? "skip"
			: {
					...filters,
					kind: filters.kind === "all" ? undefined : filters.kind,
					category: filters.category === "all" ? undefined : filters.category,
				},
		{ initialNumItems: 25 },
	);
	const optionalQueries = useMemo((): RequestForQueries => {
		if (!id) return {};
		return {
			resource: {
				query: api.resources.details,
				args: { id: id as Id<"resources"> },
			},
		};
	}, [id]);
	const optional: { resource?: Detail | Error } = useQueries(optionalQueries);
	const optionalDetail = optional.resource;
	const detailError =
		optionalDetail instanceof Error
			? options.optionalDetail
				? "This attachment is unavailable or you don’t have access."
				: "This resource was removed, blocked, or is no longer available."
			: undefined;
	const save = useMutation(api.resources.save);
	const archive = useMutation(api.resources.archive);
	const comment = useMutation(api.resources.comment);
	const removeComment = useMutation(api.resources.removeComment);
	return {
		youtube,
		items: list.results,
		loading: id
			? optionalDetail === undefined
			: list.status === "LoadingFirstPage",
		loadingMore: list.status === "LoadingMore",
		loadMore:
			list.status === "CanLoadMore" ? (): void => list.loadMore(25) : undefined,
		detail: optionalDetail instanceof Error ? undefined : optionalDetail,
		detailError,
		save: async (draft, key, previous): Promise<string> =>
			save({
				...draft,
				fileId: draft.fileId
					? (draft.fileId as Id<"resourceFiles">)
					: undefined,
				thumbnailFileId: draft.thumbnailFileId
					? (draft.thumbnailFileId as Id<"resourceFiles">)
					: undefined,
				voiceFileId: draft.voiceFileId
					? (draft.voiceFileId as Id<"resourceFiles">)
					: undefined,
				id: previous?.id ? (previous.id as Id<"resources">) : undefined,
				key,
				revision: previous?.revision ?? 0,
			}),
		archive: async (resource, archived): Promise<void> => {
			await archive({
				id: resource.id as Id<"resources">,
				revision: resource.revision,
				archived,
			});
		},
		comment: async (resourceId, body, key): Promise<void> => {
			await comment({ id: resourceId as Id<"resources">, body, key });
		},
		removeComment: async (commentId): Promise<void> => {
			await removeComment({ id: commentId as Id<"resourceComments"> });
		},
		upload: async (blob, name, purpose = "document"): Promise<ResourceFile> =>
			(
				await requestFile(
					token,
					{ name, purpose },
					{
						method: "POST",
						body: blob,
						headers: { "Content-Type": blob.type },
					},
				)
			).json(),
		read: async (
			resource,
			slot,
		): Promise<{ blob: Blob; name: string; mime: string }> => {
			const response = await requestFile(token, { id: resource.id, slot });
			const blob = await response.blob();
			const mime = response.headers.get("Content-Type") ?? blob.type;
			return {
				blob,
				name:
					slot === "primary"
						? (resource.fileName ?? "media")
						: slot === "thumbnail"
							? "thumbnail.jpg"
							: "voice-note.m4a",
				mime,
			};
		},
		open: async (resource): Promise<void> => {
			if (resource.url) return openLink(resource);
			const response = await requestFile(token, { id: resource.id });
			const blob = await response.blob();
			await openDocument(
				await readImageBytes(blob),
				resource.fileName ?? "document.pdf",
				blob.type,
			);
		},
	};
};
export { previewResources } from "../demo/resource-state";

const previewComments = atom<Record<string, ResourceComment[]>>({});
type PreviewResourceFile = { blob: Blob; file: ResourceFile; ownerId: string };
const previewFiles = new Map<string, PreviewResourceFile>();
const pendingPreviewFiles = new Map<string, Promise<PreviewResourceFile>>();
const previewFile = async (
	id: string,
): Promise<PreviewResourceFile | undefined> => {
	const existing = previewFiles.get(id);
	if (existing) return existing;
	const purpose =
		id === "demo-document-file"
			? "document"
			: id === "demo-video-file"
				? "video"
				: id === "demo-voice-file"
					? "voice"
					: id === "demo-thumbnail-file"
						? "thumbnail"
						: undefined;
	if (!purpose) return undefined;
	const pending = pendingPreviewFiles.get(id);
	if (pending) return pending;
	const load = async (): Promise<PreviewResourceFile> => {
		const { resourceDemoMedia, loadResourceDemoBlob } = await import(
			"../demo/resource-media-fixtures"
		);
		const media = resourceDemoMedia[purpose];
		const blob = await loadResourceDemoBlob(purpose);
		const entry: PreviewResourceFile = {
			blob,
			file: {
				id,
				name: media.name,
				mime: media.mime,
				size: blob.size,
				purpose,
			},
			ownerId: "alex",
		};
		previewFiles.set(id, entry);
		return entry;
	};
	const loading = load().finally((): void => {
		pendingPreviewFiles.delete(id);
	});
	pendingPreviewFiles.set(id, loading);
	return loading;
};
export const usePreviewResources = (
	filters: ResourceFilters,
	id?: string,
): ResourceState => {
	const { account, data } = useApp();
	const actor = {
		...account,
		clubId: "preview",
		programIds: resourceHouseholdPrograms(account, data.members),
	};
	const [resources, setResources] = useAtom(previewResources);
	const [comments, setComments] = useAtom(previewComments);
	const [visibleCount, setVisibleCount] = useState(25);
	const items = resources
		.map((resource) => ({
			...resource,
			personNames: Object.fromEntries(
				resource.personIds.map((id) => [
					id,
					data.members.find((person) => person.id === id)?.name ??
						"Former player",
				]),
			),
		}))
		.filter(
			(resource) =>
				canReadResource(actor, resource) && resourceMatches(resource, filters),
		)
		.sort((a, b) => b.updatedAt - a.updatedAt);
	const selected = resources.find(
		(resource) => resource.id === id && canReadResource(actor, resource),
	);
	const editable = (): void => {
		if (!canManageResources(actor))
			throw new Error("Coach or admin access required.");
	};
	const readable = (resourceId: string): Resource => {
		const resource = resources.find(
			(entry) => entry.id === resourceId && canReadResource(actor, entry),
		);
		if (!resource) throw new Error("Resource unavailable.");
		return resource;
	};
	return {
		items: items.slice(0, visibleCount),
		loading: false,
		loadingMore: false,
		loadMore:
			items.length > visibleCount
				? (): void => setVisibleCount((count) => count + 25)
				: undefined,
		detail: selected
			? {
					resource: selected,
					comments: (comments[selected.id] ?? []).slice(-100).slice().reverse(),
					limited: (comments[selected.id]?.length ?? 0) > 100,
				}
			: undefined,
		save: async (draft, key, previous): Promise<string> => {
			editable();
			const error = validateResource(draft);
			if (error) throw new Error(error);
			if (
				draft.personIds.some(
					(personId) =>
						!data.members.some(
							(member) =>
								member.id === personId &&
								!member.archived &&
								!member.mergedInto &&
								member.programs.length,
						),
				)
			)
				throw new Error("A tagged player is unavailable.");
			const duplicate = !previous
				? resources.find((entry) => entry.id === key)
				: undefined;
			if (duplicate) {
				if (!sameResourceDraft(duplicate, draft))
					throw new Error(
						"This resource retry changed. Submit it with a new request.",
					);
				return duplicate.id;
			}
			const current = previous ? readable(previous.id) : undefined;
			if (current && previous?.revision !== current.revision)
				throw new Error("This resource changed. Reopen it before saving.");
			if (
				draft.audience === "programs" &&
				draft.programIds?.some(
					(id) =>
						!clubPrograms(data).some(
							(program) =>
								program.id === id &&
								((!program.archived && program.status !== "completed") ||
									current?.programIds?.includes(id)),
						),
				)
			)
				throw new Error("Choose active programs from this club.");
			for (const { id: fileId, purpose } of [
				{ id: draft.fileId, purpose: draft.kind },
				{ id: draft.thumbnailFileId, purpose: "thumbnail" },
				{ id: draft.voiceFileId, purpose: "voice" },
			]) {
				if (!fileId) continue;
				const file = await previewFile(fileId);
				if (
					!file ||
					file.file.purpose !== purpose ||
					(file.ownerId !== account.id &&
						(!current || !resourceFileIds(current).includes(fileId))) ||
					resources.some(
						(entry) =>
							entry.id !== current?.id &&
							resourceFileIds(entry).includes(fileId),
					)
				)
					throw new Error("Upload that media file again before saving.");
			}
			const resource: Resource = {
				...draft,
				title: draft.title.trim(),
				description: draft.description.trim(),
				id: previous?.id ?? key,
				clubId: "preview",
				revision: (current?.revision ?? 0) + 1,
				...resourceTimestamps(current, Date.now()),
				archived: current?.archived ?? false,
				category:
					draft.kind === "document" ? (draft.category ?? "other") : undefined,
				fileName: draft.fileId
					? (await previewFile(draft.fileId))?.file.name
					: undefined,
				fileMime: draft.fileId
					? (await previewFile(draft.fileId))?.file.mime
					: undefined,
			};
			for (const oldId of current
				? resourceFileIds(current).filter(
						(id) => !resourceFileIds(draft).includes(id),
					)
				: [])
				previewFiles.delete(oldId);
			setResources((rows) => [
				...rows.filter((row) => row.id !== resource.id),
				resource,
			]);
			return resource.id;
		},
		archive: async (resource, archived): Promise<void> => {
			editable();
			const current = readable(resource.id);
			if (current.revision !== resource.revision)
				throw new Error("This resource changed. Reopen it before saving.");
			setResources((rows) =>
				rows.map((row) =>
					row.id === resource.id
						? {
								...row,
								archived,
								revision: row.revision + 1,
								...resourceTimestamps(row, Date.now()),
							}
						: row,
				),
			);
		},
		comment: async (resourceId, body, key): Promise<void> => {
			const resource = readable(resourceId);
			if (resource.archived)
				throw new Error("Restore this resource before adding a comment.");
			const error = validateResourceComment(body);
			if (error) throw new Error(error);
			const existing = comments[resourceId]?.find((entry) => entry.id === key);
			if (existing) {
				if (existing.authorId !== account.id || existing.body !== body.trim())
					throw new Error(
						"This comment retry changed. Submit it with a new request.",
					);
				return;
			}
			setComments((current) => ({
				...current,
				[resourceId]: [
					...(current[resourceId] ?? []),
					{
						id: key,
						authorId: account.id,
						authorName: account.name,
						body: body.trim(),
						createdAt: Date.now(),
					},
				],
			}));
		},
		removeComment: async (commentId): Promise<void> => {
			const entry = Object.entries(comments).find(([, rows]) =>
				rows.some((row) => row.id === commentId),
			);
			if (!entry) throw new Error("Comment unavailable.");
			const [resourceId, rows] = entry;
			const comment = rows.find((row) => row.id === commentId);
			if (!comment) throw new Error("Comment unavailable.");
			readable(resourceId);
			if (comment.authorId !== account.id && !canManageResources(actor))
				throw new Error("You can only remove your own comments.");
			setComments((current) => ({
				...current,
				[resourceId]: (current[resourceId] ?? []).filter(
					(row) => row.id !== commentId,
				),
			}));
		},
		upload: async (blob, name, purpose = "document"): Promise<ResourceFile> => {
			editable();
			if (!blob.size || blob.size > resourceFileLimit(purpose))
				throw new Error("This media file is too large.");
			const mime = resourceMediaMime(
				new Uint8Array(await readImageBytes(blob.slice(0, 64))),
				purpose,
				blob.type,
			);
			if (!mime)
				throw new Error(
					"Choose a supported document, image, video or audio file.",
				);
			const fileId = newId();
			const file = { id: fileId, name, mime, size: blob.size, purpose };
			previewFiles.set(fileId, {
				blob: blob.slice(0, blob.size, mime),
				file,
				ownerId: account.id,
			});
			return file;
		},
		read: async (
			resource,
			slot,
		): Promise<{ blob: Blob; name: string; mime: string }> => {
			const current = readable(resource.id);
			const fileId = resourceSlotFileId(current, slot);
			const entry = fileId ? await previewFile(fileId) : undefined;
			if (!entry) throw new Error("This media file is unavailable.");
			return { blob: entry.blob, name: entry.file.name, mime: entry.file.mime };
		},
		open: async (resource): Promise<void> => {
			readable(resource.id);
			if (resource.url) return openLink(resource);
			const file = resource.fileId
				? await previewFile(resource.fileId)
				: undefined;
			if (!file) throw new Error("Document unavailable.");
			await openDocument(
				await readImageBytes(file.blob),
				resource.fileName ?? "document.pdf",
				file.file.mime,
			);
		},
	};
};
