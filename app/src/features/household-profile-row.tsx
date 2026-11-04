import { type ReactElement, useState } from "react";
import type { HouseholdService } from "../backend/use-household";
import {
	ActionMenu,
	IconButton,
	ListItem,
	Row,
	Stack,
	Text,
} from "../design-system";
import type { HouseholdOption } from "../domain/household";
import { ConfirmationDialog } from "./confirmation-dialog";
import { useTask } from "./use-task";

export const HouseholdProfileRow = ({
	profile,
	service,
	onEdit,
}: {
	profile: HouseholdOption;
	service: HouseholdService;
	onEdit?: () => void;
}): ReactElement => {
	const [unlinking, setUnlinking] = useState(false);
	const task = useTask();
	const description = [
		profile.archived ? "Archived" : profile.self ? "You" : undefined,
		profile.default ? "Opens by default" : undefined,
	]
		.filter(Boolean)
		.join(" · ");
	const items = [
		...(!profile.default && !profile.archived
			? [
					{
						id: "default",
						label: "Use by default",
						onSelect: (): void => {
							void task.run(
								async (): Promise<void> =>
									service.command({ type: "default", personId: profile.id }),
							);
						},
					},
				]
			: []),
		...(!profile.self
			? [
					{
						id: "unlink",
						label: "Unlink",
						tone: "danger" as const,
						onSelect: (): void => setUnlinking(true),
					},
				]
			: []),
	];
	return (
		<Stack gap="xs">
			<Row>
				<Stack grow>
					<ListItem
						flush
						showChevron={false}
						title={profile.name}
						description={description || undefined}
						avatar={profile.name}
						avatarId={profile.id}
						onPress={onEdit}
						accessibilityLabel={onEdit ? `Edit ${profile.name}` : profile.name}
					/>
				</Stack>
				{items.length ? (
					<ActionMenu
						label="Profile options"
						accessibilityLabel={`Options for ${profile.name}`}
						icon="more"
						isDisabled={task.busy}
						groups={[{ id: "profile", items }]}
					/>
				) : undefined}
				{onEdit ? (
					<IconButton
						label={`Edit ${profile.name}`}
						icon="chevron"
						onPress={onEdit}
					/>
				) : undefined}
			</Row>
			{task.error ? (
				<Text variant="small" tone="danger">
					{task.error}
				</Text>
			) : undefined}
			{unlinking ? (
				<ConfirmationDialog
					title={`Unlink ${profile.name}?`}
					description="Your access will be removed. Their profile, history and other household accounts stay unchanged."
					confirmLabel="Unlink profile"
					danger
					onClose={(): void => setUnlinking(false)}
					onConfirm={(): Promise<void> =>
						service.command({ type: "unlink", personId: profile.id })
					}
				/>
			) : undefined}
		</Stack>
	);
};
