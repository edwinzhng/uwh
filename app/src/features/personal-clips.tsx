import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import {
	type ResourceState,
	useLiveResources,
	usePreviewResources,
} from "../backend/use-resources";
import { useApp } from "../demo/app-state";
import {
	Button,
	InfiniteScroll,
	List,
	ListItem,
	LoadingContent,
	Row,
	SectionHeading,
	Stack,
	Surface,
	Text,
} from "../design-system";
import type { Member } from "../domain/app-types";
import { ResourceThumbnail } from "./resource-thumbnail";

const ClipsList = ({
	member,
	state,
}: {
	member: Member;
	state: ResourceState;
}): ReactElement => {
	const router = useRouter();
	const { account } = useApp();
	const open = (params: { id?: string; new?: string }): void =>
		router.push({
			pathname: "/resources",
			params: { kind: "video", person: member.id, ...params },
		});
	return (
		<Surface elevation="none">
			<Stack gap="sm">
				<SectionHeading
					size="small"
					action={
						<Row wrap>
							{account.admin || account.coachPrograms.length ? (
								<Button
									label="Add clip"
									variant="secondary"
									compact
									onPress={(): void => open({ new: "video" })}
								/>
							) : undefined}
							{state.items.length ? (
								<Button
									label="View all"
									variant="ghost"
									compact
									onPress={(): void => open({})}
								/>
							) : undefined}
						</Row>
					}
				>
					Videos
				</SectionHeading>
				{!state.loading && !state.items.length ? (
					<Text variant="small" tone="secondary">
						No videos.
					</Text>
				) : (
					<List>
						{state.loading ? (
							<LoadingContent />
						) : (
							state.items
								.slice(0, 2)
								.map((resource) => (
									<ListItem
										key={resource.id}
										title={resource.title}
										description={resource.description}
										descriptionLines={2}
										trailing={
											<ResourceThumbnail
												state={state}
												resource={resource}
												compact
											/>
										}
										onPress={(): void => open({ id: resource.id })}
									/>
								))
						)}
					</List>
				)}
				{state.loadMore || state.loadingMore ? (
					<InfiniteScroll
						loadMore={state.loadMore}
						loading={state.loadingMore}
						revision={state.items.length}
						disabled={false}
					/>
				) : undefined}
			</Stack>
		</Surface>
	);
};
const LiveClips = ({ member }: { member: Member }): ReactElement => (
	<ClipsList
		member={member}
		state={useLiveResources({
			kind: "video",
			archived: false,
			search: "",
			personId: member.id,
		})}
	/>
);
const PreviewClips = ({ member }: { member: Member }): ReactElement => (
	<ClipsList
		member={member}
		state={usePreviewResources({
			kind: "video",
			archived: false,
			search: "",
			personId: member.id,
		})}
	/>
);
export const PersonalClips = ({ member }: { member: Member }): ReactElement =>
	useApp().source === "convex" ? (
		<LiveClips member={member} />
	) : (
		<PreviewClips member={member} />
	);
