"use client";

import {
	DndContext,
	type DragEndEvent,
	PointerSensor,
	pointerWithin,
	useDraggable,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { Check, Copy, RefreshCw, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, PositionBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
	apiClient,
	type Player,
	type Position,
	type Practice,
} from "@/lib/api";
import { cn, formatMonthDay, getPracticeTitle } from "@/lib/utils";

type GameType = "MAIN" | "YOUTH";
type TeamColor = "BLACK" | "WHITE";
type Role = "CAPTAIN" | "REF";

const POSITIONS: { key: Position; label: string; plural: string }[] = [
	{ key: "FORWARD", label: "Forward", plural: "FORWARDS" },
	{ key: "WING", label: "Wing", plural: "WINGS" },
	{ key: "CENTER", label: "Center", plural: "CENTER" },
	{ key: "FULL_BACK", label: "Full Back", plural: "FULL BACK" },
];

const POS_ABBR: Record<Position, string> = {
	FORWARD: "F",
	WING: "W",
	CENTER: "C",
	FULL_BACK: "FB",
};

// An assignment = a player placed in a team/position
interface Assignment {
	playerId: number;
	team: TeamColor;
	position: Position;
	role?: Role | null;
}

type RosterState = Assignment[];

// ─── Auto-assign ────────────────────────────────────────────────────────────

function autoAssign(players: Player[]): RosterState {
	const assignments: RosterState = [];
	// Each player uses their primary position only; sorted by rating desc
	const sorted = [...players].sort((a, b) => b.rating - a.rating);

	const byPos = new Map<Position, Player[]>();
	for (const pos of POSITIONS) byPos.set(pos.key, []);
	for (const p of sorted) {
		const primary = p.positions[0] ?? "FORWARD";
		// biome-ignore lint/style/noNonNullAssertion: we initialize all keys above
		byPos.get(primary)!.push(p);
	}

	for (const pos of POSITIONS) {
		const group = byPos.get(pos.key) ?? [];
		for (let i = 0; i < group.length; i++) {
			assignments.push({
				playerId: group[i].id,
				team: i % 2 === 0 ? "BLACK" : "WHITE",
				position: pos.key,
			});
		}
	}
	return assignments;
}

// ─── Rating helpers ──────────────────────────────────────────────────────────

function teamRatings(roster: RosterState, team: TeamColor, players: Player[]) {
	const assigned = roster
		.filter((a) => a.team === team)
		.map((a) => players.find((p) => p.id === a.playerId))
		.filter(Boolean) as Player[];

	const fwd = assigned
		.filter((p) => p.positions.includes("FORWARD"))
		.reduce((s, p) => s + p.rating, 0);
	const back = assigned
		.filter((p) =>
			p.positions.some((pos) =>
				(["WING", "CENTER", "FULL_BACK"] as Position[]).includes(pos),
			),
		)
		.reduce((s, p) => s + p.rating, 0);
	return { fwd, back };
}

// ─── Discord copy ────────────────────────────────────────────────────────────

function formatForDiscord(
	roster: RosterState,
	players: Player[],
	teamName: string,
	team: TeamColor,
): string {
	const entries = roster
		.filter((a) => a.team === team)
		// biome-ignore lint/style/noNonNullAssertion: filtered out below
		.map((a) => ({ a, player: players.find((p) => p.id === a.playerId)! }))
		.filter((x) => !!x.player);

	const firstNames = entries.map((x) =>
		x.player.fullName.split(" ")[0].toLowerCase(),
	);
	const dupes = new Set(
		firstNames.filter((n, i) => firstNames.indexOf(n) !== i),
	);

	const displayName = (item: { a: Assignment; player: Player }) => {
		const first = item.player.fullName.split(" ")[0];
		return dupes.has(first.toLowerCase()) ? item.player.fullName : first;
	};

	let text = `**${teamName} team:**\n`;
	for (const pos of POSITIONS) {
		const group = entries.filter((x) => x.a.position === pos.key);
		for (const item of group) {
			const name = displayName(item);
			const roleSuffix =
				item.a.role === "CAPTAIN"
					? " (Captain)"
					: item.a.role === "REF"
						? " (Ref)"
						: "";
			text += `${POS_ABBR[item.a.position]} - ${name}${roleSuffix}\n`;
		}
	}
	return text;
}

// ─── Card content ───────────────────────────────────────────────────────────

const CARD_H = "h-[64px]";

function CardContent({
	player,
	role,
	team,
}: {
	player: Player;
	role?: Role | null;
	team: TeamColor;
}) {
	const isBlack = team === "BLACK";
	const nameParts = player.fullName.split(" ");
	const first = nameParts[0];
	const lastInitial =
		nameParts
			.slice(1)
			.map((n) => n[0])
			.join("") + ".";

	return (
		<div className="flex flex-col justify-between h-full min-w-0">
			<p
				className={cn(
					"text-xs font-semibold leading-tight truncate",
					isBlack ? "text-[#eef4f1]" : "text-[#021e00]",
				)}
			>
				{first}{" "}
				<span className="text-[#4a8a40] font-normal">{lastInitial}</span>
			</p>
			<div className="flex items-center justify-between gap-1">
				<div className="flex gap-0.5 flex-wrap">
					{player.positions.map((pos) => (
						<PositionBadge key={pos} position={pos} />
					))}
					{role && (
						<Badge variant={role === "REF" ? "ref" : "capt"}>
							{role === "CAPTAIN" ? "CAPT" : "REF"}
						</Badge>
					)}
				</div>
				<span
					className={cn(
						"font-bold text-sm shrink-0",
						isBlack ? "text-[#4a8a40]" : "text-[#021e00]",
					)}
				>
					{player.rating}
				</span>
			</div>
		</div>
	);
}

// ─── Draggable-only assigned card ────────────────────────────────────

function AssignmentCard({
	assignment,
	player,
	onClick,
}: {
	assignment: Assignment;
	player: Player;
	onClick: () => void;
}) {
	const dndId = `card-${assignment.team}-${assignment.playerId}`;
	const { attributes, listeners, setNodeRef, isDragging, transform } =
		useDraggable({ id: dndId });
	const isBlack = assignment.team === "BLACK";

	return (
		// biome-ignore lint/a11y/useSemanticElements: dndkit uses div for draggable ref and styling properly
		<div
			ref={setNodeRef}
			{...attributes}
			{...listeners}
			onClick={onClick}
			onKeyDown={(e) => e.key === "Enter" && onClick()}
			role="button"
			tabIndex={0}
			style={{
				transform: transform
					? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
					: undefined,
				zIndex: isDragging ? 50 : undefined,
				opacity: isDragging ? 0.75 : 1,
			}}
			className={cn(
				CARD_H,
				"min-w-[120px] max-w-[200px] border-2 border-[#298a29] p-[10px] flex-shrink-0 cursor-grab active:cursor-grabbing select-none",
				isBlack ? "bg-[#0a2a00]" : "bg-white",
			)}
		>
			<CardContent
				player={player}
				role={assignment.role}
				team={assignment.team}
			/>
		</div>
	);
}

// ─── Position section ────────────────────────────────────────────────────────
// The entire section container is a droppable zone so you can drop anywhere.

function PositionSection({
	posConfig,
	roster,
	players,
	team,
	onCardClick,
}: {
	posConfig: (typeof POSITIONS)[number];
	roster: RosterState;
	players: Player[];
	team: TeamColor;
	onCardClick: (a: Assignment, p: Player) => void;
}) {
	const teamAssignments = roster.filter(
		(a) => a.team === team && a.position === posConfig.key,
	);
	const dropId = `section-${team}-${posConfig.key}`;
	const { setNodeRef, isOver } = useDroppable({ id: dropId });
	const isBlack = team === "BLACK";

	return (
		<div
			ref={setNodeRef}
			className={cn(
				"flex flex-wrap gap-2 content-start w-full h-full p-2 transition-colors",
				isBlack
					? cn("bg-[#021e00]", isOver && "bg-[#0d3200]")
					: cn("bg-white", isOver && "bg-[#edf7ed]"),
			)}
		>
			{teamAssignments.map((a) => {
				const player = players.find((p) => p.id === a.playerId);
				if (!player) return null;
				return (
					<AssignmentCard
						key={`${a.team}-${a.playerId}`}
						assignment={a}
						player={player}
						onClick={() => onCardClick(a, player)}
					/>
				);
			})}
			{teamAssignments.length === 0 && (
				<div
					className={cn(
						CARD_H,
						"w-full border-2 border-dashed border-[#298a29] flex items-center justify-center",
						"text-[9px] font-bold tracking-[0.14em] uppercase transition-colors",
						isBlack
							? cn("text-[#298a29]", isOver && "bg-[#0a2a00]")
							: cn("text-[#298a29]", isOver && "bg-[#eef4f1]"),
					)}
				>
					{isOver ? "Drop here" : "No players yet"}
				</div>
			)}
		</div>
	);
}

// ─── Excluded row (spans full width below all positions) ─────────────────────

function ExcludedRow({
	excludedIds,
	players,
	onExcludedClick,
}: {
	excludedIds: Set<number>;
	players: Player[];
	onExcludedClick: (p: Player) => void;
}) {
	const excluded = players.filter((p) => excludedIds.has(p.id));
	if (excluded.length === 0) return null;
	return (
		<div className="flex border-b border-[#021e00]">
			{/* Vertical label */}
			<div className="w-8 shrink-0 flex items-center justify-center bg-[#021e00] border-r border-[#cbdbcc]">
				<span className="text-[8px] font-bold tracking-[0.18em] uppercase text-[#4a8a40] [writing-mode:vertical-rl] rotate-180 whitespace-nowrap">
					EXCLUDED
				</span>
			</div>
			{/* Spans both columns */}
			<div className="flex-1 bg-[#eef4f1] p-3 flex flex-wrap gap-2">
				{excluded.map((p) => (
					<button
						type="button"
						key={p.id}
						onClick={() => onExcludedClick(p)}
						className={cn(
							"border border-[#cbdbcc] px-3 py-2 text-xs text-[#8aab8a] line-through cursor-pointer hover:border-[#021e00] hover:text-[#021e00] transition-colors",
						)}
					>
						{p.fullName.split(" ")[0]}{" "}
						{p.fullName
							.split(" ")
							.slice(1)
							.map((n) => n[0])
							.join("")}
						. <span className="text-[10px] not-line-through">(excluded)</span>
					</button>
				))}
			</div>
		</div>
	);
}

// ─── Toggle switch ───────────────────────────────────────────────────────────

function ToggleSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
	return (
		<button
			type="button"
			onClick={onToggle}
			className={cn(
				"relative w-12 h-7 flex-shrink-0 border-2 transition-colors cursor-pointer",
				on ? "bg-[#298a29] border-[#298a29]" : "bg-white border-[#cbdbcc]",
			)}
		>
			<span
				className={cn(
					"absolute top-0.5 w-5 h-5 transition-all",
					on ? "left-[calc(100%-22px)] bg-white" : "left-0.5 bg-[#cbdbcc]",
				)}
			/>
		</button>
	);
}

