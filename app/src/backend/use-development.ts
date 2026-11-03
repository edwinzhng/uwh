import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useAtomValue, useSetAtom } from "jotai";
import { api } from "../../convex/_generated/api";
import { previewDataAtom, useApp } from "../demo/app-state";
import {
	previewDevelopmentAtom,
	previewDevelopmentCommandAtom,
	previewDevelopmentReviewers,
} from "../demo/development-state";
import {
	type DevelopmentDraft,
	type DevelopmentPlayer,
	type DevelopmentVersion,
	developmentPlayer,
} from "../domain/development";
import { defaultPlayerCoaching } from "../domain/player-coaching";

export type DevelopmentService = {
	player?: DevelopmentPlayer;
	loading: boolean;
	save: (draft: DevelopmentDraft) => Promise<void>;
	finalize: (version: DevelopmentVersion) => Promise<void>;
	reopen: (version: DevelopmentVersion) => Promise<void>;
};
export type DevelopmentOverview = {
	players: DevelopmentPlayer[];
	loading: boolean;
	loadingMore: boolean;
	canLoadMore: boolean;
	loadMore: () => void;
};

export const useDevelopment = (personId?: string): DevelopmentService => {
	const result = useQuery(
		api.development.player,
		personId ? { personId } : "skip",
	);
	const save = useMutation(api.development.save);
	const finalize = useMutation(api.development.finalize);
	const reopen = useMutation(api.development.reopen);
	return {
		player: result ?? undefined,
		loading: personId !== undefined && result === undefined,
		save: async (draft): Promise<void> => {
			await save(draft);
		},
		finalize: async (version): Promise<void> => {
			await finalize(version);
		},
		reopen: async (version): Promise<void> => {
			await reopen(version);
		},
	};
};

export const useDevelopmentOverview = (enabled = true): DevelopmentOverview => {
	const page = usePaginatedQuery(
		api.development.overview,
		enabled ? {} : "skip",
		{ initialNumItems: 20 },
	);
	return {
		players: page.results,
		loading: page.status === "LoadingFirstPage",
		loadingMore: page.status === "LoadingMore",
		canLoadMore: page.status === "CanLoadMore",
		loadMore: (): void => page.loadMore(20),
	};
};

export const usePreviewDevelopmentOverview = (): DevelopmentOverview => {
	const data = useAtomValue(previewDataAtom);
	const state = useAtomValue(previewDevelopmentAtom);
	const coaches = useAtomValue(previewDevelopmentReviewers);
	const { account } = useApp();
	return {
		players: data.members
			.filter((member) => member.programs.length > 0)
			.map((member) =>
				developmentPlayer(
					member,
					data.playerCoaching?.find(
						(profile) => profile.personId === member.id,
					) ?? defaultPlayerCoaching(member),
					state.rounds
						.filter((round) => round.personId === member.id)
						.slice()
						.sort((a, b) => b.round - a.round)
						.at(0),
					state.reviews,
					coaches,
					account.id,
				),
			),
		loading: false,
		loadingMore: false,
		canLoadMore: false,
		loadMore: (): void => {},
	};
};

export const usePreviewDevelopment = (
	personId?: string,
): DevelopmentService => {
	const overview = usePreviewDevelopmentOverview();
	const command = useSetAtom(previewDevelopmentCommandAtom);
	return {
		player: overview.players.find((player) => player.member.id === personId),
		loading: false,
		save: async (draft): Promise<void> => command({ type: "save", draft }),
		finalize: async (version): Promise<void> =>
			command({ type: "finalize", version }),
		reopen: async (version): Promise<void> =>
			command({ type: "reopen", version }),
	};
};
