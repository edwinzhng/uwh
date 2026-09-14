import { useMutation } from "convex/react";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { Button, Dialog, Field, Select, Stack, Text } from "../design-system";
import type { FitnessUnit } from "../domain/fitness";
import { useFitnessTask } from "./use-fitness-task";
export const FitnessTestForm = ({
	test,
	onClose,
	onSaved,
}: {
	test?: Doc<"fitnessTests">;
	onClose: () => void;
	onSaved: (id: Id<"fitnessTests">) => void;
}): ReactElement => {
	const [name, setName] = useState(test?.name ?? "");
	const [unit, setUnit] = useState<FitnessUnit>(test?.unit ?? "time");
	const save = useMutation(api.fitness.saveTest);
	const task = useFitnessTask();
	return (
		<Dialog
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
						void task.run(async () => {
							const id = await save({
								testId: test?._id,
								revision: test?.revision,
								name,
								unit,
							});
							onSaved(id);
							onClose();
						});
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
						if (value) setUnit(value);
					}}
					options={[
						{ value: "time", label: "Time (m:ss)" },
						{ value: "count", label: "Count" },
						{ value: "pass_fail", label: "Pass / fail" },
					]}
				/>
				{task.error ? <Text tone="danger">{task.error}</Text> : undefined}
			</Stack>
		</Dialog>
	);
};
