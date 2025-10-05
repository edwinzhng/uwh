"use client";

import { useAtom } from "jotai";
import Image from "next/image";
import { DarkModeToggle } from "@/components/dark-mode-toggle";
import { PlayersTab } from "@/components/tab-content/players";
import { PracticesTab } from "@/components/tab-content/practices";
import { Tabs } from "@/components/tabs";
import { isDarkModeAtom } from "@/lib/atoms";

export default function Home() {
	const [isDarkMode] = useAtom(isDarkModeAtom);

	const tabs = [
		{
			id: "players",
			label: "Players",
			content: <PlayersTab />,
		},
		{
			id: "practices",
			label: "Practices",
			content: <PracticesTab />,
		},
	];

	return (
		<div className="min-h-screen relative">
			{/* Fixed Background */}
			<div
				className={`
					fixed inset-0 transition-all duration-500 ease-in-out -z-10
					${
						isDarkMode
							? "bg-gradient-to-br from-gray-900 via-gray-800 to-black"
							: "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"
					}
				`}
			>
				{/* Background Effects */}
				<div className="absolute inset-0 overflow-hidden pointer-events-none">
					<div
						className={`
							absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20 blur-3xl
							${isDarkMode ? "bg-blue-500" : "bg-blue-400"}
						`}
					/>
					<div
						className={`
							absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-20 blur-3xl
							${isDarkMode ? "bg-purple-500" : "bg-purple-400"}
						`}
					/>
					<div
						className={`
							absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10 blur-3xl
							${isDarkMode ? "bg-indigo-500" : "bg-indigo-400"}
						`}
					/>
				</div>
			</div>

			{/* Header */}
			<div className="relative z-10 p-6">
				<div className="max-w-7xl mx-auto">
					<div className="flex items-center justify-between mb-8">
						<div className="flex items-center gap-4">
							<div
								className={`
                p-3 rounded-2xl backdrop-blur-xl
                ${
									isDarkMode
										? "bg-gray-900/20 border border-gray-700/50 shadow-2xl shadow-gray-900/20"
										: "bg-white/20 border border-gray-200/50 shadow-2xl shadow-gray-200/20"
								}
              `}
							>
								<Image
									src="/crocs.svg"
									alt="Underwater Hockey"
									width={32}
									height={32}
									className="h-8 w-8"
								/>
							</div>
							<div>
								<h1
									className={`text-4xl font-thin ${isDarkMode ? "text-white" : "text-gray-900"}`}
								>
									Underwater Hockey
								</h1>
							</div>
						</div>
						<DarkModeToggle />
					</div>

					{/* Main Content */}
					<div className="max-w-6xl mx-auto">
						<Tabs tabs={tabs} defaultTab="players" />
					</div>
				</div>
			</div>
		</div>
	);
}
