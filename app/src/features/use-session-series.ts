import { useMutation, useQuery } from "convex/react";
import { useAtom, useSetAtom } from "jotai";
import { api } from "../../convex/_generated/api";
import { previewDataAtom, useApp } from "../demo/app-state";
import { previewSessionSeries } from "../demo/session-series-state";
import type { ClubEvent } from "../domain/app-types";
import { clubDate } from "../domain/event-time";
import {
	type SessionSeries,
	seriesEvents,
	seriesHasSpace,
	syncSeriesResponses,
} from "../domain/session-series";

export { previewSessionSeries } from "../demo/session-series-state";
export type SeriesControls = {
	series: SessionSeries[];
	events: ClubEvent[];
	loading: boolean;
	configure: (args: {
		seriesId: string;
		title: string;
		capacity?: number;
		waitlist?: boolean;
	}) => Promise<void>;
	enroll: (args: {
		seriesId: string;
		personId: string;
		start: string;
		end?: string;
		promote?: boolean;
		invite?: boolean;
	}) => Promise<void>;
	end: (args: {
		seriesId: string;
		personId: string;
		date: string;
	}) => Promise<void>;
};
export const useLiveSeries = (seriesId?: string): SeriesControls => {
	const { data } = useApp();
	const series = useQuery(api.session_series.list, {});
	const configured = series?.find(
		(entry) =>
			entry.id === seriesId || entry.seriesIds.includes(seriesId ?? ""),
	);
	const detail = useQuery(
		api.session_series.detail,
		configured ? { seriesId: configured.id } : "skip",
	);
	const configure = useMutation(api.session_series.configure);
	const enroll = useMutation(api.session_series.enroll);
	const end = useMutation(api.session_series.end);
	return {
		series: series ?? [],
		events: detail?.events ?? data.events,
		loading: !series || Boolean(configured && !detail),
		configure: async (args) => {
			await configure(args);
		},
		enroll: async (args) => {
			await enroll(args);
		},
		end: async (args) => {
			await end(args);
		},
	};
};
export const usePreviewSeries = (): SeriesControls => {
	const { data } = useApp();
	const [series, setSeries] = useAtom(previewSessionSeries);
	const setData = useSetAtom(previewDataAtom);
	const save = (updated: SessionSeries): void => {
		setSeries((current) => [
			...current.filter((entry) => entry.id !== updated.id),
			updated,
		]);
		setData((current) => ({
			...current,
			responses: syncSeriesResponses(
				updated,
				current.events,
				current.responses,
				clubDate(undefined, current.timeZone),
				Date.now(),
			),
		}));
	};
	return {
		series,
		events: data.events,
		loading: false,
		configure: async (args) => {
			const existing = series.find((entry) => entry.id === args.seriesId);
			save({
				...args,
				id: args.seriesId,
				seriesIds: existing?.seriesIds ?? [args.seriesId],
				enrollments: existing?.enrollments ?? [],
			});
		},
		enroll: async (args) => {
			const current = series.find((entry) => entry.id === args.seriesId);
			if (!current) throw new Error("Series not found.");
			if (
				!seriesEvents(current, data.events).some(
					(event) => event.date >= args.start,
				)
			)
				throw new Error("Choose a start date within this series.");
			const space = seriesHasSpace(
				current,
				args.start,
				args.end,
				args.personId,
			);
			if (!args.invite && !space)
				throw new Error("The committed roster is full.");
			save({
				...current,
				enrollments: [
					...current.enrollments.filter(
						(entry) =>
							entry.personId !== args.personId ||
							(entry.end && entry.end <= args.start),
					),
					{
						personId: args.personId,
						start: args.start,
						end: args.end,
						state: args.invite ? "invited" : "committed",
					},
				],
			});
		},
		end: async (args) => {
			const current = series.find((entry) => entry.id === args.seriesId);
			if (!current) throw new Error("Series not found.");
			save({
				...current,
				enrollments: current.enrollments.map((entry) =>
					entry.personId === args.personId &&
					(!entry.end || entry.end > args.date)
						? { ...entry, end: args.date }
						: entry,
				),
			});
		},
	};
};
