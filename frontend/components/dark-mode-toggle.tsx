"use client";

import { useAtom } from "jotai";
import { Moon, Sun } from "lucide-react";
import { isDarkModeAtom } from "@/lib/atoms";

export function DarkModeToggle() {
	const [isDarkMode, setIsDarkMode] = useAtom(isDarkModeAtom);

	const toggleDarkMode = () => {
		setIsDarkMode(!isDarkMode);
	};

	return (
		<button
			type="button"
			onClick={toggleDarkMode}
			className={`
        relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 ease-in-out cursor-pointer
        ${
					isDarkMode
						? "bg-gray-800 shadow-lg shadow-gray-800/50"
						: "bg-gray-200 shadow-lg shadow-gray-200/50"
				}
        hover:scale-105 active:scale-95
      `}
			aria-label="Toggle dark mode"
		>
			<span
				className={`
          inline-flex h-6 w-6 transform rounded-full transition-all duration-300 ease-in-out
          ${isDarkMode ? "translate-x-7 bg-white" : "translate-x-1 bg-gray-600"}
          items-center justify-center
        `}
			>
				{isDarkMode ? (
					<Moon className="h-3 w-3 text-gray-800" />
				) : (
					<Sun className="h-3 w-3 text-white" />
				)}
			</span>
		</button>
	);
}
