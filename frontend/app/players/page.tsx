"use client";

import { api } from "@backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Search } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { EditPlayerModal } from "@/components/players/edit-player-modal";
import type { Player } from "@/components/players/player-row";
import { PlayerRow } from "@/components/players/player-row";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";

type Filter = "ALL" | "ADULT" | "YOUTH";

export default function PlayersPage() {
	const playersData = useQuery(api.players.getPlayers) ?? [];
	const loading = useQuery(api.players.getPlayers) === undefined;
	const [filter, setFilter] = useState<Filter>("ALL");
	const [search, setSearch] = useState("");
	const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

	const players = [...playersData].sort((a, b) =>
		a.fullName.localeCompare(b.fullName),
	);

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
					<>
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
						<div className="flex-1 md:flex-none">
							<Input
								placeholder="Search players..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								prefix={<Search className="h-3.5 w-3.5" />}
								className="md:w-52 text-xs font-medium !h-[34px]"
							/>
						</div>
					</>
				}
			/>

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
							key={player._id}
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
					onSaved={(_updated) => {
						setEditingPlayer(null);
					}}
				/>
			)}
		</div>
	);
}
