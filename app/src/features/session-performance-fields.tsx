import type { ReactElement } from "react";
import {
	AudienceLabel,
	Button,
	Field,
	Select,
	Stack,
	Text,
} from "../design-system";
import type { useFormTask } from "./use-form-task";
import type { useSessionPerformanceForm } from "./use-session-performance-form";

export const SessionPerformanceFields = ({
	task,
	form,
}: {
	task: ReturnType<typeof useFormTask>;
	form: ReturnType<typeof useSessionPerformanceForm>;
}): ReactElement => (
	<Stack>
		<Select
			label="Session performance · 1–10"
			value={form.rating}
			onValueChange={form.setRating}
			placeholder="Choose a rating"
			isDisabled={task.busy || form.readOnly}
			options={Array.from({ length: 10 }, (_, index) => ({
				value: String(index + 1),
				label: `${index + 1} / 10`,
			}))}
		/>
		<Field
			label="Reflection · optional"
			value={form.comments}
			onValueChange={form.setComments}
			multiline
			maxLength={2000}
			isDisabled={task.busy || form.readOnly}
		/>
		<AudienceLabel audience="personal" />
		<Text variant="small" tone="secondary">
			Visible to you, your linked guardians and club coaches.
		</Text>
		{form.changed ? (
			<Button
				label="Reload saved rating"
				variant="secondary"
				isDisabled={task.busy}
				onPress={form.reload}
			/>
		) : undefined}
		{form.readOnly ? (
			<Text tone="secondary">This session rating is read-only.</Text>
		) : undefined}
		{task.error ? <Text tone="danger">{task.error}</Text> : undefined}
	</Stack>
);
