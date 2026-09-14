import { type ReactElement, useState } from "react";
import { View } from "react-native";
import { Button } from "./button";
import { CalendarDay } from "./calendar-day";
import {
	calendarDays,
	calendarKeyDate,
	moveCalendarMonth,
} from "./calendar-values";
import { IconButton } from "./icon-button";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";
import { space } from "./tokens";

type Props = {
	value: string;
	today: string;
	counts: Readonly<Record<string, number>>;
	onValueChange: (value: string) => void;
};
export const Calendar = ({
	value,
	today,
	counts,
	onValueChange,
}: Props): ReactElement => {
	const [keyboard, setKeyboard] = useState(false);
	const days = calendarDays(value);
	const month = new Intl.DateTimeFormat("en-CA", {
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	}).format(new Date(`${value}T12:00:00Z`));
	const select = (date: string): void => {
		setKeyboard(false);
		onValueChange(date);
	};
	return (
		<Stack gap="sm">
			<Row justify="between" wrap>
				<Text variant="h4">{month}</Text>
				<Row gap="xxs">
					<Button
						label="Today"
						variant="ghost"
						onPress={(): void => select(today)}
					/>
					<IconButton
						label="Previous month"
						icon="arrowLeft"
						onPress={(): void => select(moveCalendarMonth(value, -1))}
					/>
					<IconButton
						label="Next month"
						icon="arrowRight"
						onPress={(): void => select(moveCalendarMonth(value, 1))}
					/>
				</Row>
			</Row>
			<View style={{ flexDirection: "row" }}>
				{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
					<View key={day} style={{ flex: 1, paddingVertical: space.xxs }}>
						<Text variant="caption" tone="secondary" align="center">
							{day}
						</Text>
					</View>
				))}
			</View>
			<View
				accessibilityLabel={month}
				style={{ flexDirection: "row", flexWrap: "wrap" }}
			>
				{days.map((date) => {
					const count = counts[date] ?? 0;
					const label = new Intl.DateTimeFormat("en-CA", {
						weekday: "long",
						day: "numeric",
						month: "long",
						timeZone: "UTC",
					}).format(new Date(`${date}T12:00:00Z`));
					return (
						<View
							key={date}
							style={{ width: `${100 / 7}%`, padding: space.half }}
						>
							<CalendarDay
								value={date}
								label={`${label}${date === today ? ", today" : ""}, ${count} ${count === 1 ? "event" : "events"}`}
								selected={value === date}
								today={date === today}
								muted={date.slice(0, 7) !== value.slice(0, 7)}
								count={count}
								focusOnSelection={keyboard}
								onPress={(): void => select(date)}
								onNavigate={(key): boolean => {
									const next = calendarKeyDate(date, key);
									if (!next) return false;
									setKeyboard(true);
									onValueChange(next);
									return true;
								}}
							/>
						</View>
					);
				})}
			</View>
		</Stack>
	);
};
