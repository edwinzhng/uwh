import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { PersonalFitnessData } from "../backend/personal-fitness-data";
import { useActivePerson } from "../demo/app-state";
import {
	Button,
	EmptyState,
	InfiniteScroll,
	LoadingContent,
	SectionHeading,
	Stack,
	Text,
} from "../design-system";
import type { Member } from "../domain/app-types";
import { PersonalFitnessCards } from "./personal-fitness-cards";
import { PersonalFitnessSummary } from "./personal-fitness-summary";
import { useSeason } from "./use-season";

export const PersonalFitness = ({
	member,
	full = false,
}: {
	member: Member;
	full?: boolean;
}): ReactElement => {
	const router = useRouter();
	const activePerson = useActivePerson();
	const [seasonId] = useSeason();
	return (
		<Stack gap="sm">
			{!full ? (
				<SectionHeading
					action={
						<Button
							label="View all"
							accessibilityLabel="View all fitness tests"
							variant="ghost"
							compact
							onPress={(): void =>
								router.push(
									member.id === activePerson.id
										? { pathname: "/account", params: { tab: "fitness" } }
										: {
												pathname: "/member",
												params: { id: member.id, tab: "fitness" },
											},
								)
							}
						/>
					}
				>
					Fitness tests
				</SectionHeading>
			) : undefined}
			<PersonalFitnessData
				key={`${member.id}:${seasonId}`}
				member={member}
				allTests={full}
				seasonId={full ? undefined : seasonId}
			>
				{({ rows, loading, more, loadingMore, loadMore }) => (
					<Stack gap="sm">
						{loading ? (
							<LoadingContent />
						) : !rows.length && !full ? (
							<Text variant="small" tone="secondary">
								{more ? "Checking earlier results…" : "No fitness results."}
							</Text>
						) : !rows.length ? (
							<EmptyState
								title={more ? "No results in these tests" : "No swim results"}
								description={more ? "Checking earlier results…" : undefined}
							/>
						) : full ? (
							<PersonalFitnessCards rows={rows} personId={member.id} />
						) : (
							<PersonalFitnessSummary
								rows={rows}
								personId={member.id}
								full={full}
							/>
						)}
						{more && (full || !rows.length) ? (
							<InfiniteScroll
								loadMore={loadMore}
								loading={loadingMore}
								revision={rows.length}
								disabled={false}
							/>
						) : undefined}
					</Stack>
				)}
			</PersonalFitnessData>
		</Stack>
	);
};
