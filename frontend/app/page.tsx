"use client";

import { useAtom } from "jotai";
import Image from "next/image";
import { Suspense, useEffect } from "react";
import { DarkModeToggle } from "@/components/shared/dark-mode-toggle";
import { FadeIn } from "@/components/shared/fade-in";
import { CoachesTab } from "@/components/tab-content/coaches";
import { PlayersTab } from "@/components/tab-content/players";
import { PracticesTab } from "@/components/tab-content/practices";
import { Tabs } from "@/components/tabs";
import { isDarkModeAtom } from "@/lib/atoms";

export default function Home() {
	const [isDarkMode] = useAtom(isDarkModeAtom);

	// Update data-theme attribute for smooth transitions
	useEffect(() => {
		document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
	}, [isDarkMode]);

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
		{
			id: "coaches",
			label: "Coaches",
			content: <CoachesTab />,
		},
	];

	return (
		<div className="min-h-screen relative">
			{/* Fixed Background */}
			<div
				className={`
					fixed inset-0 -z-10 transition-colors duration-300 ease-in-out
					${
						isDarkMode
							? "bg-gradient-to-br from-gray-900 via-gray-800 to-black"
							: "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"
					}
				`}
				style={{ willChange: 'background' }}
			>
				{/* Background Effects - Using transform for better GPU acceleration */}
				<div className="absolute inset-0 overflow-hidden pointer-events-none">
					<div
						className={`
							absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20 blur-3xl transition-colors duration-300
							${isDarkMode ? "bg-blue-500" : "bg-blue-400"}
						`}
						style={{ willChange: 'background-color' }}
					/>
					<div
						className={`
							absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-20 blur-3xl transition-colors duration-300
							${isDarkMode ? "bg-purple-500" : "bg-purple-400"}
						`}
						style={{ willChange: 'background-color' }}
					/>
					<div
						className={`
							absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10 blur-3xl transition-colors duration-300
							${isDarkMode ? "bg-indigo-500" : "bg-indigo-400"}
						`}
						style={{ willChange: 'background-color' }}
					/>
				</div>
			</div>

			{/* Header */}
			<div className="relative z-10 p-6">
				<div className="max-w-7xl mx-auto">
					<FadeIn>
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
										className={`text-4xl font-thin tracking-tight ${isDarkMode ? "text-white" : "text-gray-900"}`}
									>
										Underwater Hockey
									</h1>
								</div>
							</div>
							<DarkModeToggle />
						</div>
					</FadeIn>

					{/* Main Content */}
					<div className="max-w-6xl mx-auto">
						<Suspense
							fallback={<div className="text-center py-8">Loading...</div>}
						>
							<Tabs tabs={tabs} defaultTab="players" />
						</Suspense>
					</div>
				</div>
			</div>
		</div>
	);
}
