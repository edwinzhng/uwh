import { useQuery } from "convex/react";
import { useAtomValue } from "jotai";
import type { ReactElement, ReactNode } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { previewFitnessAtom } from "../demo/fitness-state";
import { usePageLoading } from "../design-system";
import type { Member } from "../domain/app-types";
import {
	type HomeFitnessSnapshot,
	homeFitnessSnapshot,
} from "../domain/home-summary";

type Props = {
	person: Member;
	today: string;
	children: (state: {
		result?: HomeFitnessSnapshot;
		loading: boolean;
	}) => ReactNode;
};

const LiveFitness = ({ person, today, children }: Props): ReactElement => {
	const value = useQuery(api.fitness.homeSummary, {
		personId: person.id,
		today,
	});
	usePageLoading(value === undefined);
	return (
		<>{children({ result: value?.result, loading: value === undefined })}</>
	);
};

const PreviewFitness = ({ person, today, children }: Props): ReactElement => {
	const { account } = useApp();
	const state = useAtomValue(previewFitnessAtom);
	return (
		<>
			{children({
				result: homeFitnessSnapshot(state, account, person, today),
				loading: false,
			})}
		</>
	);
};

export const HomeFitnessData = ({
	person,
	today,
	children,
}: Props): ReactElement =>
	useApp().source === "convex" ? (
		<LiveFitness person={person} today={today}>
			{children}
		</LiveFitness>
	) : (
		<PreviewFitness person={person} today={today}>
			{children}
		</PreviewFitness>
	);
