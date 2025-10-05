"use client";

import { useAtom } from "jotai";
import type { Player } from "@/lib/api";
import { isDarkModeAtom } from "@/lib/atoms";
import { Button } from "../shared/button";

interface DeletePlayerButtonProps {
	player: Player;
	onClick: (player: Player) => void;
}

export function DeletePlayerButton({
	player,
	onClick,
}: DeletePlayerButtonProps) {
	const [isDarkMode] = useAtom(isDarkModeAtom);

	return (
		<Button
			variant="outline"
			onClick={() => onClick(player)}
			className={`
				px-3 py-1.5 h-auto cursor-pointer
				${
					isDarkMode
						? "bg-transparent border-red-800 text-red-400 hover:bg-red-800/40"
						: "bg-white/60 border-red-400 text-red-600 hover:bg-red-400/20"
				}
			`}
		>
			Delete
		</Button>
	);
}

