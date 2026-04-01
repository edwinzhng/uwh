"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import { useAction, useQuery } from "convex/react";
import { Check, Copy, RefreshCw } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import type { Player, Position } from "@/components/players/edit-player-modal";
import { DragContextWrapper } from "@/components/practices/plan/drag-context-wrapper";
import { ExcludedPlayerModal } from "@/components/practices/plan/excluded-player-modal";
import { ExcludedRow } from "@/components/practices/plan/excluded-row";
import { PlayerAssignmentModal } from "@/components/practices/plan/player-assignment-modal";
import { PositionSection } from "@/components/practices/plan/position-section";
import {
	type Assignment,
	type GameType,
	POS_ABBR,
	POSITIONS,
	type RosterState,
	type TeamColor,
} from "@/components/practices/plan/types";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/lib/toast";
import { cn, formatMonthDay, getPracticeTitle } from "@/lib/utils";

const mapTeam = (teamObj: Player[], teamColor: TeamColor): RosterState => {
	return teamObj.map((player) => ({
		playerId: player._id,
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

// ─── Rating helpers ──────────────────────────────────────────────────────────

function teamRatings(roster: RosterState, team: TeamColor, players: Player[]) {
	const assigned = roster.filter((a) => a.team === team);

	const getPlayerRating = (playerId: string) => {
		const p = players.find((p) => p._id === playerId);
		return p ? p.rating : 0;
	};

	const fwd = assigned
		.filter((a) => a.position === "FORWARD")
		.reduce((s, a) => s + getPlayerRating(a.playerId), 0);

	const back = assigned
		.filter((a) =>
			(["WING", "CENTER", "FULL_BACK"] as Position[]).includes(a.position),
		)
		.reduce((s, a) => s + getPlayerRating(a.playerId), 0);

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
		.map((a) => ({ a, player: players.find((p) => p._id === a.playerId)! }))
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

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function PlanPage() {
	const params = useParams();
	const idOrSporteasyId = params.id as string | undefined;

	const practice = useQuery(
		api.practices.getPracticeByUrlId,
		idOrSporteasyId ? { idOrSporteasyId } : "skip",
	);

	const allPlayersData = useQuery(api.players.getPlayers);
	const loading = practice === undefined || allPlayersData === undefined;

	const [allPlayers, setAllPlayers] = useState<Player[]>([]);
	const [isRegenerating, setIsRegenerating] = useState(false);
	const [gameType, setGameType] = useState<GameType>("MAIN");
	const [youthCollapsed, setYouthCollapsed] = useState(false);

	// Roster per game type
	const [mainRoster, setMainRoster] = useState<RosterState>([]);
	const [youthRoster, setYouthRoster] = useState<RosterState>([]);

	// Excluded player IDs
	const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

	const toast = useToast();
	const generateTeamsAction = useAction(api.teamGenerator.generateTeams);

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
		async (
			pId: string | null, // keeping this string to avoid null issues
			excludes: Set<string>,
			combineYouth: boolean,
		) => {
			setIsRegenerating(true);
			try {
				if (pId) {
					const result = await generateTeamsAction({
						practiceId: pId as Id<"practices">,
						excludedPlayerIds: Array.from(excludes) as Id<"players">[],
						combineYouth,
					});

					// Re-map the raw DB docs to match the Player type expectation
					setAllPlayers(result.presentPlayers as unknown as Player[]);

					const adultsRoster = convertTeams(
						result.adults as unknown as {
							blackTeam: Player[];
							whiteTeam: Player[];
						},
					);
					const youthRosterTemp = convertTeams(
						result.youth as unknown as {
							blackTeam: Player[];
							whiteTeam: Player[];
						},
					);

					setMainRoster(adultsRoster);
					if (youthRosterTemp.length > 0) setYouthRoster(youthRosterTemp);
				}
			} catch (_e) {
				toast.error("Team generation failed");
				setMainRoster([]);
				setYouthRoster([]);
			} finally {
				setIsRegenerating(false);
			}
		},
		[generateTeamsAction, toast.error],
	);

	const runAutoAssign = useCallback(() => {
		setIsRegenerating(true);
		fetchGeneratedTeams(
			practice?._id || null,
			excludedIds,
			youthCollapsed,
		).finally(() => setIsRegenerating(false));
	}, [practice?._id, excludedIds, fetchGeneratedTeams, youthCollapsed]);

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

	// Load Initial Data
	useEffect(() => {
		if (practice !== undefined && practice !== null && allPlayersData) {
			if (practice.sporteasyId) {
				// We don't want to re-fetch continuously, so maybe just set it once
				if (allPlayers.length === 0 && !loading) {
					fetchGeneratedTeams(practice._id, excludedIds, youthCollapsed);
				}
			} else {
				if (allPlayers.length === 0) {
					setAllPlayers(allPlayersData as Player[]);
				}
			}
		}
	}, [
		practice,
		allPlayersData,
		allPlayers.length,
		loading,
		excludedIds,
		youthCollapsed,
		fetchGeneratedTeams,
	]);

	// DnD handler
	function handleDragEnd(e: DragEndEvent) {
		const activeId = e.active.id as string;
		const overId = e.over?.id as string | undefined;
		if (!overId) return;

		setRoster((prev) => {
			const activePlayerIdStr = activeId
				.replace("card-BLACK-", "")
				.replace("card-WHITE-", "");

			const next = prev.map((a) => ({ ...a }));
			const srcIdx = next.findIndex((a) => a.playerId === activePlayerIdStr);
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
		(playerId: string) => {
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
				next.delete(player._id);
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
						playerId: player._id,
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
						<Button
							variant="outline"
							size="sm"
							onClick={runAutoAssign}
							disabled={isRegenerating}
						>
							<RefreshCw
								className={cn(
									"h-3.5 w-3.5 mr-1.5",
									isRegenerating && "animate-spin",
								)}
							/>
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
				{loading || (isRegenerating && roster.length === 0) ? (
					<div className="flex items-center justify-center py-24">
						<div className="h-6 w-6 border-2 border-[#298a29] border-t-transparent rounded-full animate-spin" />
					</div>
				) : (
					<DragContextWrapper onDragEnd={handleDragEnd}>
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
										onClick={async () => {
											const next = !youthCollapsed;
											setIsRegenerating(true);
											setYouthCollapsed(next);
											if (!next) {
												setGameType("MAIN");
											}
											await fetchGeneratedTeams(
												practice?._id ?? null,
												excludedIds,
												next,
											);
											setIsRegenerating(false);
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
										Total: {blackRating.fwd + blackRating.back} · Fwd:{" "}
										{blackRating.fwd} · Back: {blackRating.back}
									</p>
								</div>
								<div className="flex-1 px-4 py-3 flex items-center bg-white gap-3">
									<p className="text-base font-bold text-[#021e00] tracking-[0.06em]">
										WHITE
									</p>
									<p className="text-[10px] font-semibold text-[#8aab8a] tracking-[0.08em]">
										Total: {whiteRating.fwd + whiteRating.back} · Fwd:{" "}
										{whiteRating.fwd} · Back: {whiteRating.back}
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
					</DragContextWrapper>
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
								a.playerId === assignModal.player._id ? updated : a,
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
