import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import { Button, Row } from "../design-system";
import type { Attendance } from "../domain/club";

export const AttendanceControl = ({
	eventId,
	personId,
	name,
	value,
	disabled,
}: {
	eventId: string;
	personId: string;
	name: string;
	value: Attendance;
	disabled: boolean;
}): ReactElement => {
	const { dispatch } = useApp();
	const [pending, setPending] = useState<Attendance>();
	const mark = async (attendance: Attendance): Promise<void> => {
		if (pending) return;
		const next = value === attendance ? "unmarked" : attendance;
		setPending(next);
		await dispatch({ type: "attendance", eventId, personId, attendance: next });
		setPending(undefined);
	};
	return (
		<Row gap="xxs">
			{(
				[
					{ value: "present", label: "Here" },
					{ value: "late", label: "Late" },
					{ value: "absent", label: "No-show" },
				] as const
			).map((option) => (
				<Button
					key={option.value}
					label={option.label}
					accessibilityLabel={`${value === option.value ? "Clear" : "Mark"} ${name}: ${option.label}`}
					isSelected={value === option.value}
					variant={value === option.value ? "selection" : "ghost"}
					isDisabled={disabled || pending !== undefined}
					onPress={(): void => {
						void mark(option.value);
					}}
				/>
			))}
		</Row>
	);
};
