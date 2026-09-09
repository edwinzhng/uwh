import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import {
	Button,
	Dialog,
	Field,
	ListItem,
	Row,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { canRegister } from "../domain/app-rules";
import type { ClubEvent } from "../domain/app-types";
import { EventCoaches } from "./event-coaches";
import { TeamPanel } from "./team-panel";
import { useDraft } from "./use-draft";

export const SessionCoaching = ({
	event,
}: {
	event: ClubEvent;
}): ReactElement => {
	const { data, account, dispatch, busy } = useApp();
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [plan, setPlan] = useDraft(`plan:${account.id}:${event.id}`);
	const save = async (): Promise<void> => {
		if (await dispatch({ type: "save-plan", eventId: event.id, body: plan }))
			setOpen(false);
	};
	return (
		<Stack gap="lg">
			<EventCoaches event={event} />
			<Surface>
				<Stack>
					<Row justify="between">
						<Text variant="h4">Session plan</Text>
						<Button
							label="Edit"
							variant="ghost"
							prefix="edit"
							isDisabled={event.cancelled}
							onPress={(): void => {
								setPlan(data.plans[event.id] ?? "");
								setOpen(true);
							}}
						/>
					</Row>
					<Text variant="small">{data.plans[event.id] || "No plan"}</Text>
				</Stack>
			</Surface>
			<TeamPanel event={event} />
			<Surface padding="sm">
				<Stack gap="sm">
					<Text variant="h4">Player feedback</Text>
					{data.members
						.filter((member) => canRegister(member, event))
						.map((member) => (
							<ListItem
								key={member.id}
								title={member.name}
								avatar={member.name}
								description={member.goal}
								onPress={(): void =>
									router.push({
										pathname: "/member",
										params: { id: member.id, tab: "progress" },
									})
								}
							/>
						))}
				</Stack>
			</Surface>
			<Dialog
				staffRole="coach"
				title="Session plan"
				isOpen={open}
				onOpenChange={setOpen}
				footer={
					<Button
						label="Save plan"
						isLoading={busy}
						onPress={(): void => {
							void save();
						}}
					/>
				}
			>
				<Field label="Plan" value={plan} onValueChange={setPlan} multiline />
			</Dialog>
		</Stack>
	);
};
