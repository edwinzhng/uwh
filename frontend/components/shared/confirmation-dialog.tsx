"use client";

import { useAtom } from "jotai";
import { AlertTriangle } from "lucide-react";
import { isDarkModeAtom } from "@/lib/atoms";
import { Button } from "./button";
import { Modal } from "./modal";

interface ConfirmationDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	title: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	isDestructive?: boolean;
}

export function ConfirmationDialog({
	isOpen,
	onClose,
	onConfirm,
	title,
	message,
	confirmText = "Confirm",
	cancelText = "Cancel",
	isDestructive = false,
}: ConfirmationDialogProps) {
	const [isDarkMode] = useAtom(isDarkModeAtom);

	const handleConfirm = () => {
		onConfirm();
		onClose();
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title={title}>
			<div className="space-y-6">
				<div className="flex items-center gap-3">
					{isDestructive && (
						<AlertTriangle
							className={`h-5 w-5 flex-shrink-0 ${
								isDarkMode ? "text-red-400" : "text-red-600"
							}`}
						/>
					)}
					<p
						className={`flex-1 ${
							isDarkMode ? "text-gray-300" : "text-gray-700"
						}`}
					>
						{message}
					</p>
				</div>

				<div className="flex gap-3 justify-end">
					<Button
						variant="outline"
						onClick={onClose}
						className={`
							${
								isDarkMode
									? "bg-gray-800/40 border-gray-700 text-gray-300 hover:bg-gray-800/60"
									: "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
							}
						`}
					>
						{cancelText}
					</Button>
					<Button
						onClick={handleConfirm}
						className={
							isDestructive
								? isDarkMode
									? "bg-red-800/60 hover:bg-red-800/80 text-white"
									: "bg-red-400 hover:bg-red-500 text-white"
								: "bg-blue-600 hover:bg-blue-700 text-white"
						}
					>
						{confirmText}
					</Button>
				</div>
			</div>
		</Modal>
	);
}

