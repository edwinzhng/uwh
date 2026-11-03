import type { ReactElement } from "react";
import type { HouseholdService } from "../backend/use-household";
import {
	Button,
	IconButton,
	List,
	ListItem,
	Row,
	Stack,
	Text,
} from "../design-system";
import { useTask } from "./use-task";

export const HouseholdInvitations = ({
	service,
}: {
	service: HouseholdService;
}): ReactElement | undefined => {
	const task = useTask();
	const invitations = service.state?.available ?? [];
	if (!invitations.length) return undefined;
	return (
		<Stack>
			<Text variant="label">Invitations</Text>
			<List>
				{invitations.map((invitation) => (
					<ListItem
						key={invitation.id}
						flush
						title={invitation.name}
						avatar={invitation.name}
						description={
							invitation.origin === "administrator"
								? "Ready to link"
								: "Previously linked"
						}
						trailing={
							<Row gap="xs">
								<Button
									label="Link"
									variant="secondary"
									isDisabled={task.busy}
									onPress={(): void => {
										void task.run(
											async (): Promise<void> =>
												service.command({ type: "accept", id: invitation.id }),
										);
									}}
								/>
								<IconButton
									label={`Dismiss invitation for ${invitation.name}`}
									icon="close"
									isDisabled={task.busy}
									onPress={(): void => {
										void task.run(
											async (): Promise<void> =>
												service.command({ type: "dismiss", id: invitation.id }),
										);
									}}
								/>
							</Row>
						}
					/>
				))}
			</List>
			{task.error ? (
				<Text variant="small" tone="danger">
					{task.error}
				</Text>
			) : undefined}
		</Stack>
	);
};
