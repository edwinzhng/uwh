import { type ReactElement, useState } from "react";
import { useFitnessActions } from "../backend/fitness-actions";
import { Button, Dialog, Field, Select, Stack, Text } from "../design-system";
import { type FitnessUnit, fitnessLowerIsBetter } from "../domain/fitness";
import {
	type FitnessTest,
	fitnessTestNameError,
} from "../domain/fitness-model";
import { useFormTask } from "./use-form-task";
export const FitnessTestForm = ({
	test,
	onClose,
	onSaved,
}: {
	test?: FitnessTest;
	onClose: () => void;
	onSaved: (id: string) => void;
}): ReactElement => {
	const [name, setName] = useState(test?.name ?? "");
	const [unit, setUnit] = useState<FitnessUnit>(test?.unit ?? "time");
	const [lowerIsBetter, setLowerIsBetter] = useState(
		test ? fitnessLowerIsBetter(test) : true,
	);
	const save = useFitnessActions().saveTest;
	const task = useFormTask();
	return (
		<Dialog
			intent="form"
			isDismissDisabled={task.busy}
			title={test ? "Edit test" : "New test"}
			isOpen
			onOpenChange={(open): void => {
				if (!open && !task.busy) onClose();
			}}
			footer={
				<Button
					label="Save"
					isLoading={task.busy}
					onPress={(): void => {
						void task.submit(
							() => fitnessTestNameError(name),
							async () => {
								const id = await save({
									testId: test?._id,
									revision: test?.revision,
									name,
									unit,
									lowerIsBetter,
								});
								onSaved(id);
								onClose();
							},
						);
					}}
				/>
			}
		>
			<Stack>
				<Field
					label="Name"
					value={name}
					onValueChange={setName}
					maxLength={100}
					isDisabled={task.busy}
				/>
				<Select
					label="Result type"
					value={unit}
					isDisabled={Boolean(test) || task.busy}
					onValueChange={(value): void => {
						if (value) {
							setUnit(value);
							setLowerIsBetter(value === "time");
						}
					}}
					options={[
						{ value: "time", label: "Time (m:ss)" },
						{ value: "distance", label: "Swim distance (m)" },
						...(test?.unit === "count"
							? [{ value: "count" as const, label: "Count (existing test)" }]
							: []),
						...(test?.unit === "pass_fail"
							? [
									{
										value: "pass_fail" as const,
										label: "Pass/fail (existing test)",
									},
								]
							: []),
					]}
				/>
				{unit === "time" || unit === "distance" ? (
					<Select
						label="Personal best"
						value={lowerIsBetter ? "lower" : "higher"}
						isDisabled={Boolean(test) || task.busy}
						options={[
							{ value: "lower", label: "Lower is better" },
							{ value: "higher", label: "Higher is better" },
						]}
						onValueChange={(value): void => setLowerIsBetter(value === "lower")}
					/>
				) : undefined}
				{task.error ? <Text tone="danger">{task.error}</Text> : undefined}
			</Stack>
		</Dialog>
	);
};
