import { atom, useAtom } from "jotai";
import type { ReactElement } from "react";
import { DatePicker, Grid, Stack, Text, TimeSelector } from "../design-system";

const dateAtom = atom<string | undefined>("2026-09-07");
const timeAtom = atom<string | undefined>("18:00");

export const DateTimeExamples = (): ReactElement => {
	const [date, setDate] = useAtom(dateAtom);
	const [time, setTime] = useAtom(timeAtom);
	return (
		<Stack>
			<Text variant="h4">Date & time</Text>
			<Grid>
				<DatePicker label="Date" value={date} onValueChange={setDate} />
				<TimeSelector label="Time" value={time} onValueChange={setTime} />
			</Grid>
		</Stack>
	);
};
