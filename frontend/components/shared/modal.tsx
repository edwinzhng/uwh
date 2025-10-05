"use client";

import { useAtom } from "jotai";
import { X } from "lucide-react";
import { useEffect } from "react";
import { isDarkModeAtom } from "@/lib/atoms";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
	const [isDarkMode] = useAtom(isDarkModeAtom);

	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "unset";
		}
		return () => {
			document.body.style.overflow = "unset";
		};
	}, [isOpen]);

	// Handle Escape key
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) {
				onClose();
			}
		};

		document.addEventListener("keydown", handleEscape);
		return () => document.removeEventListener("keydown", handleEscape);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
		{/* Backdrop */}
		<div
			className={`
				absolute inset-0 backdrop-blur-sm transition-opacity
				${isDarkMode ? "bg-black/60" : "bg-black/40"}
			`}
			onClick={onClose}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					onClose();
				}
			}}
			role="button"
			tabIndex={0}
			aria-label="Close modal"
		/>

			{/* Modal */}
			<div
				className={`
					relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border backdrop-blur-xl shadow-2xl z-10
					${
						isDarkMode
							? "bg-gray-900/95 border-gray-700/50"
							: "bg-white/95 border-gray-200/50"
					}
				`}
			>
				{/* Header */}
				<div
					className={`
						sticky top-0 z-10 flex items-center justify-between p-6 border-b backdrop-blur-xl
						${
							isDarkMode
								? "bg-gray-900/95 border-gray-700/50"
								: "bg-white/95 border-gray-200/50"
						}
					`}
				>
					<h2
						className={`text-xl font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}
					>
						{title}
					</h2>
					<button
						type="button"
						onClick={onClose}
						className={`
							p-2 rounded-lg transition-all duration-200
							${
								isDarkMode
									? "hover:bg-gray-800/60 text-gray-400 hover:text-white"
									: "hover:bg-gray-100 text-gray-600 hover:text-gray-900"
							}
						`}
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Content */}
				<div className="p-6">{children}</div>
			</div>
		</div>
	);
}
