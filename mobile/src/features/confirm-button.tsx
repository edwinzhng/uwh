import { type ComponentProps, type ReactElement, useState } from "react";
import { Button } from "../design-system";
import {
	ConfirmationDialog,
	type ConfirmationProps,
} from "./confirmation-dialog";

export const ConfirmButton = ({
	label,
	variant,
	isDisabled,
	validationError,
	title,
	description,
	confirmLabel,
	danger,
	onConfirm,
}: ConfirmationProps & {
	label: string;
	variant?: ComponentProps<typeof Button>["variant"];
}): ReactElement => {
	const [open, setOpen] = useState(false);
	return (
		<>
			<Button
				label={label}
				variant={variant}
				isDisabled={isDisabled}
				validationError={validationError}
				onPress={(): void => setOpen(true)}
			/>
			{open ? (
				<ConfirmationDialog
					title={title}
					description={description}
					confirmLabel={confirmLabel}
					danger={danger}
					onConfirm={onConfirm}
					isDisabled={isDisabled}
					validationError={validationError}
					onClose={(): void => setOpen(false)}
				/>
			) : undefined}
		</>
	);
};
