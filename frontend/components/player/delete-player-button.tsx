"use client";

import { useAtom } from "jotai";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import type { Player } from "@/lib/api";
import { isDarkModeAtom } from "@/lib/atoms";
import { Button } from "../shared/button";
import { ConfirmationDialog } from "../shared/confirmation-dialog";

interface DeletePlayerButtonProps {
	player: Player;
	onDelete: (playerId: number) => Promise<void>;
}

export function DeletePlayerButton({
	player,
	onDelete,
}: DeletePlayerButtonProps) {
	const [isDarkMode] = useAtom(isDarkModeAtom);
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	const handleConfirm = async () => {
		await onDelete(player.id);
		setIsDialogOpen(false);
	};

	return (
		<>
			<Button
				variant="outline"
				onClick={() => setIsDialogOpen(true)}
				className={`
					px-3 py-1.5 h-auto cursor-pointer
					${
						isDarkMode
							? "bg-transparent border-red-800 text-red-400 hover:bg-red-800/40"
							: "bg-white/60 border-red-400 text-red-600 hover:bg-red-400/20"
					}
				`}
			>
				<Trash2 className="h-3 w-3" />
			</Button>

			<ConfirmationDialog
				isOpen={isDialogOpen}
				onClose={() => setIsDialogOpen(false)}
				onConfirm={handleConfirm}
				title="Delete Player"
				message={`Are you sure you want to delete ${player.fullName}? This action cannot be undone.`}
				confirmText="Delete"
				cancelText="Cancel"
			/>
		</>
	);
}

