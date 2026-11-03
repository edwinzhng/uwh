import { usePaginatedQuery, useQuery } from "convex/react";
import { useAtomValue } from "jotai";
import { type ReactElement, type ReactNode, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useApp } from "../demo/app-state";
import { previewFitnessAtom } from "../demo/fitness-state";
import { fitnessLowerIsBetter } from "../domain/fitness";
import {
	type FitnessRosterRow,
	type FitnessSession,
	type FitnessTest,
	type FitnessTrend,
	fitnessSummary,
} from "../domain/fitness-model";

export type FitnessRequest =
	| { type: "tests"; archived: boolean }
	| { type: "test"; testId: string }
	| { type: "sessions"; testId: string; seasonId: string }
	| {
			type: "results";
			testId: string;
			sessionId: string;
			search: string;
	  }
	| {
			type: "progress";
			testId: string;
			seasonId: string;
			search: string;
			personIds: string[];
	  };
type ListPage<T> = {
	results: T[];
	status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
	loadMore: (count: number) => void;
};
export type FitnessSnapshot = {
	tests: ListPage<FitnessTest>;
	test?: FitnessTest;
	sessions: ListPage<FitnessSession>;
	session?: FitnessSession;
	roster?: {
		page: FitnessRosterRow[];
		isDone: boolean;
		loadingMore: boolean;
		loadMore: (count: number) => void;
	};
	trends?: FitnessTrend[];
};
type Props = {
	request: FitnessRequest;
	children: (snapshot: FitnessSnapshot) => ReactNode;
};

const LiveFitnessData = ({ request, children }: Props): ReactElement => {
	const tests = usePaginatedQuery(
		api.fitness.list,
		request.type === "tests" ? { archived: request.archived } : "skip",
		{ initialNumItems: 30 },
	);
	const test = useQuery(
		api.fitness.test,
		request.type === "test"
			? { testId: request.testId as Id<"fitnessTests"> }
			: "skip",
	);
	const sessions = usePaginatedQuery(
		api.fitness.sessions,
		request.type === "sessions"
			? {
					testId: request.testId as Id<"fitnessTests">,
					seasonId: request.seasonId,
				}
			: "skip",
		{ initialNumItems: 20 },
	);
	const session = useQuery(
		api.fitness.session,
		request.type === "results"
			? { sessionId: request.sessionId as Id<"fitnessSessions"> }
			: "skip",
	);
	const page = usePaginatedQuery(
		api.fitness.roster,
		request.type === "progress" || (request.type === "results" && session)
			? {
					testId: request.testId as Id<"fitnessTests">,
					seasonId:
						request.type === "progress"
							? request.seasonId
							: (session?.seasonId ?? ""),
					sessionId:
						request.type === "results"
							? (request.sessionId as Id<"fitnessSessions">)
							: undefined,
					search: request.search,
				}
			: "skip",
		{ initialNumItems: 25 },
	);
	const trends = useQuery(
		api.fitness.trends,
		request.type === "progress"
			? {
					testId: request.testId as Id<"fitnessTests">,
					seasonId: request.seasonId,
					personIds: request.personIds,
				}
			: "skip",
	);
	return (
		<>
			{children({
				tests,
				test,
				sessions,
				session: session ?? undefined,
				roster:
					page.status !== "LoadingFirstPage"
						? {
								isDone: page.status === "Exhausted",
								loadingMore: page.status === "LoadingMore",
								loadMore: page.loadMore,
								page: page.results.map((row) => ({
									...row,
									result: row.result ?? undefined,
									stats: row.stats ?? undefined,
								})),
							}
						: undefined,
				trends,
			})}
		</>
	);
};

const PreviewFitnessData = ({ request, children }: Props): ReactElement => {
	const state = useAtomValue(previewFitnessAtom);
	const { data } = useApp();
	const [limit, setLimit] = useState(
		request.type === "results" || request.type === "progress" ? 25 : 30,
	);
	const testId = request.type !== "tests" ? request.testId : undefined;
	const test = state.tests.find((entry) => entry._id === testId);
	const session =
		request.type === "results"
			? state.sessions.find((entry) => entry._id === request.sessionId)
			: undefined;
	const seasonId =
		request.type === "progress" || request.type === "sessions"
			? request.seasonId
			: session?.seasonId;
	const search =
		request.type === "results" || request.type === "progress"
			? request.search.trim().toLowerCase()
			: "";
	const people = data.members
		.filter((person) => person.name.toLowerCase().includes(search))
		.slice()
		.sort((a, b) => a.name.localeCompare(b.name));
	const tests = state.tests.filter(
		(entry) => request.type === "tests" && entry.archived === request.archived,
	);
	const sessions = state.sessions
		.filter((entry) => entry.testId === testId && entry.seasonId === seasonId)
		.slice()
		.sort((a, b) => b.date.localeCompare(a.date));
	const page: FitnessRosterRow[] = people.slice(0, limit).map((person) => ({
		personId: person.id,
		name: person.name,
		result: session
			? state.results.find(
					(entry) =>
						entry.sessionId === session._id && entry.personId === person.id,
				)
			: undefined,
		stats: test
			? fitnessSummary(
					test.unit,
					state.results.filter(
						(entry) =>
							entry.testId === test._id &&
							entry.seasonId === seasonId &&
							entry.personId === person.id,
					),
					fitnessLowerIsBetter(test),
				)
			: undefined,
	}));
	const trends =
		request.type === "progress"
			? request.personIds.map(
					(personId): FitnessTrend => ({
						id: personId,
						label:
							data.members.find((person) => person.id === personId)?.name ??
							"Player",
						points: state.results
							.filter(
								(entry) =>
									entry.testId === testId &&
									entry.seasonId === seasonId &&
									entry.personId === personId,
							)
							.slice()
							.sort((a, b) => a.date.localeCompare(b.date))
							.map(({ date, value }) => ({ date, value })),
						limited: false,
					}),
				)
			: undefined;
	const loadMore = (count: number): void =>
		setLimit((current) => current + count);
	return (
		<>
			{children({
				tests: {
					results: tests.slice(0, limit),
					status: tests.length > limit ? "CanLoadMore" : "Exhausted",
					loadMore,
				},
				test,
				sessions: {
					results: sessions.slice(0, limit),
					status: sessions.length > limit ? "CanLoadMore" : "Exhausted",
					loadMore,
				},
				session,
				roster: {
					page,
					isDone: limit >= people.length,
					loadingMore: false,
					loadMore,
				},
				trends,
			})}
		</>
	);
};

export const FitnessData = ({ request, children }: Props): ReactElement =>
	useApp().source === "convex" ? (
		<LiveFitnessData request={request}>{children}</LiveFitnessData>
	) : (
		<PreviewFitnessData request={request}>{children}</PreviewFitnessData>
	);
