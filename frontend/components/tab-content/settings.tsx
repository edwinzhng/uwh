"use client";

import { useAtom } from "jotai";
import { Bell, Database, Palette, Settings, Shield } from "lucide-react";
import { isDarkModeAtom } from "@/lib/atoms";
import { Button } from "../button";
import { GlassCard } from "../glass-card";

export function SettingsTab() {
	const [isDarkMode, setIsDarkMode] = useAtom(isDarkModeAtom);

	const settings = [
		{
			icon: Palette,
			title: "Appearance",
			description: "Customize the look and feel of your application",
			action: "Customize",
		},
		{
			icon: Database,
			title: "Data Management",
			description: "Manage your data storage and backup settings",
			action: "Configure",
		},
		{
			icon: Shield,
			title: "Security",
			description: "Configure security settings and permissions",
			action: "Secure",
		},
		{
			icon: Bell,
			title: "Notifications",
			description: "Set up notification preferences",
			action: "Setup",
		},
	];

	return (
		<div className="space-y-6">
			{/* Theme Settings */}
			<GlassCard className="p-6">
				<div className="flex items-center gap-3 mb-4">
					<div
						className={`p-2 rounded-lg ${isDarkMode ? "bg-purple-900/40" : "bg-purple-100"}`}
					>
						<Palette
							className={`h-5 w-5 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`}
						/>
					</div>
					<h3
						className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}
					>
						Theme Settings
					</h3>
				</div>

				<div className="flex items-center justify-between">
					<div>
						<p
							className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}
						>
							Dark Mode
						</p>
						<p
							className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
						>
							{isDarkMode
								? "Currently using dark theme"
								: "Currently using light theme"}
						</p>
					</div>
					<Button
						onClick={() => setIsDarkMode(!isDarkMode)}
						className={`
              ${
								isDarkMode
									? "bg-gray-800 hover:bg-gray-700 text-white"
									: "bg-gray-200 hover:bg-gray-300 text-gray-900"
							}
            `}
					>
						{isDarkMode ? "Switch to Light" : "Switch to Dark"}
					</Button>
				</div>
			</GlassCard>

			{/* Settings Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{settings.map((setting, index) => (
					<GlassCard
						key={index}
						className="p-6 hover:scale-[1.02] transition-all duration-200"
					>
						<div className="flex items-start gap-4">
							<div
								className={`p-3 rounded-lg ${isDarkMode ? "bg-gray-800/40" : "bg-white/40"}`}
							>
								<setting.icon
									className={`h-5 w-5 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
								/>
							</div>
							<div className="flex-1">
								<h4
									className={`font-semibold mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}
								>
									{setting.title}
								</h4>
								<p
									className={`text-sm mb-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
								>
									{setting.description}
								</p>
								<Button
									variant="outline"
									size="sm"
									className={`
                    ${
											isDarkMode
												? "border-gray-700 text-gray-300 hover:bg-gray-800/40"
												: "border-gray-200 text-gray-700 hover:bg-white/40"
										}
                  `}
								>
									{setting.action}
								</Button>
							</div>
						</div>
					</GlassCard>
				))}
			</div>

			{/* System Info */}
			<GlassCard className="p-6">
				<div className="flex items-center gap-3 mb-4">
					<div
						className={`p-2 rounded-lg ${isDarkMode ? "bg-green-900/40" : "bg-green-100"}`}
					>
						<Settings
							className={`h-5 w-5 ${isDarkMode ? "text-green-400" : "text-green-600"}`}
						/>
					</div>
					<h3
						className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}
					>
						System Information
					</h3>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div>
						<p
							className={`text-sm font-medium ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
						>
							Frontend
						</p>
						<p
							className={`font-mono text-sm ${isDarkMode ? "text-white" : "text-gray-900"}`}
						>
							Next.js 15 + React 19
						</p>
					</div>
					<div>
						<p
							className={`text-sm font-medium ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
						>
							Backend
						</p>
						<p
							className={`font-mono text-sm ${isDarkMode ? "text-white" : "text-gray-900"}`}
						>
							Hono + Bun
						</p>
					</div>
					<div>
						<p
							className={`text-sm font-medium ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
						>
							Runtime
						</p>
						<p
							className={`font-mono text-sm ${isDarkMode ? "text-white" : "text-gray-900"}`}
						>
							Bun 1.0.0
						</p>
					</div>
				</div>
			</GlassCard>
		</div>
	);
}
