"use client";

import { useAtom } from "jotai";
import { useState } from "react";
import { isDarkModeAtom } from "@/lib/atoms";
import { cn } from "@/lib/utils";

interface Tab {
	id: string;
	label: string;
	content: React.ReactNode;
}

interface TabsProps {
	tabs: Tab[];
	defaultTab?: string;
	className?: string;
}

export function Tabs({ tabs, defaultTab, className }: TabsProps) {
	const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
	const [isDarkMode] = useAtom(isDarkModeAtom);

	const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.content;

	return (
		<div className={cn("w-full", className)}>
			{/* Tab Navigation */}
			<div
				className={`
        relative flex rounded-2xl p-1 backdrop-blur-xl
        ${
					isDarkMode
						? "bg-gray-900/20 border border-gray-700/50 shadow-2xl shadow-gray-900/20"
						: "bg-white/20 border border-gray-200/50 shadow-2xl shadow-gray-200/20"
				}
      `}
			>
				{tabs.map((tab) => (
					<button
						type="button"
						key={tab.id}
						onClick={() => setActiveTab(tab.id)}
						className={`
                relative z-10 flex-1 px-6 py-3 text-sm font-medium transition-all duration-300 ease-in-out
                rounded-xl backdrop-blur-sm cursor-pointer border
                ${
									activeTab === tab.id
										? isDarkMode
											? "text-white bg-gray-800/80 shadow-xl shadow-gray-800/50 border-gray-700/50"
											: "text-gray-900 bg-white/80 shadow-xl shadow-white/50 border-gray-200/50"
										: isDarkMode
											? "text-gray-400 hover:text-white hover:bg-gray-800/20 border-transparent"
											: "text-gray-600 hover:text-gray-900 hover:bg-white/20 border-transparent"
								}
              `}
					>
						{tab.label}
					</button>
				))}
			</div>

			{/* Tab Content */}
			<div 
				key={activeTab}
				className="mt-6 animate-in fade-in duration-300"
			>
				{activeTabContent}
			</div>
		</div>
	);
}
