"use client";

import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import { z } from "zod";
import type { NewPlayer, Player, Position } from "@/lib/api";
import { isDarkModeAtom } from "@/lib/atoms";
import { Button } from "./button";
import { Modal } from "./modal";

const POSITIONS = [
	{ value: "FORWARD", label: "Forward" },
	{ value: "WING", label: "Wing" },
	{ value: "CENTER", label: "Center" },
	{ value: "FULL_BACK", label: "Full Back" },
] as const;

const playerSchema = z.object({
	fullName: z
		.string()
		.min(1, "Full name is required")
		.min(2, "Full name must be at least 2 characters"),
	email: z.string().min(1, "Email is required").email("Invalid email address"),
	positions: z
		.array(z.enum(["FORWARD", "WING", "CENTER", "FULL_BACK"]))
		.min(1, "At least one position is required"),
	rating: z
		.number()
		.min(1, "Rating must be at least 1")
		.max(10, "Rating must be at most 10"),
	youth: z.boolean().optional(),
});

interface AddPlayerModalProps {
	isOpen: boolean;
	onClose: () => void;
	onPlayerAdded: (player: NewPlayer) => Promise<void>;
	onPlayerUpdated: (id: number, player: Partial<NewPlayer>) => Promise<void>;
	isLoading: boolean;
	editingPlayer?: Player | null;
}

