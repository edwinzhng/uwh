"use client";

import { useAtom } from "jotai";
import type { Player } from "@/lib/api";
import { isDarkModeAtom } from "@/lib/atoms";
import { Button } from "../shared/button";

interface EditPlayerButtonProps {
	player: Player;
	onClick: (player: Player) => void;
}

export function EditPlayerButton({
	player,
	onClick,
}: EditPlayerButtonProps) {
	const [isDarkMode] = useAtom(isDarkModeAtom);

	return (
		<Button
			variant="outline"
			onClick={() => onClick(player)}
			className={`
				px-3 py-1.5 h-auto cursor-pointer
				${
					isDarkMode
						? "bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800/40"
						: "bg-white/60 border-gray-200 text-gray-700 hover:bg-white/40"
				}
			`}
		>
			Edit
		</Button>
	);
}
