import { useMutation } from "convex/react";
import { useSetAtom } from "jotai";
import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import { previewDataAtom, useApp } from "../demo/app-state";
import { Select, Stack, Text } from "../design-system";
import type { ClubEvent } from "../domain/app-types";
import { clubTimestamp } from "../domain/event-time";
import { useTask } from "./use-task";

type Props = { event: ClubEvent; personId: string; unavailable: boolean };
const Control = ({
	event,
	personId,
	unavailable,
	save,
}: Props & {
	save: (args: {
		eventId: string;
		personId: string;
		unavailable: boolean;
	}) => Promise<void>;
}): ReactElement => {
	const { data } = useApp();
	const task = useTask();
	return (
		<Stack gap="xs">
			<Select
				label="Series attendance"
				value={unavailable ? "unavailable" : "expected"}
				isDisabled={
					task.busy ||
					event.cancelled ||
					clubTimestamp(
						event.date,
						event.end,
						event.timeZone ?? data.timeZone,
					) <= Date.now()
				}
				options={[
					{ value: "expected", label: "Expected · Series member" },
					{ value: "unavailable", label: "Can’t attend this session" },
				]}
				onValueChange={(value): void => {
					if (value)
						void task.run(async () =>
							save({
								eventId: event.id,
								personId,
								unavailable: value === "unavailable",
							}),
						);
				}}
			/>
			{task.error ? <Text tone="danger">{task.error}</Text> : undefined}
		</Stack>
	);
};
const LiveControl = (props: Props): ReactElement => {
	const save = useMutation(api.session_series.absence);
	return (
		<Control
			event={props.event}
			personId={props.personId}
			unavailable={props.unavailable}
			save={async (args) => {
				await save(args);
			}}
		/>
	);
};
const PreviewControl = (props: Props): ReactElement => {
	const setData = useSetAtom(previewDataAtom);
	return (
		<Control
			event={props.event}
			personId={props.personId}
			unavailable={props.unavailable}
			save={async (args) => {
				setData((data) => ({
					...data,
					responses: data.responses.map((response) =>
						response.eventId === args.eventId &&
						response.personId === args.personId
							? {
									...response,
									response: args.unavailable ? "unavailable" : "going",
								}
							: response,
					),
				}));
			}}
		/>
	);
};
export const SeriesResponseControl = (props: Props): ReactElement =>
	useApp().source === "convex" ? (
		<LiveControl
			event={props.event}
			personId={props.personId}
			unavailable={props.unavailable}
		/>
	) : (
		<PreviewControl
			event={props.event}
			personId={props.personId}
			unavailable={props.unavailable}
		/>
	);
