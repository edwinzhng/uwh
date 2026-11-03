import { type ReactElement, useEffect, useState } from "react";
import { Button, Disclosure, Field, Row, Stack, Text } from "../design-system";
import { type SessionDrill, validateSessionPlan } from "../domain/session-plan";
import { SessionDrillMediaEditor } from "./session-drill-media-editor";

export const SessionDrillEditor = ({
	drill,
	index,
	count,
	disabled,
	revealErrors,
	onChange,
	onMove,
	onRemove,
}: {
	drill: SessionDrill;
	index: number;
	count: number;
	disabled: boolean;
	revealErrors: boolean;
	onChange: (drill: SessionDrill) => void;
	onMove: (direction: -1 | 1) => void;
	onRemove: () => void;
}): ReactElement => {
	const [expanded, setExpanded] = useState(!drill.title);
	const error = revealErrors
		? validateSessionPlan({ objective: "", notes: "", drills: [drill] })
		: undefined;
	useEffect(() => {
		if (error) setExpanded(true);
	}, [error]);
	return (
		<Disclosure
			title={`${index + 1}. ${drill.title || "New drill"}`}
			summary={`${drill.minutes} min`}
			isOpen={expanded || Boolean(error)}
			onOpenChange={(open): void => {
				if (!error) setExpanded(open);
			}}
			isDisabled={disabled}
		>
			<Stack gap="sm">
				{error ? (
					<Text
						tone="danger"
						variant="small"
					>{`Drill ${index + 1}${drill.title ? ` · ${drill.title}` : ""}: ${error}`}</Text>
				) : undefined}
				<Row justify="end" wrap>
					<Button
						label="Earlier"
						variant="ghost"
						isDisabled={disabled || index === 0}
						onPress={(): void => onMove(-1)}
					/>
					<Button
						label="Later"
						variant="ghost"
						isDisabled={disabled || index === count - 1}
						onPress={(): void => onMove(1)}
					/>
					<Button
						label="Remove drill"
						prefix="trash"
						variant="ghost"
						isDisabled={disabled}
						onPress={onRemove}
					/>
				</Row>
				<Field
					label="Drill name"
					value={drill.title}
					onValueChange={(title): void => onChange({ ...drill, title })}
					maxLength={120}
					isDisabled={disabled}
				/>
				<Field
					label="Minutes"
					inputMode="numeric"
					value={drill.minutes ? String(drill.minutes) : ""}
					onValueChange={(minutes): void =>
						onChange({ ...drill, minutes: Number(minutes) })
					}
					isDisabled={disabled}
				/>
				<Field
					label="Instructions"
					value={drill.instructions}
					onValueChange={(instructions): void =>
						onChange({ ...drill, instructions })
					}
					multiline
					maxLength={2000}
					isDisabled={disabled}
				/>
				<SessionDrillMediaEditor
					media={drill.media}
					onChange={(media): void => onChange({ ...drill, media })}
					disabled={disabled}
				/>
			</Stack>
		</Disclosure>
	);
};
