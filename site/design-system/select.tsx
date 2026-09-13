"use client";

import * as Primitive from "@radix-ui/react-dropdown-menu";
import { type ReactElement, useCallback, useState } from "react";

export const Select = ({
	id,
	name,
	value,
	defaultValue = "",
	onValueChange,
	options,
}: {
	id?: string;
	name: string;
	value?: string;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	options: { value: string; label: string }[];
}): ReactElement => {
	const [selection, setSelection] = useState(defaultValue);
	const [open, setOpen] = useState(false);
	const [boundary, setBoundary] = useState<HTMLDialogElement>();
	const selected = value ?? selection;
	const attachTrigger = useCallback(
		(element: HTMLButtonElement | null): void => {
			setBoundary(element?.closest("dialog") ?? undefined);
		},
		[],
	);
	return (
		<>
			<input type="hidden" name={name} value={selected} />
			<Primitive.Root modal={false} open={open} onOpenChange={setOpen}>
				<Primitive.Trigger
					id={id}
					className="select-trigger"
					ref={attachTrigger}
				>
					<span>
						{options.find((option) => option.value === selected)?.label}
					</span>
					<span aria-hidden="true">⌄</span>
				</Primitive.Trigger>
				{boundary && (
					<Primitive.Portal container={boundary}>
						<Primitive.Content
							className="select-menu"
							align="start"
							sideOffset={6}
							collisionPadding={12}
							collisionBoundary={boundary}
							onEscapeKeyDown={(event): void => event.stopPropagation()}
						>
							<Primitive.RadioGroup
								value={selected}
								onValueChange={(next): void => {
									setSelection(next);
									onValueChange?.(next);
								}}
							>
								{options.map((option) => (
									<Primitive.RadioItem
										className="select-option"
										key={option.value}
										value={option.value}
										onSelect={(): void => setOpen(false)}
									>
										{option.label}
									</Primitive.RadioItem>
								))}
							</Primitive.RadioGroup>
						</Primitive.Content>
					</Primitive.Portal>
				)}
			</Primitive.Root>
		</>
	);
};
