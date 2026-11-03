import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import type { DevelopmentOverview } from "../backend/use-development";
import {
	Badge,
	EmptyState,
	InfiniteScroll,
	List,
	ListItem,
	LoadingContent,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { playerRatingLabel } from "../domain/player-coaching";

export const DevelopmentList = ({
	players,
	loading,
	loadingMore,
	canLoadMore,
	loadMore,
}: DevelopmentOverview): ReactElement => {
	const router = useRouter();
	const activePlayers = players.filter((player) => !player.member.archived);
	return loading ? (
		<LoadingContent />
	) : (
		<Stack gap="sm">
			<Surface>
				<List>
					{activePlayers.map((player) => (
						<ListItem
							key={player.member.id}
							title={player.member.name}
							avatar={player.member.name}
							avatarId={player.member.id}
							description={`${player.member.goal || "No goal set"} · ${player.member.steps}/6 check-ins`}
							descriptionLines={2}
							titleAccessory={
								<Badge
									compact
									label={
										player.round?.status === "finalized"
											? player.profile.ratingKnown === false
												? "Not rated"
												: `Rated ${playerRatingLabel(player.profile)}`
											: `${player.submittedCount}/${player.requiredCount} reviewed`
									}
									kind={
										player.round?.status === "finalized" ? "success" : "neutral"
									}
								/>
							}
							onPress={(): void =>
								router.setParams({ person: player.member.id })
							}
						/>
					))}
					{activePlayers.length === 0 ? (
						<EmptyState title="No players" />
					) : undefined}
				</List>
			</Surface>
			{canLoadMore || loadingMore ? (
				<InfiniteScroll
					loadMore={loadMore}
					loading={loadingMore}
					revision={players.length}
					disabled={false}
				/>
			) : undefined}
			<Text variant="caption" tone="secondary">
				Reviews are private to coaches. Goals and check-ins stay shared with
				each player and their guardians.
			</Text>
		</Stack>
	);
};
