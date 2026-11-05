import { type ReactElement, useState } from "react";
import { useStaffInvites } from "../backend/use-staff-invites";
import { useApp } from "../demo/app-state";
import {
	Button,
	List,
	ListItem,
	LoadingContent,
	SectionHeading,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { displayDateTime } from "../domain/date-display";
import { StaffInviteForm } from "./staff-invite-form";
import { useTask } from "./use-task";

export const StaffInvites = (): ReactElement => {
	const service = useStaffInvites();
	const { data } = useApp();
	const task = useTask();
	const [creating, setCreating] = useState(false);
	return (
		<Stack gap="heading">
			<SectionHeading
				action={
					<Button
						label="Create invite"
						variant="secondary"
						onPress={(): void => setCreating(true)}
						isDisabled={!service.state || task.busy}
					/>
				}
			>
				Staff invites
			</SectionHeading>
			<Surface>
				<Stack>
					<Text variant="small">
						Codes grant staff access after normal sign-in. Revoking a code
						prevents further joins; manage existing staff in Account access.
					</Text>
					{!service.state ? (
						<LoadingContent />
					) : service.state.invites.length ? (
						<List>
							{service.state.invites.map((invite) => {
								const active =
									!invite.revoked &&
									invite.expiresAt > Date.now() &&
									invite.uses < invite.maxUses;
								return (
									<ListItem
										key={invite.id}
										title={
											invite.admin ? "Administrator invite" : "Coach invite"
										}
										description={`${invite.uses}/${invite.maxUses} joined · ${active ? `Expires ${displayDateTime(invite.expiresAt, data.timeZone)}` : "Unavailable"}`}
										action={
											active ? (
												<Button
													label="Revoke"
													variant="ghost"
													isDisabled={task.busy}
													onPress={(): void => {
														void task.run(() => service.revoke(invite.id));
													}}
												/>
											) : undefined
										}
									/>
								);
							})}
						</List>
					) : (
						<Text variant="small" tone="secondary">
							No staff invites.
						</Text>
					)}
					{task.error ? (
						<Text variant="small" tone="danger">
							{task.error}
						</Text>
					) : undefined}
				</Stack>
			</Surface>
			{creating && service.state ? (
				<StaffInviteForm
					canGrantAdmin={service.state.canGrantAdmin}
					create={service.create}
					onClose={(): void => setCreating(false)}
				/>
			) : undefined}
		</Stack>
	);
};