export function AddPlayerModal({
	isOpen,
	onClose,
	onPlayerAdded,
	onPlayerUpdated,
	isLoading,
	editingPlayer,
}: AddPlayerModalProps) {
	const [isDarkMode] = useAtom(isDarkModeAtom);
	const [newPlayer, setNewPlayer] = useState<NewPlayer>({
		fullName: "",
		email: "",
		positions: [],
		rating: undefined,
		youth: false,
	});
	const [validationErrors, setValidationErrors] = useState<
		Record<string, string>
	>({});

	// Populate form when editing
	useEffect(() => {
		if (editingPlayer) {
			setNewPlayer({
				fullName: editingPlayer.fullName,
				email: editingPlayer.email,
				positions: editingPlayer.positions,
				rating: editingPlayer.rating,
				youth: editingPlayer.youth,
			});
		} else {
			setNewPlayer({
				fullName: "",
				email: "",
				positions: [],
				rating: undefined,
				youth: false,
			});
		}
		setValidationErrors({});
	}, [editingPlayer]);

	const handleSubmit = async () => {
		try {
			const validated = playerSchema.parse(newPlayer);
			setValidationErrors({});

			if (editingPlayer) {
				await onPlayerUpdated(editingPlayer.id, validated);
			} else {
				await onPlayerAdded(validated);
			}

			// Reset form
			setNewPlayer({
				fullName: "",
				email: "",
				positions: [],
				rating: undefined,
				youth: false,
			});
		} catch (err) {
			if (err instanceof z.ZodError) {
				const errors: Record<string, string> = {};
				err.errors.forEach((error) => {
					if (error.path[0]) {
						errors[error.path[0].toString()] = error.message;
					}
				});
				setValidationErrors(errors);
			}
		}
	};

	const handleClose = () => {
		setValidationErrors({});
		setNewPlayer({
			fullName: "",
			email: "",
			positions: [],
			rating: undefined,
			youth: false,
		});
		onClose();
	};

	return (
		<Modal
			isOpen={isOpen}
			onClose={handleClose}
			title={editingPlayer ? "Edit Player" : "Add New Player"}
		>
			<div className="space-y-4">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
					<div className="lg:col-span-2">
						<label
							htmlFor="player-full-name"
							className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
						>
							Full Name
						</label>
						<input
							id="player-full-name"
							type="text"
							placeholder="Enter full name"
							value={newPlayer.fullName}
							onChange={(e) => {
								setNewPlayer((prev) => ({
									...prev,
									fullName: e.target.value,
								}));
								setValidationErrors((prev) => ({ ...prev, fullName: "" }));
							}}
							className={`
								w-full px-4 py-3 rounded-xl border transition-all duration-200
								${
									validationErrors.fullName
										? "border-red-500 focus:ring-red-500/20"
										: isDarkMode
											? "bg-gray-800/40 border-gray-700/50 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
											: "bg-white/40 border-gray-200/50 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
								}
								backdrop-blur-sm
							`}
						/>
						{validationErrors.fullName && (
							<p className="text-red-500 text-xs mt-1">
								{validationErrors.fullName}
							</p>
						)}
					</div>
					<div className="lg:col-span-2">
						<label
							htmlFor="player-email"
							className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
						>
							Email
						</label>
						<input
							id="player-email"
							type="email"
							placeholder="Enter email"
							value={newPlayer.email ?? undefined}
							disabled={!!editingPlayer}
							onChange={(e) => {
								setNewPlayer((prev) => ({ ...prev, email: e.target.value }));
								setValidationErrors((prev) => ({ ...prev, email: "" }));
							}}
							className={`
								w-full px-4 py-3 rounded-xl border transition-all duration-200
								${editingPlayer ? "opacity-60 cursor-not-allowed" : ""}
								${
									validationErrors.email
										? "border-red-500 focus:ring-red-500/20"
										: isDarkMode
											? "bg-gray-800/40 border-gray-700/50 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
											: "bg-white/40 border-gray-200/50 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
								}
								backdrop-blur-sm
							`}
						/>
						{validationErrors.email && (
							<p className="text-red-500 text-xs mt-1">
								{validationErrors.email}
							</p>
						)}
					</div>
					<div>
						<label
							htmlFor="player-rating"
							className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
						>
							Rating (1-10)
						</label>
						<input
							id="player-rating"
							type="number"
							min="1"
							max="10"
							placeholder="1-10"
							value={newPlayer.rating ?? ""}
							onChange={(e) => {
								const value =
									e.target.value === "" ? undefined : parseInt(e.target.value);
								setNewPlayer((prev) => ({
									...prev,
									rating: value,
								}));
								setValidationErrors((prev) => ({ ...prev, rating: "" }));
							}}
							className={`
								w-full px-4 py-3 rounded-xl border transition-all duration-200
								${
									validationErrors.rating
										? "border-red-500 focus:ring-red-500/20"
										: isDarkMode
											? "bg-gray-800/40 border-gray-700/50 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
											: "bg-white/40 border-gray-200/50 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
								}
								backdrop-blur-sm
							`}
						/>
						{validationErrors.rating && (
							<p className="text-red-500 text-xs mt-1">
								{validationErrors.rating}
							</p>
						)}
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label
							htmlFor="player-positions"
							className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
						>
							Positions
						</label>
						<div
							className={`
								p-4 rounded-xl border backdrop-blur-sm
								${
									validationErrors.positions
										? "border-red-500"
										: isDarkMode
											? "bg-gray-800/40 border-gray-700/50"
											: "bg-white/40 border-gray-200/50"
								}
							`}
						>
							<div className="grid grid-cols-2 gap-2">
								{POSITIONS.map((pos) => (
									<label
										key={pos.value}
										className={`
											flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200
											${
												newPlayer.positions.includes(pos.value as Position)
													? isDarkMode
														? "bg-blue-600/80 text-white border border-blue-500"
														: "bg-blue-600 text-white border border-blue-500"
													: isDarkMode
														? "bg-gray-700/40 text-gray-300 border border-gray-600/50 hover:bg-gray-700/60"
														: "bg-white/60 text-gray-700 border border-gray-300/50 hover:bg-white/80"
											}
										`}
									>
										<input
											type="checkbox"
											checked={newPlayer.positions.includes(
												pos.value as Position,
											)}
											onChange={(e) => {
												setNewPlayer((prev) => ({
													...prev,
													positions: e.target.checked
														? [...prev.positions, pos.value as Position]
														: prev.positions.filter((p) => p !== pos.value),
												}));
												setValidationErrors((prev) => ({
													...prev,
													positions: "",
												}));
											}}
											className="sr-only"
										/>
										<span className="text-sm font-medium">{pos.label}</span>
									</label>
								))}
							</div>
						</div>
						{validationErrors.positions && (
							<p className="text-red-500 text-xs mt-1">
								{validationErrors.positions}
							</p>
						)}
					</div>

					<div>
						<label
							htmlFor="player-youth"
							className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
						>
							Player Type
						</label>
						<div className="flex gap-2 h-12">
							<button
								type="button"
								onClick={() =>
									setNewPlayer((prev) => ({ ...prev, youth: false }))
								}
								className={`
									flex-1 px-4 py-3 rounded-xl border transition-all duration-200 cursor-pointer backdrop-blur-sm
									${
										!newPlayer.youth
											? isDarkMode
												? "bg-blue-600/80 text-white border-blue-500"
												: "bg-blue-600 text-white border-blue-500"
											: isDarkMode
												? "bg-gray-800/40 border-gray-700/50 text-gray-300 hover:bg-gray-800/60"
												: "bg-white/40 border-gray-200/50 text-gray-700 hover:bg-white/60"
									}
								`}
							>
								<span className="text-sm font-medium">Adult</span>
							</button>
							<button
								type="button"
								onClick={() =>
									setNewPlayer((prev) => ({ ...prev, youth: true }))
								}
								className={`
									flex-1 px-4 py-3 rounded-xl border transition-all duration-200 cursor-pointer backdrop-blur-sm
									${
										newPlayer.youth
											? isDarkMode
												? "bg-blue-600/80 text-white border-blue-500"
												: "bg-blue-600 text-white border-blue-500"
											: isDarkMode
												? "bg-gray-800/40 border-gray-700/50 text-gray-300 hover:bg-gray-800/60"
												: "bg-white/40 border-gray-200/50 text-gray-700 hover:bg-white/60"
									}
								`}
							>
								<span className="text-sm font-medium">Youth</span>
							</button>
						</div>
					</div>
				</div>
			</div>

			<Button
				onClick={handleSubmit}
				disabled={isLoading}
				className="mt-4 bg-blue-600 hover:bg-blue-700 text-white w-full"
			>
				{isLoading
					? editingPlayer
						? "Updating..."
						: "Creating..."
					: editingPlayer
						? "Update Player"
						: "Add Player"}
			</Button>
		</Modal>
	);
}
