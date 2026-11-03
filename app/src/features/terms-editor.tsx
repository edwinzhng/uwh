import { type ReactElement, useState } from "react";
import type { TermsService } from "../backend/use-terms";
import {
	Button,
	Checkbox,
	Dialog,
	Field,
	List,
	Stack,
	Text,
} from "../design-system";
import { type TermsDraft, termsError } from "../domain/terms";
import { useFormTask } from "./use-form-task";
import { useOperationKey } from "./use-operation-key";

export const TermsEditor = ({
	service,
	onClose,
}: {
	service: TermsService;
	onClose: () => void;
}): ReactElement => {
	const [revision] = useState(service.state?.revision ?? 0);
	const [draft, setDraft] = useState<TermsDraft>({
		title: service.state?.policy?.title ?? "Club terms",
		version: "",
		body: service.state?.policy?.body ?? "",
	});
	const [confirmed, setConfirmed] = useState(false);
	const task = useFormTask();
	const operationKey = useOperationKey();
	const publish = (): void => {
		void task.submit(
			(): string | undefined =>
				termsError(draft) ??
				(confirmed
					? undefined
					: "Confirm that this is your club’s approved policy."),
			async (): Promise<void> => {
				await service.publish(
					draft,
					revision,
					operationKey(JSON.stringify({ draft, revision })),
					confirmed,
				);
				onClose();
			},
		);
	};
	return (
		<Dialog
			intent="form"
			isDismissDisabled={task.busy}
			title="Publish club terms"
			isOpen
			onOpenChange={(open): void => {
				if (!open && !task.busy) onClose();
			}}
			footer={
				<Button
					label="Publish new version"
					isLoading={task.busy}
					onPress={publish}
				/>
			}
		>
			<Stack>
				<Text variant="small" tone="secondary">
					Use your club’s approved legal text. Publishing requires every member
					to accept this version before continuing. Earlier acceptances stay
					attached to their original text.
				</Text>
				<Field
					label="Version"
					value={draft.version}
					onValueChange={(version): void => setDraft({ ...draft, version })}
					isDisabled={task.busy}
				/>
				<Field
					label="Title"
					value={draft.title}
					onValueChange={(title): void => setDraft({ ...draft, title })}
					isDisabled={task.busy}
				/>
				<Field
					label="Approved terms"
					value={draft.body}
					onValueChange={(body): void => setDraft({ ...draft, body })}
					multiline
					rows={8}
					maxLength={30000}
					isDisabled={task.busy}
				/>
				<List>
					<Checkbox
						label="I am authorized to publish these approved club terms"
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
			</Stack>
		</Dialog>
	);
};
