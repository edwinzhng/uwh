import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import {
	Button,
	Checkbox,
	Dialog,
	List,
	Stack,
	Text,
	Toggle,
} from "../design-system";
import { clubPrograms } from "../domain/programs";
import * as Clipboard from "../platform/clipboard";
import { useFormTask } from "./use-form-task";

export const StaffInviteForm = ({
	canGrantAdmin,
	create,
	onClose,
}: {
	canGrantAdmin: boolean;
	create: (input: {
		admin: boolean;
		coachPrograms: string[];
	}) => Promise<string>;
	onClose: () => void;
}): ReactElement => {
	const { data } = useApp();
	const task = useFormTask();
	const [admin, setAdmin] = useState(false);
	const [programs, setPrograms] = useState<string[]>([]);
	const [verified, setVerified] = useState(false);
	const [code, setCode] = useState<string>();
	const [copied, setCopied] = useState(false);
	return (
		<Dialog
			intent="form"
			title="Staff invite"
			isOpen
			isDismissDisabled={task.busy}
			onOpenChange={(open): void => {
				if (!open && !task.busy) onClose();
			}}
			footer={
				code ? (
					<Button label="Done" onPress={onClose} isDisabled={task.busy} />
				) : (
					<Button
						label="Create invite"
						isLoading={task.busy}
						onPress={(): void => {
							void task.submit(
								() =>
									!admin && !programs.length
										? "Choose staff permissions."
										: !verified
											? "Confirm who can use this invite."
											: undefined,
								async (): Promise<void> => {
									setCode(await create({ admin, coachPrograms: programs }));
								},
							);
						}}
					/>
				)
			}
		>
			<Stack>
				{code ? (
					<>
						<Text selectable>{code}</Text>
						<Text variant="small">
							Copy this code now. It is shown only once. Recipients sign in
							normally, then enter it in Invite code. It expires after 14 days
							or 5 joins.
						</Text>
						<Button
							label={copied ? "Copied" : "Copy code"}
							isDisabled={task.busy}
							onPress={(): void => {
								void task.run(async (): Promise<void> => {
									await Clipboard.setStringAsync(code);
									setCopied(true);
								});
							}}
						/>
					</>
				) : (
					<>
						<Text variant="small">
							Share privately with trusted staff. Anyone with this code can join
							with the selected permissions.
						</Text>
						{canGrantAdmin ? (
							<Toggle
								label="Club administrator"
								value={admin}
								isDisabled={task.busy}
								onValueChange={(value): void => {
									setAdmin(value);
									setVerified(false);
								}}
							/>
						) : undefined}
						<Text variant="label">Coaching access</Text>
						<List>
							{clubPrograms(data)
								.filter(
									(program) =>
										!program.archived && program.status !== "completed",
								)
								.map((program) => (
									<Checkbox
										key={program.id}
										label={program.name}
										checked={programs.includes(program.id)}
										isDisabled={task.busy}
										onChange={(checked): void => {
											setPrograms((current) =>
												checked
													? [...current, program.id]
													: current.filter((id) => id !== program.id),
											);
											setVerified(false);
										}}
									/>
								))}
						</List>
						<Toggle
							label="I will share this invite only with trusted staff"
							value={verified}
							isDisabled={task.busy}
							onValueChange={setVerified}
						/>
					</>
				)}
				{task.error ? (
					<Text variant="small" tone="danger">
						{task.error}
					</Text>
				) : undefined}
			</Stack>
		</Dialog>
	);
};
