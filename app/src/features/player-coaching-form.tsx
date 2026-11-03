import { type ReactElement, useState } from "react";
import type { PlayerCoachingState } from "../backend/use-player-coaching";
import { useApp } from "../demo/app-state";
import {
	Button,
	Dialog,
	SectionHeading,
	Select,
	Stack,
	Text,
	Toggle,
} from "../design-system";
import { memberName } from "../domain/app-rules";
import {
	coachingGenderOptions,
	type PlayerCoaching,
	playerRatingLabel,
	positionOptions,
} from "../domain/player-coaching";
import { useFormTask } from "./use-form-task";

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
	const { data } = useApp();
	const [positions, setPositions] = useState(profile.positions);
	const [ageGroup, setAgeGroup] = useState(profile.ageGroup);
	const [gender, setGender] = useState(profile.gender);
	const task = useFormTask();
	const saving = busy || task.busy;
	const submit = async (): Promise<void> => {
		await task.submit(
			() => undefined,
			async (): Promise<void> => {
				if (
					await save({
						...profile,
						positions,
						ageGroup,
						gender,
					})
				)
					onClose();
			},
		);
	};
	return (
		<Dialog
			intent="form"
			isDismissDisabled={saving}
			title={`Player details · ${memberName(data, profile.personId)}`}
			isOpen
			onOpenChange={(open): void => {
				if (!open && !saving) onClose();
			}}
			footer={
				<Button
					label="Save"
					isLoading={saving}
					onPress={(): void => {
						void submit();
					}}
				/>
			}
		>
			<Stack>
				{task.error || error ? (
					<Text tone="danger" variant="small">
						{task.error ?? error}
					</Text>
				) : undefined}
				<Text variant="small" tone="secondary">
					Team rating · {playerRatingLabel(profile)}. Add or update your own
					score in Members → Rankings.
				</Text>
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
					isDisabled={saving}
				/>
				<Stack gap="sm">
					<Select
						label="Gender (optional, coaching only)"
						value={gender ?? "unspecified"}
						options={coachingGenderOptions}
						isDisabled={saving}
						onValueChange={(value): void =>
							setGender(value === "unspecified" ? undefined : value)
						}
					/>
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
								isDisabled={saving}
							/>
						))}
					</Stack>
				</Stack>
			</Stack>
		</Dialog>
	);
};
