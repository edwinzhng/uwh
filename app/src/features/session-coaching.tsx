import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import {
	Button,
	Dialog,
	EmptyState,
	Field,
	List,
	ListItem,
	SectionHeading,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { canRegister } from "../domain/app-rules";
import type { ClubEvent } from "../domain/app-types";
import { practicePartKey } from "../domain/practice-parts";
import { EventCoaches } from "./event-coaches";
import { TeamPanel } from "./team-panel";
import { useDraft } from "./use-draft";

export const SessionCoaching = ({
	event,
	partId,
}: {
	event: ClubEvent;
	partId?: string;
}): ReactElement => {
	const { data, account, dispatch, busy } = useApp();
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const planKey = practicePartKey(event.id, partId);
	const [plan, setPlan] = useDraft(`plan:${account.id}:${planKey}`);
	const save = async (): Promise<void> => {
		if (
			await dispatch({
				type: "save-plan",
				eventId: event.id,
				partId,
				body: plan,
			})
		)
			setOpen(false);
	};
	return (
		<Stack gap="xl">
			<EventCoaches event={event} partId={partId} />
			<Stack gap="sm">
				<SectionHeading
					action={
						<Button
							label="Edit"
							variant="ghost"
							prefix="edit"
							isDisabled={event.cancelled}
							onPress={(): void => {
								setPlan(data.plans[planKey] ?? "");
								setOpen(true);
							}}
						/>
					}
				>
					Session plan
				</SectionHeading>
				<Surface>
					<Stack>
						{data.plans[planKey] ? (
							<Text variant="small">{data.plans[planKey]}</Text>
						) : (
							<EmptyState
								title="No session plan yet"
								description={
									event.cancelled
										? "No plan was added before this session was cancelled."
										: "Use Edit to add drills, activities and coaching notes for this session."
								}
							/>
						)}
					</Stack>
				</Surface>
			</Stack>
			<TeamPanel event={event} partId={partId} />
			<Stack gap="sm">
				<SectionHeading>Player feedback</SectionHeading>
				<Surface padding="sm">
					<List>
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
						{!data.members.some((member) => canRegister(member, event)) ? (
							<EmptyState
								title="No eligible players"
								description="Player feedback becomes available when players are eligible for this session."
							/>
						) : undefined}
					</List>
				</Surface>
			</Stack>
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
