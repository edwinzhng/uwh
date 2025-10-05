"use client";

import { useAtom } from "jotai";
import { Users } from "lucide-react";
import { isDarkModeAtom } from "@/lib/atoms";
import { Modal } from "../shared/modal";

interface MakeTeamsModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export function MakeTeamsModal({ isOpen, onClose }: MakeTeamsModalProps) {
	const [isDarkMode] = useAtom(isDarkModeAtom);

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Make Teams">
			<div className="text-center py-8">
				<Users
					className={`h-12 w-12 mx-auto mb-4 ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}
				/>
				<p
					className={`text-lg font-thin ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
				>
					Coming soon
				</p>
				<p className={`text-sm ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
					Team creation feature will be available here
				</p>
			</div>
		</Modal>
	);
}

