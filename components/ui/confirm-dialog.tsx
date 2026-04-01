"use client";

import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
	open: boolean;
	title: string;
	description: string;
	confirmLabel?: string;
	onConfirm: () => void;
	onCancel: () => void;
	loading?: boolean;
	destructive?: boolean;
}

export function ConfirmDialog({
	open,
	title,
	description,
	confirmLabel = "Confirm",
	onConfirm,
	onCancel,
	loading,
	destructive,
}: ConfirmDialogProps) {
	return (
		<AlertDialogPrimitive.Root open={open}>
			<AlertDialogPrimitive.Portal>
				<AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#021e00]/60 backdrop-blur-sm" />
				<AlertDialogPrimitive.Content className="fixed z-50 left-0 right-0 bottom-0 bg-white shadow-xl sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-sm sm:w-full">
					<div className="bg-[#021e00] px-6 py-5">
						<AlertDialogPrimitive.Title className="text-[#eef4f1] text-xl font-semibold">
							{title}
						</AlertDialogPrimitive.Title>
					</div>
					<div className="px-6 py-5">
						<AlertDialogPrimitive.Description className="text-[#4a8a40] text-sm leading-relaxed">
							{description}
						</AlertDialogPrimitive.Description>
					</div>
					<div className="flex gap-3 px-6 py-5 bg-white border-t border-[#cbdbcc]">
						<AlertDialogPrimitive.Cancel asChild>
							<Button variant="outline" onClick={onCancel} className="flex-1">
								Cancel
							</Button>
						</AlertDialogPrimitive.Cancel>
						<AlertDialogPrimitive.Action asChild>
							<Button
								variant={destructive ? "destructive" : "primary"}
								onClick={onConfirm}
								loading={loading}
								className="flex-1"
							>
								{confirmLabel}
							</Button>
						</AlertDialogPrimitive.Action>
					</div>
				</AlertDialogPrimitive.Content>
			</AlertDialogPrimitive.Portal>
		</AlertDialogPrimitive.Root>
	);
}