// ─── Player Assignment Modal ─────────────────────────────────────────────────

function PlayerAssignmentModal({
	player,
	assignment,
	onClose,
	onSave,
	onRemove,
}: {
	player: Player;
	assignment: Assignment;
	onClose: () => void;
	onSave: (updated: Assignment) => void;
	onRemove: (playerId: number) => void;
}) {
	const [team, setTeam] = useState<TeamColor>(assignment.team);
	const [position, setPosition] = useState<Position>(assignment.position);
	const [isCapt, setIsCapt] = useState(assignment.role === "CAPTAIN");
	const [isRef, setIsRef] = useState(assignment.role === "REF");

	const initials = player.fullName
		.split(" ")
		.map((n) => n[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();
	const displayRole: Role | null = isCapt ? "CAPTAIN" : isRef ? "REF" : null;

	// Auto-save helper — called with the next state each time something changes
	const save = (patch: Partial<Assignment>) => {
		onSave({
			...assignment,
			team,
			position,
			role: isCapt ? "CAPTAIN" : isRef ? "REF" : null,
			...patch,
		});
	};

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: modal backdrop
		// biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4"
			style={{ background: "rgba(2,30,0,0.85)" }}
			onClick={onClose}
		>
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: modal dialog wrapper */}
			{/* biome-ignore lint/a11y/noStaticElementInteractions: modal dialog wrapper */}
			<div
				className="w-full max-w-[390px] bg-[#021e00] shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="px-5 pt-5 pb-4 flex items-start justify-between">
					<div>
						<p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#4a8a40] mb-0.5">
							{team === "BLACK" ? "Black Team" : "White Team"} ·{" "}
							{POSITIONS.find((p) => p.key === position)?.label}
						</p>
						<h2 className="text-2xl font-bold text-[#eef4f1]">
							Player Assignment
						</h2>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="text-[#4a8a40] hover:text-[#eef4f1] cursor-pointer mt-1"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Body */}
				<div className="bg-[#eef4f1] flex flex-col">
					{/* Player row */}
					<div className="mx-5 my-5 flex items-center gap-3 p-4 bg-white border border-[#cbdbcc">
						<div className="w-11 h-11 bg-[#021e00] text-[#eef4f1] flex items-center justify-center text-sm font-bold shrink-0">
							{initials}
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-[#021e00] font-bold truncate">
								{player.fullName.split(" ")[0]}{" "}
								{player.fullName
									.split(" ")
									.slice(1)
									.map((n) => n[0])
									.join("")}
								.
							</p>
							<div className="flex gap-1 mt-0.5 flex-wrap">
								{player.positions.map((pos) => (
									<PositionBadge key={pos} position={pos} />
								))}
								{displayRole && (
									<Badge variant={displayRole === "REF" ? "ref" : "capt"}>
										{displayRole === "CAPTAIN" ? "CAPT" : "REF"}
									</Badge>
								)}
							</div>
						</div>
						<span className="text-[#021e00] font-bold text-xl shrink-0">
							{player.rating}
							<span className="text-[#8aab8a] text-xs font-normal"> /10</span>
						</span>
					</div>

					{/* Team Assignment */}
					<div className="px-5 pb-4">
						<p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#4a8a40] mb-2">
							Team Assignment
						</p>
						<div className="flex border border-[#cbdbcc]">
							{(["BLACK", "WHITE"] as TeamColor[]).map((t) => (
								<button
									key={t}
									type="button"
									onClick={() => {
										setTeam(t);
										save({ team: t });
									}}
									className={cn(
										"flex-1 py-3 text-sm font-semibold cursor-pointer transition-colors",
										team === t
											? t === "BLACK"
												? "bg-[#021e00] text-[#eef4f1]"
												: "bg-white text-[#021e00] border-l border-[#cbdbcc]"
											: "bg-[#eef4f1] text-[#8aab8a]",
									)}
								>
									{t === "BLACK" ? "Black Team" : "White Team"}
								</button>
							))}
						</div>
					</div>

					{/* Position */}
					<div className="px-5 pb-4">
						<p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#4a8a40] mb-2">
							Position
						</p>
						<div className="relative">
							<select
								value={position}
								onChange={(e) => {
									const p = e.target.value as Position;
									setPosition(p);
									save({ position: p });
								}}
								className="w-full h-12 pl-3 pr-10 border border-[#cbdbcc] bg-white text-[#021e00] text-sm appearance-none cursor-pointer focus:outline-none focus:border-[#298a29]"
							>
								{POSITIONS.map((pos) => (
									<option key={pos.key} value={pos.key}>
										{pos.label}
									</option>
								))}
							</select>
							<div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
								<svg
									aria-hidden="true"
									className="h-4 w-4 text-[#8aab8a]"
									viewBox="0 0 16 16"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
								>
									<path
										d="M4 6l4 4 4-4"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</div>
						</div>
					</div>

					{/* Match Roles */}
					<div className="px-5 pb-5">
						<p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#4a8a40] mb-2">
							Match Roles
						</p>
						<div className="border border-[#cbdbcc] bg-white divide-y divide-[#cbdbcc]">
							{[
								{
									role: "CAPTAIN" as Role,
									label: "Team Captain",
									badgeVariant: "capt" as const,
									badgeText: "CAPT",
									isOn: isCapt,
									setOn: (v: boolean) => {
										setIsCapt(v);
										if (v) setIsRef(false);
										save({ role: v ? "CAPTAIN" : null });
									},
								},
								{
									role: "REF" as Role,
									label: "Referee",
									badgeVariant: "ref" as const,
									badgeText: "REF",
									isOn: isRef,
									setOn: (v: boolean) => {
										setIsRef(v);
										if (v) setIsCapt(false);
										save({ role: v ? "REF" : null });
									},
								},
							].map(({ role, label, badgeVariant, badgeText, isOn, setOn }) => (
								<div key={role} className="flex items-center gap-3 px-4 py-3">
									<Badge variant={badgeVariant}>{badgeText}</Badge>
									<span className="flex-1 text-sm text-[#021e00]">{label}</span>
									<ToggleSwitch on={isOn} onToggle={() => setOn(!isOn)} />
								</div>
							))}
						</div>
					</div>

					{/* Footer — single destructive CTA */}
					<div className="px-5 pb-6 border-t-2 border-[#021e00] pt-4">
						<Button
							variant="destructive"
							size="lg"
							className="w-full"
							onClick={() => {
								onRemove(player.id);
								onClose();
							}}
						>
							Remove from Line-up
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

// ─── Excluded Player Modal ───────────────────────────────────────────────────

function ExcludedPlayerModal({
	player,
	onClose,
	onReturnToLineup,
}: {
	player: Player;
	onClose: () => void;
	onReturnToLineup: (p: Player) => void;
}) {
	const posLabel =
		POSITIONS.find((pos) => pos.key === (player.positions[0] ?? "FORWARD"))
			?.label ?? "Player";
	const initials = player.fullName
		.split(" ")
		.map((n) => n[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: modal backdrop
		// biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4"
			style={{ background: "rgba(2,30,0,0.85)" }}
			onClick={onClose}
		>
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: modal dialog wrapper */}
			{/* biome-ignore lint/a11y/noStaticElementInteractions: modal dialog wrapper */}
			<div
				className="w-full max-w-[390px] bg-[#021e00] shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="px-5 pt-5 pb-4 flex items-start justify-between">
					<div>
						<p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#4a8a40] mb-0.5">
							Excluded · {posLabel}
						</p>
						<h2 className="text-2xl font-bold text-[#eef4f1]">
							Player Assignment
						</h2>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="text-[#4a8a40] hover:text-[#eef4f1] cursor-pointer mt-1"
					>
						<X className="h-5 w-5" />
					</button>
				</div>
				<div className="bg-[#eef4f1]">
					<div className="mx-5 my-5 flex items-center gap-3 p-4 bg-white border border-[#cbdbcc]">
						<div className="w-11 h-11 bg-[#021e00] text-[#eef4f1] flex items-center justify-center text-sm font-bold shrink-0">
							{initials}
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-[#021e00] font-bold truncate">
								{player.fullName.split(" ")[0]}{" "}
								{player.fullName
									.split(" ")
									.slice(1)
									.map((n) => n[0])
									.join("")}
								.
							</p>
							<div className="flex gap-1 mt-0.5 flex-wrap">
								{player.positions.map((pos) => (
									<PositionBadge key={pos} position={pos} />
								))}
							</div>
						</div>
						<span className="text-[#021e00] font-bold text-xl shrink-0">
							{player.rating}
							<span className="text-[#8aab8a] text-xs font-normal"> /10</span>
						</span>
					</div>
					<div className="px-5 pb-6 border-t-2 border-[#021e00] pt-4">
						<Button
							size="lg"
							className="w-full"
							onClick={() => {
								onReturnToLineup(player);
								onClose();
							}}
						>
							Return to Line-up
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function PlanPage() {
	const params = useParams();
	const practiceIdFromRoute = params.id ? Number(params.id) : null;

	const [practice, setPractice] = useState<Practice | null>(null);
	const [allPlayers, setAllPlayers] = useState<Player[]>([]);
	const [loading, setLoading] = useState(true);
	const [gameType, setGameType] = useState<GameType>("MAIN");
	const [youthCollapsed, setYouthCollapsed] = useState(false);

	// Roster per game type
	const [mainRoster, setMainRoster] = useState<RosterState>([]);
	const [youthRoster, setYouthRoster] = useState<RosterState>([]);

	// Excluded player IDs
	const [excludedIds, setExcludedIds] = useState<Set<number>>(new Set());

	// DnD
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
	);

	// Modals
	const [assignModal, setAssignModal] = useState<{
		assignment: Assignment;
		player: Player;
	} | null>(null);
	const [excludedModal, setExcludedModal] = useState<Player | null>(null);

	// Derived player lists
	const adultPlayers = useMemo(
		() => allPlayers.filter((p) => !p.youth),
		[allPlayers],
	);
	const youthPlayers = useMemo(
		() => allPlayers.filter((p) => p.youth),
		[allPlayers],
	);
	const hasYouth = youthPlayers.length > 0;

	const activePlayers = useMemo(() => {
		if (youthCollapsed) return allPlayers;
		return gameType === "MAIN" ? adultPlayers : youthPlayers;
	}, [youthCollapsed, gameType, allPlayers, adultPlayers, youthPlayers]);

	const roster =
		gameType === "MAIN" || youthCollapsed ? mainRoster : youthRoster;

	const setRoster = useCallback(
		(updater: (prev: RosterState) => RosterState) => {
			if (gameType === "MAIN" || youthCollapsed) setMainRoster(updater);
			else setYouthRoster(updater);
		},
		[gameType, youthCollapsed],
	);

	const fetchGeneratedTeams = useCallback(
		async (p: Practice, excludes: Set<number>) => {
			try {
				const result = await apiClient.generateTeamsForPractice(
					p.id,
					Array.from(excludes),
				);
				setAllPlayers(result.presentPlayers);

				const mapTeam = (
					teamObj: Player[],
					teamColor: TeamColor,
				): RosterState => {
					return teamObj.map((player) => ({
						playerId: player.id,
						team: teamColor,
						position:
							(player as Player & { assignedPositions?: Position[] })
								.assignedPositions?.[0] ||
							player.positions?.[0] ||
							"FORWARD",
					}));
				};

				const convertTeams = (teamsGroup: {
					blackTeam: Player[];
					whiteTeam: Player[];
				}) => {
					return [
						...mapTeam(teamsGroup.blackTeam, "BLACK"),
						...mapTeam(teamsGroup.whiteTeam, "WHITE"),
					];
				};

				const adultsRoster = convertTeams(result.adults);
				const youthRosterTemp = convertTeams(result.youth);

				setMainRoster(adultsRoster);
				if (youthRosterTemp.length > 0) setYouthRoster(youthRosterTemp);
			} catch (e) {
				console.error("Backend generate teams failed", e);
				setAllPlayers([]);
				setMainRoster([]);
				setYouthRoster([]);
			}
		},
		[],
	);

	const runAutoAssign = useCallback(() => {
		if (practice) {
			setLoading(true);
			if (practice.sporteasyId) {
				fetchGeneratedTeams(practice, excludedIds).finally(() =>
					setLoading(false),
				);
			} else {
				const eligible = activePlayers.filter((p) => !excludedIds.has(p.id));
				const newRoster = autoAssign(eligible);
				if (gameType === "MAIN" || youthCollapsed) setMainRoster(newRoster);
				else setYouthRoster(newRoster);
				setLoading(false);
			}
		}
	}, [
		practice,
		excludedIds,
		fetchGeneratedTeams,
		activePlayers,
		gameType,
		youthCollapsed,
	]);

	// Copy Teams
	const [copied, setCopied] = useState(false);
	const copyTeams = useCallback(() => {
		const text =
			formatForDiscord(roster, activePlayers, "Black", "BLACK") +
			"\n" +
			formatForDiscord(roster, activePlayers, "White", "WHITE");
		navigator.clipboard.writeText(text).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		});
	}, [roster, activePlayers]);

	// Load
	useEffect(() => {
		async function load() {
			setLoading(true);
			try {
				const [practiceList, playerList] = await Promise.all([
					apiClient.getPractices(),
					apiClient.getPlayers(),
				]);
				const found =
					practiceList.find((p) => p.id === practiceIdFromRoute) ??
					practiceList[0] ??
					null;
				setPractice(found);

				if (found?.sporteasyId) {
					await fetchGeneratedTeams(found, new Set());
				} else {
					setAllPlayers(playerList);
					const adults = playerList.filter((p) => !p.youth);
					const youth = playerList.filter((p) => p.youth);
					setMainRoster(autoAssign(adults));
					if (youth.length > 0) setYouthRoster(autoAssign(youth));
				}
			} catch (err) {
				console.error(err);
			} finally {
				setLoading(false);
			}
		}
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [practiceIdFromRoute, fetchGeneratedTeams]);

	// DnD handler
	function handleDragEnd(e: DragEndEvent) {
		const activeId = e.active.id as string;
		const overId = e.over?.id as string | undefined;
		if (!overId) return;

		setRoster((prev) => {
			const activePlayerId = Number(activeId.split("-").at(-1));

			const next = prev.map((a) => ({ ...a }));
			const srcIdx = next.findIndex((a) => a.playerId === activePlayerId);
			if (srcIdx === -1) return prev;

			if (overId.startsWith("section-")) {
				// Drop anywhere in a team/position section
				const withoutPrefix = overId.slice("section-".length);
				const dashIdx = withoutPrefix.indexOf("-");
				const newTeam = withoutPrefix.slice(0, dashIdx) as TeamColor;
				const newPos = withoutPrefix.slice(dashIdx + 1) as Position;
				// Don't update if dropped in same section
				if (next[srcIdx].team === newTeam && next[srcIdx].position === newPos)
					return prev;
				next[srcIdx] = { ...next[srcIdx], team: newTeam, position: newPos };
			}
			return next;
		});
	}

	// Remove a player from lineup → goes to excluded
	const handleRemove = useCallback(
		(playerId: number) => {
			setRoster((prev) => prev.filter((a) => a.playerId !== playerId));
			setExcludedIds((prev) => new Set([...prev, playerId]));
		},
		[setRoster],
	);

	// Return excluded player to lineup (auto-assigned to their position)
	const handleReturnToLineup = useCallback(
		(player: Player) => {
			setExcludedIds((prev) => {
				const next = new Set(prev);
				next.delete(player.id);
				return next;
			});
			const primary = player.positions[0] ?? "FORWARD";
			// Put them on whichever team has fewer in that position
			setRoster((prev) => {
				const blackCount = prev.filter(
					(a) => a.team === "BLACK" && a.position === primary,
				).length;
				const whiteCount = prev.filter(
					(a) => a.team === "WHITE" && a.position === primary,
				).length;
				return [
					...prev,
					{
						playerId: player.id,
						team: blackCount <= whiteCount ? "BLACK" : "WHITE",
						position: primary,
					},
				];
			});
		},
		[setRoster],
	);

	const blackRating = teamRatings(roster, "BLACK", activePlayers);
	const whiteRating = teamRatings(roster, "WHITE", activePlayers);

	return (
		<div className="flex flex-col min-h-screen">
			<PageHeader
				eyebrow={practice ? formatMonthDay(practice.date) : "Plan"}
				title={practice ? getPracticeTitle(practice) : "Team Builder"}
				actions={
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" onClick={runAutoAssign}>
							<RefreshCw className="h-3.5 w-3.5 mr-1.5" />
							Regenerate
						</Button>
						<Button
							size="sm"
							onClick={copyTeams}
							className="whitespace-nowrap flex-shrink-0"
						>
							{copied ? (
								<Check className="h-3.5 w-3.5 mr-1.5" />
							) : (
								<Copy className="h-3.5 w-3.5 mr-1.5" />
							)}
							{copied ? "Copied!" : "Copy Teams"}
						</Button>
					</div>
				}
			/>

			<div className="flex-1 flex flex-col">
				{loading ? (
					<div className="flex items-center justify-center py-24">
						<div className="h-6 w-6 border-2 border-[#298a29] border-t-transparent rounded-full animate-spin" />
					</div>
				) : (
					<DndContext
						sensors={sensors}
						collisionDetection={pointerWithin}
						onDragEnd={handleDragEnd}
					>
						{/* Sub-header: game tabs + drag hint */}
						<div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-[#cbdbcc] bg-[#eef4f1]">
							<div className="flex items-center gap-3">
								{!youthCollapsed && (
									<SegmentedControl
										options={[
											{ label: "Main Game", value: "MAIN" },
											...(hasYouth
												? [
														{
															label: "Youth Game",
															value: "YOUTH",
															badge: youthPlayers.length,
														},
													]
												: []),
										]}
										value={gameType}
										onChange={(v) => setGameType(v as GameType)}
										size="sm"
									/>
								)}
								{hasYouth && (
									<button
										type="button"
										onClick={() => {
											const next = !youthCollapsed;
											setYouthCollapsed(next);
											if (next)
												setMainRoster(
													autoAssign(
														allPlayers.filter((p) => !excludedIds.has(p.id)),
													),
												);
											else {
												setMainRoster(
													autoAssign(
														adultPlayers.filter((p) => !excludedIds.has(p.id)),
													),
												);
												setYouthRoster(
													autoAssign(
														youthPlayers.filter((p) => !excludedIds.has(p.id)),
													),
												);
											}
										}}
										className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#8aab8a] hover:text-[#021e00] cursor-pointer underline"
									>
										{youthCollapsed ? "Split Games" : "Combine Games"}
									</button>
								)}
							</div>
							<p className="hidden md:block text-[10px] font-semibold tracking-[0.12em] uppercase text-[#8aab8a]">
								Drag to rearrange
							</p>
						</div>

						{/* ── Two-column layout (desktop + mobile) ── */}
						<div className="flex flex-col flex-1 border-t-2 border-[#021e00]">
							{/* Team column headers */}
							<div className="flex border-b border-[#1a3a00]">
								<div className="w-8 shrink-0 bg-[#021e00]" />
								<div className="flex-1 px-4 py-3 flex items-center bg-[#021e00] border-r border-[#1a3a00] gap-3">
									<p className="text-base font-bold text-[#eef4f1] tracking-[0.06em]">
										BLACK
									</p>
									<p className="text-[10px] font-semibold text-[#4a8a40] tracking-[0.08em]">
										Fwd: {blackRating.fwd} · Back: {blackRating.back}
									</p>
								</div>
								<div className="flex-1 px-4 py-3 flex items-center bg-white gap-3">
									<p className="text-base font-bold text-[#021e00] tracking-[0.06em]">
										WHITE
									</p>
									<p className="text-[10px] font-semibold text-[#8aab8a] tracking-[0.08em]">
										Fwd: {whiteRating.fwd} · Back: {whiteRating.back}
									</p>
								</div>
							</div>

							{/* Position rows */}
							{POSITIONS.map((posConfig) => (
								<div
									key={posConfig.key}
									className="flex items-stretch border-b border-[#1a3a00]"
								>
									{/* Vertical label */}
									<div className="w-8 shrink-0 flex items-center justify-center bg-[#021e00] border-r border-[#1a3a00]">
										<span className="text-[8px] font-bold tracking-[0.18em] uppercase text-[#4a8a40] [writing-mode:vertical-rl] rotate-180 whitespace-nowrap">
											{posConfig.plural}
										</span>
									</div>
									{/* Black */}
									<div className="flex-1 bg-[#021e00] p-3 border-r border-[#1a3a00] min-h-[80px]">
										<PositionSection
											posConfig={posConfig}
											roster={roster}
											players={activePlayers}
											team="BLACK"
											onCardClick={(a, p) =>
												setAssignModal({ assignment: a, player: p })
											}
										/>
									</div>
									{/* White */}
									<div className="flex-1 bg-white p-3 min-h-[80px]">
										<PositionSection
											posConfig={posConfig}
											roster={roster}
											players={activePlayers}
											team="WHITE"
											onCardClick={(a, p) =>
												setAssignModal({ assignment: a, player: p })
											}
										/>
									</div>
								</div>
							))}
							<ExcludedRow
								excludedIds={excludedIds}
								players={activePlayers}
								onExcludedClick={(p) => setExcludedModal(p)}
							/>
						</div>
					</DndContext>
				)}
			</div>

			{/* Modals */}
			{assignModal && (
				<PlayerAssignmentModal
					player={assignModal.player}
					assignment={assignModal.assignment}
					onClose={() => setAssignModal(null)}
					onSave={(updated) => {
						setRoster((prev) =>
							prev.map((a) =>
								a.playerId === assignModal.player.id ? updated : a,
							),
						);
					}}
					onRemove={handleRemove}
				/>
			)}
			{excludedModal && (
				<ExcludedPlayerModal
					player={excludedModal}
					onClose={() => setExcludedModal(null)}
					onReturnToLineup={handleReturnToLineup}
				/>
			)}
		</div>
	);
}
