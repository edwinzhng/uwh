import { type ReactElement, useState } from "react";
import { useActivePerson, useApp } from "../demo/app-state";
import { Button } from "../design-system";
import type { ClubEvent } from "../domain/app-types";
import {
	canWriteSessionPerformance,
	performanceSessionEligible,
} from "../domain/session-performance";
import { SessionPerformanceTask } from "./session-performance-task";

export const SessionReflectionAction = ({
	event,
}: {
	event: ClubEvent;
}): ReactElement | undefined => {
	const { account } = useApp();
	const person = useActivePerson();
	const [task, setTask] = useState<{ personId: string; eventId: string }>();
	const canReflect =
		canWriteSessionPerformance(account, person, "self") &&
		performanceSessionEligible(person, event);
	return (
		<>
			{canReflect ? (
				<Button
					label="Reflect"
					variant="secondary"
					compact
					accessibilityLabel={`Reflect on ${event.title} for ${person.name}`}
					onPress={(): void =>
						setTask({ personId: person.id, eventId: event.id })
					}
				/>
			) : undefined}
			{task ? (
				<SessionPerformanceTask
					personId={task.personId}
					eventId={task.eventId}
					kind="self"
					onClose={(): void => setTask(undefined)}
				/>
			) : undefined}
		</>
	);
};
