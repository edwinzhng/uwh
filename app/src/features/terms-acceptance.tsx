import { type ReactElement, useState } from "react";
import type { TermsService } from "../backend/use-terms";
import { Button, Checkbox, List, Stack, Text } from "../design-system";
import type { TermsPolicy as Policy } from "../domain/terms";
import { TermsPolicy } from "./terms-policy";
import { useFormTask } from "./use-form-task";

export const TermsAcceptance = ({
	policy,
	accept,
}: {
	policy: Policy;
	accept: TermsService["accept"];
}): ReactElement => {
	const [confirmed, setConfirmed] = useState(false);
	const task = useFormTask();
	return (
		<Stack>
			<TermsPolicy policy={policy} />
			<List>
				<Checkbox
					label="I have read and agree to the displayed terms"
					checked={confirmed}
					onChange={setConfirmed}
					isDisabled={task.busy}
				/>
			</List>
			{task.error ? (
				<Text tone="danger" variant="small">
					{task.error}
				</Text>
			) : undefined}
			<Button
				label="Agree and continue"
				isLoading={task.busy}
				onPress={(): void => {
					void task.submit(
						(): string | undefined =>
							confirmed
								? undefined
								: "Confirm that you agree before continuing.",
						async (): Promise<void> => accept(policy.id, confirmed),
					);
				}}
			/>
		</Stack>
	);
};
