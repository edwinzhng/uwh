import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { useActivePerson, useApp } from "../demo/app-state";
import { Button, Row, Stack, Surface } from "../design-system";
import { homeReflectionPractice } from "../domain/home-summary";
import { canWriteSessionPerformance } from "../domain/session-performance";
import { SessionPerformanceTask } from "./session-performance-task";
import { ShoutoutEditor } from "./shoutout-editor";

export const HomeQuickActions = ({ now }: { now: number }): ReactElement => {
	const { data, account } = useApp();
	const person = useActivePerson();
	const router = useRouter();
	const event = homeReflectionPractice(data, person, now);
	const [reflection, setReflection] = useState<{
		personId: string;
		eventId?: string;
	}>();
	return (
		<Stack gap="sm">
			<Surface>
				<Row wrap gap="xs">
					{canWriteSessionPerformance(account, person, "self") ? (
						<Button
							label="Reflect on practice"
							variant="secondary"
							onPress={(): void =>
								setReflection({ personId: person.id, eventId: event?.id })
							}
						/>
					) : undefined}
					<ShoutoutEditor compact />
					<Button
						label={
							person.id === account.personId
								? "My fitness"
								: `${person.name}’s fitness`
						}
						variant="ghost"
						onPress={(): void =>
							router.push({ pathname: "/account", params: { tab: "fitness" } })
						}
					/>
				</Row>
			</Surface>
			{reflection ? (
				<SessionPerformanceTask
					personId={reflection.personId}
					eventId={reflection.eventId}
					kind="self"
					onClose={(): void => setReflection(undefined)}
				/>
			) : undefined}
		</Stack>
	);
};
