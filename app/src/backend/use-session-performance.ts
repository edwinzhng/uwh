import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useAtomValue, useSetAtom } from "jotai";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { previewDataAtom, useApp } from "../demo/app-state";
import {
	previewPerformanceReportCommand,
	previewSessionPerformanceAtom,
	previewSessionPerformanceCommand,
} from "../demo/session-performance-state";
import {
	canEditSessionPerformance,
	canReadSessionPerformance,
	canReportSessionPerformance,
	type PerformanceSession,
	performanceSession,
	performanceSessionEligible,
	type SessionPerformanceCommand,
	type SessionPerformanceEntry,
	type SessionPerformanceKind,
	sessionPerformanceAuthorKey,
	sessionPerformanceHistory,
} from "../domain/session-performance";

export type SessionPerformanceService = {
	entries: SessionPerformanceEntry[];
	loading: boolean;
	canLoadMore: boolean;
	loadingMore: boolean;
	loadMore: () => void;
	save: (command: SessionPerformanceCommand) => Promise<string>;
	report: (id: string, revision: number, reason: string) => Promise<void>;
};
export type PerformanceEditorService = {
	sessions: PerformanceSession[];
	loading: boolean;
	current?: SessionPerformanceEntry;
	loadingCurrent: boolean;
	canLoadMore: boolean;
	loadingMore: boolean;
	loadMore: () => void;
};
export const useLiveSessionPerformance = (
	personId: string,
	kind?: SessionPerformanceKind,
): SessionPerformanceService => {
	const page = usePaginatedQuery(
		api.session_performance.page,
		{ personId, ...(kind ? { kind } : {}) },
		{ initialNumItems: 6 },
	);
	const save = useMutation(api.session_performance.save);
	const report = useMutation(api.session_performance_reports.report);
	return {
		entries: page.results,
		loading: page.status === "LoadingFirstPage",
		loadingMore: page.status === "LoadingMore",
		canLoadMore: page.status === "CanLoadMore",
		loadMore: (): void => page.loadMore(10),
		save,
		report: async (id, revision, reason): Promise<void> => {
			await report({ id, revision, reason });
		},
	};
};
export const usePreviewSessionPerformance = (
	personId: string,
	kind?: SessionPerformanceKind,
): SessionPerformanceService => {
	const data = useAtomValue(previewDataAtom);
	const { account } = useApp();
	const records = useAtomValue(previewSessionPerformanceAtom);
	const save = useSetAtom(previewSessionPerformanceCommand);
	const report = useSetAtom(previewPerformanceReportCommand);
	const [limit, setLimit] = useState(6);
	const person = data.members.find((member) => member.id === personId);
	const entries = sessionPerformanceHistory(records, account, person, kind).map(
		(entry) => ({
			...entry,
			canEdit:
				person !== undefined &&
				canEditSessionPerformance(
					account,
					person,
					data.events.find((event) => event.id === entry.eventId),
					entry,
				),
			canReport:
				person !== undefined &&
				canReportSessionPerformance(account, person, entry),
		}),
	);
	return {
		entries: entries.slice(0, limit),
		loading: false,
		loadingMore: false,
		canLoadMore: entries.length > limit,
		loadMore: (): void => setLimit((current) => current + 10),
		save: async (command): Promise<string> => save(command),
		report: async (id, revision, reason): Promise<void> =>
			report({ id, revision, reason }),
	};
};
export const useLivePerformanceEditor = (
	personId: string,
	kind: SessionPerformanceKind,
	eventId: string,
): PerformanceEditorService => {
	const page = usePaginatedQuery(
		api.session_performance.sessions,
		{ personId },
		{ initialNumItems: 20 },
	);
	const current = useQuery(
		api.session_performance.current,
		eventId ? { personId, eventId, kind } : "skip",
	);
	return {
		sessions: page.results,
		loading: page.status === "LoadingFirstPage",
		loadingMore: page.status === "LoadingMore",
		canLoadMore: page.status === "CanLoadMore",
		loadMore: (): void => page.loadMore(20),
		current: current ?? undefined,
		loadingCurrent: Boolean(eventId) && current === undefined,
	};
};
export const usePreviewPerformanceEditor = (
	personId: string,
	kind: SessionPerformanceKind,
	eventId: string,
): PerformanceEditorService => {
	const { account } = useApp();
	const data = useAtomValue(previewDataAtom);
	const records = useAtomValue(previewSessionPerformanceAtom);
	const person = data.members.find((member) => member.id === personId);
	const sessions =
		person && canReadSessionPerformance(account, person)
			? data.events
					.filter((event) => performanceSessionEligible(person, event))
					.slice()
					.sort((left, right) => right.date.localeCompare(left.date))
					.map(performanceSession)
			: [];
	const current =
		person && canReadSessionPerformance(account, person, kind)
			? records.find(
					(entry) =>
						entry.personId === personId &&
						entry.eventId === eventId &&
						entry.kind === kind &&
						sessionPerformanceAuthorKey(kind, entry.authorId) ===
							sessionPerformanceAuthorKey(kind, account.id),
				)
			: undefined;
	return {
		sessions,
		loading: false,
		loadingCurrent: false,
		current:
			current && person
				? {
						...current,
						canEdit: canEditSessionPerformance(
							account,
							person,
							data.events.find((event) => event.id === eventId),
							current,
						),
						canReport: canReportSessionPerformance(account, person, current),
					}
				: undefined,
		canLoadMore: false,
		loadingMore: false,
		loadMore: (): void => {},
	};
};
