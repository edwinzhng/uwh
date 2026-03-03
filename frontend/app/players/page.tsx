"use client";

import { Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { EditPlayerModal } from "@/components/players/edit-player-modal";
import { Avatar } from "@/components/ui/avatar";
import { Badge, PositionBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { apiClient, type Player } from "@/lib/api";

type Filter = "ALL" | "ADULT" | "YOUTH";

export default function PlayersPage() {
	const [players, setPlayers] = useState<Player[]>([]);
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState<Filter>("ALL");
	const [search, setSearch] = useState("");
	const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

	const fetchPlayers = useCallback(async () => {
		setLoading(true);
		try {
			const data = await apiClient.getPlayers();
			setPlayers(data.sort((a, b) => a.fullName.localeCompare(b.fullName)));
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchPlayers();
	}, [fetchPlayers]);

	const filtered = players.filter((p) => {
		if (search) {
			const q = search.toLowerCase();
			if (!p.fullName.toLowerCase().includes(q)) return false;
		}
		if (filter === "ADULT") return !p.youth;
		if (filter === "YOUTH") return p.youth;
		return true;
	});

	const youthCount = players.filter((p) => p.youth).length;

	return (
		<div>
			<PageHeader
				eyebrow="Roster"
				title="Players"
				subtitle={`${players.length} players · ${youthCount} youth`}
				actions={
					<div className="hidden md:block">
						<Input
							placeholder="Search players..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							prefix={<Search className="h-4 w-4" />}
							className="w-52"
						/>
					</div>
				}
			/>

			{/* Filter bar */}
			<div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-[#cbdbcc] bg-[#eef4f1] gap-3">
				<SegmentedControl
					options={[
						{ label: "All", value: "ALL" },
						{ label: "Adult", value: "ADULT" },
						{ label: "Youth", value: "YOUTH" },
					]}
					value={filter}
					onChange={(v) => setFilter(v as Filter)}
					size="sm"
				/>
				<div className="md:hidden flex-1 max-w-xs">
					<Input
						placeholder="Search players..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						prefix={<Search className="h-4 w-4" />}
					/>
				</div>
			</div>

			{/* Column headers — desktop */}
			<div className="hidden md:grid grid-cols-[1fr_200px_120px_80px] px-6 py-3 border-b border-[#cbdbcc]">
				<span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#8aab8a]">
					Name
				</span>
				<span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#8aab8a]">
					Rating &nbsp; Positions
				</span>
				<span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#8aab8a]">
					Type
				</span>
				<span />
			</div>

			{loading ? (
				<div className="flex items-center justify-center py-24">
					<div className="h-6 w-6 border-2 border-[#298a29] border-t-transparent rounded-full animate-spin" />
				</div>
			) : filtered.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-24 text-center">
					<p className="text-[#021e00] text-lg font-medium">No players found</p>
					<p className="text-[#8aab8a] text-sm mt-1">
						Try a different search or filter
					</p>
				</div>
			) : (
				<div>
					{filtered.map((player) => (
						<PlayerRow
							key={player.id}
							player={player}
							onEdit={() => setEditingPlayer(player)}
						/>
					))}
				</div>
			)}

			{editingPlayer && (
				<EditPlayerModal
					player={editingPlayer}
					onClose={() => setEditingPlayer(null)}
					onSaved={(updated) => {
						setPlayers((prev) =>
							prev
								.map((p) => (p.id === updated.id ? updated : p))
								.sort((a, b) => a.fullName.localeCompare(b.fullName)),
						);
						setEditingPlayer(null);
					}}
				/>
			)}
		</div>
	);
}

function PlayerRow({ player, onEdit }: { player: Player; onEdit: () => void }) {
	return (
		<>
			{/* Desktop */}
			<div className="hidden md:grid grid-cols-[1fr_200px_120px_80px] px-6 py-4 border-b border-[#cbdbcc] items-center hover:bg-white/30 ">
				{/* Name */}
				<div className="flex items-center gap-3">
					<Avatar name={player.fullName} size="sm" />
					<div>
						<div className="flex items-center gap-2">
							<p className="text-[#021e00] font-medium text-sm">
								{player.fullName}
							</p>
							{player.youth && <Badge variant="youth">Youth</Badge>}
						</div>
						<p className="text-[#8aab8a] text-xs mt-0.5">
							{player.email || player.parentEmail || ""}
						</p>
					</div>
				</div>

				{/* Rating + positions */}
				<div className="flex items-center gap-2">
					<span className="text-[#021e00] text-lg font-bold">
						{player.rating}
					</span>
					<span className="text-[#8aab8a] text-xs">/10</span>
					<div className="flex gap-1 ml-2">
						{player.positions.map((pos) => (
							<PositionBadge key={pos} position={pos} />
						))}
					</div>
				</div>

				{/* Type */}
				<div>
					<span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#8aab8a]">
						{player.youth ? "Youth" : "Adult"}
					</span>
				</div>

				{/* Edit */}
				<div className="flex justify-end">
					<button
						type="button"
						onClick={onEdit}
						className="h-8 px-3 border border-[#cbdbcc] text-[#021e00] text-xs font-semibold tracking-[0.08em] uppercase hover:border-[#021e00] hover:bg-[#021e00] hover:text-[#eef4f1] "
					>
						Edit
					</button>
				</div>
			</div>

			{/* Mobile */}
			<div className="md:hidden flex items-center px-4 py-4 border-b border-[#cbdbcc] hover:bg-white/20">
				<Avatar
					name={player.fullName}
					size="sm"
					className="mr-3 flex-shrink-0"
				/>
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-1.5 flex-wrap">
						<p className="text-[#021e00] font-medium text-sm">
							{player.fullName}
						</p>
						{player.youth && <Badge variant="youth">Youth</Badge>}
					</div>
					<div className="flex gap-1 mt-1">
						{player.positions.map((pos) => (
							<PositionBadge key={pos} position={pos} />
						))}
					</div>
				</div>
				<div className="flex items-center gap-3 ml-2">
					<div className="text-right">
						<span className="text-[#021e00] font-bold">{player.rating}</span>
						<span className="text-[#8aab8a] text-xs">/10</span>
					</div>
					<button
						type="button"
						onClick={onEdit}
						className="h-8 px-3 border border-[#cbdbcc] text-[#021e00] text-xs font-semibold tracking-[0.08em] uppercase "
					>
						Edit
					</button>
				</div>
			</div>
		</>
	);
}
