import { type ReactElement, useState } from "react";
import type { PlayerCoachingState } from "../backend/use-player-coaching";
import {
	Button,
	Dialog,
	Field,
	SectionHeading,
	Select,
	Stack,
	Text,
	Toggle,
} from "../design-system";
import {
	type PlayerCoaching,
	positionOptions,
} from "../domain/player-coaching";

export const PlayerCoachingForm = ({
	profile,
	busy,
	error,
	save,
	onClose,
}: PlayerCoachingState & {
	profile: PlayerCoaching;
	onClose: () => void;
}): ReactElement => {
	const [rating, setRating] = useState(String(profile.rating));
	const [positions, setPositions] = useState(profile.positions);
	const [ageGroup, setAgeGroup] = useState(profile.ageGroup);
	const valid =
		rating.trim() &&
		Number.isFinite(Number(rating)) &&
		Number(rating) >= 1 &&
		Number(rating) <= 100;
	const submit = async (): Promise<void> => {
		if (await save({ ...profile, rating: Number(rating), positions, ageGroup }))
			onClose();
	};
	return (
		<Dialog
			title="Player details"
			staffRole="coach"
			isOpen
			onOpenChange={(open): void => {
				if (!open && !busy) onClose();
			}}
			footer={
				<Button
					label="Save"
					isLoading={busy}
					isDisabled={!valid}
					onPress={(): void => {
						void submit();
					}}
				/>
			}
		>
			<Stack>
				{error ? (
					<Text tone="danger" variant="small">
						{error}
					</Text>
				) : undefined}
				<Field
					label="Rating (1–100)"
					inputMode="decimal"
					value={rating}
					onValueChange={setRating}
					isDisabled={busy}
				/>
				<Select
					label="Age group"
					value={ageGroup}
					options={[
						{ value: "adult", label: "Adult" },
						{ value: "youth", label: "Youth" },
					]}
					onValueChange={(value): void => {
						if (value) setAgeGroup(value);
					}}
					isDisabled={busy}
				/>
				<Stack gap="sm">
					<SectionHeading>Positions</SectionHeading>
					<Stack gap="none">
						{positionOptions.map((option) => (
							<Toggle
								compact
								key={option.value}
								label={option.label}
								value={positions.includes(option.value)}
								onValueChange={(selected): void =>
									setPositions((current) =>
										selected
											? [...current, option.value]
											: current.filter((value) => value !== option.value),
									)
								}
								isDisabled={busy}
							/>
						))}
					</Stack>
				</Stack>
			</Stack>
		</Dialog>
	);
};
