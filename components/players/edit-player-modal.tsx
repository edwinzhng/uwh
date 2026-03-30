"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

export type Player = Doc<"players">;
export type Position = "FORWARD" | "WING" | "CENTER" | "FULL_BACK";

const POSITIONS: {
	value: Position;
	label: string;
	short: string;
	sub: string;
}[] = [
	{ value: "FORWARD", label: "Forward", short: "F", sub: "FWD" },
	{ value: "WING", label: "Wing", short: "W", sub: "WING" },
	{ value: "CENTER", label: "Center", short: "C", sub: "CTR" },
	{ value: "FULL_BACK", label: "Full Back", short: "FB", sub: "BACK" },
];

interface EditPlayerModalProps {
	player: Player;
	onClose: () => void;
	onSaved: (updated: Player) => void;
}

export function EditPlayerModal({
	player,
	onClose,
	onSaved,
}: EditPlayerModalProps) {
	const [fullName, setFullName] = useState(player.fullName);
	const [rating, setRating] = useState(player.rating);
	const [ratingText, setRatingText] = useState(String(player.rating));
	const [positions, setPositions] = useState<Position[]>([...player.positions]);
	const [youth, setYouth] = useState(player.youth);
	const [isCoach, setIsCoach] = useState(false);
	const [saving, setSaving] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});

	// Coach check
	const coach = useQuery(api.coaches.getCoachByPlayerId, {
		playerId: player._id,
	});

	useEffect(() => {
		if (coach) setIsCoach(true);
	}, [coach]);

	const togglePosition = (pos: Position) => {
		setPositions((prev) =>
			prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos],
		);
	};

	const updatePlayer = useMutation(api.players.updatePlayer);
	const createCoach = useMutation(api.coaches.createCoach);
	const deleteCoach = useMutation(api.coaches.deleteCoach);

	const handleSave = async () => {
		const errs: Record<string, string> = {};
		if (!fullName.trim()) errs.fullName = "Name is required";
		if (positions.length === 0) errs.positions = "Select at least one position";
		if (Object.keys(errs).length > 0) {
			setErrors(errs);
			return;
		}
		setSaving(true);
		try {
			await updatePlayer({
				id: player._id,
				fullName: fullName.trim(),
				positions,
				rating,
				youth,
			});

			// Handle coach status
			if (isCoach && !coach) {
				await createCoach({ playerId: player._id });
			} else if (!isCoach && coach) {
				await deleteCoach({ id: coach._id });
			}

			onSaved({
				...player,
				fullName: fullName.trim(),
				positions,
				rating,
				youth,
			});
		} catch (err) {
			console.error(err);
			setSaving(false);
		}
	};

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent subtitle="Player Profile" title="Edit Player">
				<div className="px-6 pt-5 pb-4 space-y-5">
					{/* Full name */}
					<div>
						<label
							htmlFor="fullName"
							className="block text-[10px] font-semibold tracking-[0.1em] uppercase text-[#4a8a40] mb-1.5"
						>
							Full Name{" "}
							<span className="text-[#8aab8a] font-normal normal-case tracking-normal">
								— from SportEasy
							</span>
						</label>
						<div className="relative">
							<input
								id="fullName"
								value={fullName}
								onChange={(e) => setFullName(e.target.value)}
								className="w-full h-11 border border-[#cbdbcc] bg-white px-3 text-sm text-[#021e00] focus:outline-none focus:border-[#298a29]"
							/>
						</div>
						{errors.fullName && (
							<p className="text-red-500 text-xs mt-1">{errors.fullName}</p>
						)}
					</div>

					{/* Rating slider */}
					<div>
						<label
							htmlFor="rating"
							className="block text-[10px] font-semibold tracking-[0.1em] uppercase text-[#4a8a40] mb-1.5"
						>
							Rating
						</label>
						<div className="flex items-center gap-4">
							<input
								id="rating"
								type="range"
								min={1}
								max={100}
								value={rating}
								onChange={(e) => {
									const v = Number(e.target.value);
									setRating(v);
									setRatingText(String(v));
								}}
								className="flex-1 h-1 bg-[#cbdbcc] appearance-none cursor-pointer"
								style={{
									background: `linear-gradient(to right, #021e00 0%, #021e00 ${((rating - 1) / 99) * 100}%, #cbdbcc ${((rating - 1) / 99) * 100}%, #cbdbcc 100%)`,
								}}
							/>
							<div className="flex items-baseline gap-0.5">
								<input
									type="number"
									min={1}
									max={100}
									value={ratingText}
									onChange={(e) => setRatingText(e.target.value)}
									onBlur={(e) => {
										const v = Math.min(
											100,
											Math.max(1, Number(e.target.value) || 1),
										);
										setRating(v);
										setRatingText(String(v));
									}}
									className="w-14 text-right text-[#021e00] text-2xl font-bold bg-transparent border-b border-transparent hover:border-[#cbdbcc] focus:border-[#021e00] focus:outline-none"
								/>
								<span className="text-[#8aab8a] text-sm">/100</span>
							</div>
						</div>
						<div className="flex justify-between mt-1">
							<span className="text-[10px] text-[#8aab8a]">1 — Beginner</span>
							<span className="text-[10px] text-[#8aab8a]">100 — Elite</span>
						</div>
					</div>

					{/* Positions */}
					<div>
						<span className="block text-[10px] font-semibold tracking-[0.1em] uppercase text-[#4a8a40] mb-1.5">
							Positions{" "}
							<span className="text-[#8aab8a] font-normal normal-case tracking-normal">
								— select all that apply
							</span>
						</span>
						{errors.positions && (
							<p className="text-red-500 text-xs mb-1">{errors.positions}</p>
						)}
						<div className="grid grid-cols-4 gap-2">
							{POSITIONS.map((pos) => {
								const active = positions.includes(pos.value);
								return (
									<button
										key={pos.value}
										type="button"
										onClick={() => togglePosition(pos.value)}
										className={cn(
											"flex flex-col items-center justify-center py-4 border",
											active
												? "bg-[#021e00] text-[#eef4f1] border-[#021e00]"
												: "bg-white text-[#021e00] border-[#cbdbcc] hover:border-[#021e00]",
										)}
									>
										<span className="text-xl font-bold leading-none">
											{pos.short}
										</span>
										<span
											className={cn(
												"text-[9px] tracking-[0.1em] uppercase mt-1",
												active ? "text-[#8aab8a]" : "text-[#cbdbcc]",
											)}
										>
											{pos.sub}
										</span>
										<span
											className={cn(
												"mt-2 h-3.5 w-3.5 border flex items-center justify-center",
												active
													? "border-[#298a29] bg-[#298a29]"
													: "border-[#cbdbcc]",
											)}
										>
											{active && (
												<svg
													aria-hidden="true"
													viewBox="0 0 8 6"
													className="h-2 w-2 stroke-white fill-none stroke-[1.5]"
												>
													<path d="M1 3L3.5 5.5L7 1" />
												</svg>
											)}
										</span>
									</button>
								);
							})}
						</div>
					</div>

					{/* Player type toggle */}
					<div>
						<span className="block text-[10px] font-semibold tracking-[0.1em] uppercase text-[#4a8a40] mb-1.5">
							Player Type
						</span>
						<div className="flex border border-[#cbdbcc] overflow-hidden">
							<button
								type="button"
								onClick={() => setYouth(false)}
								className={cn(
									"flex-1 px-6 py-2.5 text-xs font-semibold tracking-[0.08em] uppercase",
									!youth
										? "bg-[#021e00] text-[#eef4f1]"
										: "bg-white text-[#021e00] hover:bg-[#eef4f1]",
								)}
							>
								Adult
							</button>
							<button
								type="button"
								onClick={() => setYouth(true)}
								className={cn(
									"flex-1 px-6 py-2.5 text-xs font-semibold tracking-[0.08em] uppercase",
									youth
										? "bg-[#021e00] text-[#eef4f1]"
										: "bg-white text-[#021e00] hover:bg-[#eef4f1]",
								)}
							>
								Youth
							</button>
						</div>
					</div>

					{/* Coach toggle */}
					<div className="flex items-center justify-between py-2.5 px-4 border border-[#cbdbcc] bg-[#f8faf9]">
						<div className="flex flex-col">
							<span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[#4a8a40]">
								Coach Status
							</span>
							<span className="text-[10px] text-[#8aab8a]">
								Register this player as a coach
							</span>
						</div>
						<button
							type="button"
							onClick={() => setIsCoach(!isCoach)}
							className={cn(
								"relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
								isCoach ? "bg-[#298a29]" : "bg-[#cbdbcc]",
							)}
						>
							<span
								className={cn(
									"inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
									isCoach ? "translate-x-6" : "translate-x-1",
								)}
							/>
						</button>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose} className="flex-1">
						Cancel
					</Button>
					<Button onClick={handleSave} loading={saving} className="flex-1">
						Save Changes
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
