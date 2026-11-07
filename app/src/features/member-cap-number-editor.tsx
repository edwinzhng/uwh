import { type ReactElement, useState } from "react";
import type { MemberProfileState } from "../backend/use-member-profile";
import { useApp } from "../demo/app-state";
import {
	Button,
	Dialog,
	Field,
	Row,
	Select,
	Stack,
	Text,
} from "../design-system";
import { fitnessDivision } from "../domain/fitness-division";
import {
	memberBirthDateError,
	memberCapNumberError,
} from "../domain/member-profile";
import { useFormTask } from "./use-form-task";
import { useOperationKey } from "./use-operation-key";
import { useSeason } from "./use-season";

type Gender = "" | "male" | "female" | "other";
type CapDraft = { personId: string; name: string; revision: number };
export const MemberCapNumberEditor = ({
	state,
	compactLabel = false,
}: {
	state: MemberProfileState;
	compactLabel?: boolean;
}): ReactElement => {
	const [draft, setDraft] = useState<CapDraft>();
	const [cap, setCap] = useState("");
	const [birthDate, setBirthDate] = useState("");
	const [gender, setGender] = useState<Gender>("");
	const { data } = useApp();
	const [seasonId] = useSeason();
	const season = data.seasons.find((entry) => entry.id === seasonId);
	const task = useFormTask();
	const key = useOperationKey();
	const profile = state.profile;
	const editable = Boolean(
		profile?.canEditCapNumber &&
			(!draft || profile.personId === draft.personId),
	);
	const division = season
		? fitnessDivision(birthDate, gender || undefined, season.start)
		: undefined;
	return (
		<>
			{profile?.canEditCapNumber ? (
				<Button
					label={compactLabel ? "Edit" : "Player details"}
					accessibilityLabel={`Edit player details for ${profile.name}`}
					variant="secondary"
					compact
					onPress={(): void => {
						task.clear();
						setCap(
							profile.capNumber === undefined ? "" : String(profile.capNumber),
						);
						setBirthDate(profile.birthDate ?? "");
						setGender(
							profile.competitionGender ??
								data.playerCoaching?.find(
									(entry) => entry.personId === profile.personId,
								)?.gender ??
								"",
						);
						setDraft({
							personId: profile.personId,
							name: profile.name,
							revision: profile.revision,
						});
					}}
				/>
			) : undefined}
			{draft ? (
				<Dialog
					title={`Player details · ${draft.name}`}
					intent="form"
					isOpen
					isDismissDisabled={task.busy}
					onOpenChange={(value): void => {
						if (!value && !task.busy) setDraft(undefined);
					}}
					footer={
						<Row>
							<Button
								label="Cancel"
								variant="ghost"
								isDisabled={task.busy}
								onPress={(): void => setDraft(undefined)}
							/>
							<Button
								label="Save details"
								isDisabled={!editable}
								isLoading={task.busy}
								onPress={(): void => {
									void task.submit(
										() =>
											memberCapNumberError(cap) ??
											memberBirthDateError(birthDate),
										async (): Promise<void> => {
											await state.saveCapNumber({
												personId: draft.personId,
												capNumber: cap,
												birthDate,
												competitionGender: gender,
												revision: draft.revision,
												key: key(
													JSON.stringify({
														personId: draft.personId,
														cap,
														birthDate,
														gender,
														revision: draft.revision,
													}),
												),
											});
											setDraft(undefined);
										},
									);
								}}
							/>
						</Row>
					}
				>
					<Stack>
						<Field
							label="Cap number"
							hint="1–99"
							value={cap}
							inputMode="numeric"
							maxLength={2}
							isDisabled={task.busy || !editable}
							onValueChange={setCap}
						/>
						<Field
							label="Date of birth"
							hint="YYYY-MM-DD"
							value={birthDate}
							maxLength={10}
							isDisabled={task.busy || !editable}
							onValueChange={setBirthDate}
						/>
						<Select
							label="Fitness division"
							value={gender}
							options={[
								{ value: "", label: "Not set" },
								{ value: "male", label: "Men" },
								{ value: "female", label: "Women" },
								{ value: "other", label: "Other" },
							]}
							isDisabled={task.busy || !editable}
							onValueChange={(value): void => setGender(value ?? "")}
						/>
						<Text variant="small" tone="secondary">
							{division
								? `${season?.name}: ${division}`
								: "Add a date of birth and division to calculate the category."}
						</Text>
						{task.error ? (
							<Text variant="small" tone="danger">
								{task.error}
							</Text>
						) : undefined}
					</Stack>
				</Dialog>
			) : undefined}
		</>
	);
};
