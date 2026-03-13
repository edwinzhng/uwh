"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Pencil, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EditFitnessTestModal } from "@/components/fitness/edit-fitness-test-modal";
import { EditFitnessTestSessionModal } from "@/components/fitness/edit-fitness-test-session-modal";
import {
	type FitnessResultDraft,
	FitnessResultRow,
} from "@/components/fitness/fitness-result-row";
import { FitnessTestListItem } from "@/components/fitness/fitness-test-list-item";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { getFitnessTestBestLabel } from "@/lib/fitness";
import { cn, formatDate } from "@/lib/utils";

type PlayerFilter = "ALL" | "ADULT" | "YOUTH";
type FitnessDraftMap = Record<string, FitnessResultDraft>;
type FitnessTestSummaryQuery = FunctionReturnType<
	typeof api.fitnessTests.getFitnessTests
>;
type FitnessWorkspaceQuery = FunctionReturnType<
	typeof api.fitnessTests.getFitnessTestWorkspace
>;
type FitnessWorkspace = NonNullable<FitnessWorkspaceQuery>;
type FitnessTestSummary = NonNullable<FitnessTestSummaryQuery>[number];

const buildDraftMap = (
	results: FitnessWorkspace["results"] | undefined,
): FitnessDraftMap =>
	Object.fromEntries(
		(results ?? []).map((result) => [
			result.playerId,
			{
				notes: result.notes ?? "",
				value: result.value,
			},
		]),
	);

const normalizeDraftValue = (
	draft: FitnessResultDraft | undefined,
): FitnessResultDraft => ({
	notes: draft?.notes.trim() ?? "",
	value: draft?.value.trim() ?? "",
});

const hasDraftChanges = (
	currentDrafts: FitnessDraftMap,
	nextDrafts: FitnessDraftMap,
	playerIds: Array<Id<"players">>,
): boolean =>
	playerIds.some((playerId) => {
		const currentDraft = normalizeDraftValue(currentDrafts[playerId]);
		const nextDraft = normalizeDraftValue(nextDrafts[playerId]);
		return (
			currentDraft.notes !== nextDraft.notes ||
			currentDraft.value !== nextDraft.value
		);
	});

export default function FitnessPage(): React.JSX.Element {
	const testsQuery = useQuery(api.fitnessTests.getFitnessTests);
	const playersQuery = useQuery(api.players.getPlayers);
	const tests: Array<FitnessTestSummary> = testsQuery ?? [];
	const playersData = playersQuery ?? [];
	const loadingTests = testsQuery === undefined;
	const loadingPlayers = playersQuery === undefined;
	const [selectedTestId, setSelectedTestId] = useState<Id<"fitnessTests">>();
	const [selectedSessionId, setSelectedSessionId] =
		useState<Id<"fitnessTestSessions">>();
	const [search, setSearch] = useState("");
	const [playerFilter, setPlayerFilter] = useState<PlayerFilter>("ALL");
	const [drafts, setDrafts] = useState<FitnessDraftMap>({});
	const [isSessionMenuOpen, setIsSessionMenuOpen] = useState(false);
	const [testModalMode, setTestModalMode] = useState<"create" | "edit">();
	const [sessionModalMode, setSessionModalMode] = useState<"create" | "edit">();
	const [saveState, setSaveState] = useState<{
		error?: string;
		isSaving: boolean;
		message?: string;
	}>({
		isSaving: false,
	});

	useEffect(() => {
		if (tests.length === 0) {
			setSelectedTestId(undefined);
			return;
		}

		const hasSelectedTest = tests.some((test) => test._id === selectedTestId);
		if (!selectedTestId || !hasSelectedTest) {
			setSelectedTestId(tests[0]?._id);
		}
	}, [selectedTestId, tests]);

	useEffect(() => {
		if (selectedTestId === undefined) {
			setSelectedSessionId(undefined);
			setIsSessionMenuOpen(false);
			setDrafts({});
			setSaveState({
				isSaving: false,
			});
			return;
		}

		setSelectedSessionId(undefined);
		setIsSessionMenuOpen(false);
		setDrafts({});
		setSaveState({
			isSaving: false,
		});
	}, [selectedTestId]);

	const workspaceQuery = useQuery(
		api.fitnessTests.getFitnessTestWorkspace,
		selectedTestId
			? {
					fitnessTestId: selectedTestId,
					sessionId: selectedSessionId,
				}
			: "skip",
	);
	const workspace = workspaceQuery ?? undefined;
	const loadingWorkspace =
		selectedTestId !== undefined && workspaceQuery === undefined;
	const loading = loadingTests || loadingPlayers || loadingWorkspace;

	useEffect(() => {
		if (!workspace) return;
		if (workspace.sessions.length === 0) {
			setSelectedSessionId(undefined);
			return;
		}

		const hasSelectedSession = workspace.sessions.some(
			(session) => session._id === selectedSessionId,
		);
		if (!selectedSessionId || !hasSelectedSession) {
			setSelectedSessionId(workspace.sessions[0]?._id);
		}
	}, [selectedSessionId, workspace]);

	useEffect(() => {
		setDrafts(buildDraftMap(workspace?.results));
		setSaveState({
			isSaving: false,
		});
	}, [workspace?.results]);

	const saveFitnessTestSession = useMutation(
		api.fitnessTests.saveFitnessTestSession,
	);

	const filteredTests = useMemo(
		(): Array<FitnessTestSummary> =>
			tests.filter((test) =>
				test.name.toLowerCase().includes(search.trim().toLowerCase()),
			),
		[search, tests],
	);

	const players = useMemo(
		(): Array<Doc<"players">> =>
			[...playersData]
				.sort((left, right) => left.fullName.localeCompare(right.fullName))
				.filter((player) => {
					if (playerFilter === "ADULT") return !player.youth;
					if (playerFilter === "YOUTH") return player.youth;
					return true;
				}),
		[playerFilter, playersData],
	);

	const bestResultsByPlayerId = useMemo(
		(): Record<string, string> =>
			Object.fromEntries(
				(workspace?.bestResults ?? []).map((result) => [
					result.playerId,
					result.value,
				]),
			),
		[workspace?.bestResults],
	);
	const currentSessionDrafts = useMemo(
		(): FitnessDraftMap => buildDraftMap(workspace?.results),
		[workspace?.results],
	);
	const hasUnsavedChanges = useMemo(
		(): boolean =>
			hasDraftChanges(
				currentSessionDrafts,
				drafts,
				playersData.map((player) => player._id),
			),
		[currentSessionDrafts, drafts, playersData],
	);

	const selectedTest = tests.find((test) => test._id === selectedTestId);
	const selectedSession = workspace?.selectedSession;

	const updateDraft = (
		playerId: Id<"players">,
		key: keyof FitnessResultDraft,
		value: string,
	): void => {
		setDrafts((currentDrafts) => ({
			...currentDrafts,
			[playerId]: {
				notes: currentDrafts[playerId]?.notes ?? "",
				value: currentDrafts[playerId]?.value ?? "",
				[key]: value,
			},
		}));
		setSaveState({
			isSaving: false,
		});
	};

	const handleSaveSession = async (): Promise<void> => {
		if (!selectedSessionId) {
			setSaveState({
				error: "Create or select a session first",
				isSaving: false,
			});
			return;
		}

		setSaveState({
			isSaving: true,
		});

		try {
			await saveFitnessTestSession({
				entries: playersData.map((player) => ({
					notes: drafts[player._id]?.notes.trim() || undefined,
					playerId: player._id,
					value: drafts[player._id]?.value.trim() ?? "",
				})),
				sessionId: selectedSessionId,
			});
			setSaveState({
				isSaving: false,
				message: "Session saved",
			});
		} catch {
			setSaveState({
				error: "Unable to save session",
				isSaving: false,
			});
		}
	};

	const handleSessionChange = (sessionValue: string): void => {
		const nextSession = workspace?.sessions.find(
			(session) => session._id === sessionValue,
		);
		setSelectedSessionId(nextSession?._id);
		setIsSessionMenuOpen(false);
	};

	const headerSubtitle = loadingTests
		? "Loading..."
		: `${tests.length} test${tests.length === 1 ? "" : "s"}`;

	return (
		<div>
			<PageHeader
				eyebrow="Performance"
				title="Fitness Tests"
				subtitle={headerSubtitle}
				actions={
					<Button
						className="h-9 flex-none px-4 whitespace-nowrap"
						onClick={() => setTestModalMode("create")}
					>
						<Plus className="mr-1.5 h-4 w-4" />
						New Test
					</Button>
				}
			/>

			<div className="hidden min-h-[calc(100vh-115px)] md:flex">
				<div className="flex min-h-full w-[360px] flex-shrink-0 flex-col border-r border-[#cbdbcc] bg-[#fbfcfb]">
					<div className="border-b border-[#cbdbcc] bg-[#eef4f1] px-5 py-4">
						<Input
							placeholder="Search tests..."
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							prefix={<Search className="h-3.5 w-3.5" />}
						/>
					</div>

					<div className="flex-1">
						{filteredTests.map((fitnessTest) => (
							<FitnessTestListItem
								key={fitnessTest._id}
								fitnessTest={fitnessTest}
								isSelected={fitnessTest._id === selectedTestId}
								onSelect={() => setSelectedTestId(fitnessTest._id)}
							/>
						))}
					</div>
				</div>

				<div className="flex min-w-0 flex-1 flex-col">
					{loading ? (
						<div className="flex min-h-[calc(100vh-115px)] flex-1 items-center justify-center">
							<div className="h-6 w-6 rounded-full border-2 border-[#298a29] border-t-transparent animate-spin" />
						</div>
					) : selectedTest && workspace ? (
						<div>
							<div className="px-7 py-6">
								<div className="flex items-start">
									<div className="flex min-w-0 items-start gap-2">
										<h2 className="min-w-0 break-words text-4xl font-medium leading-none text-[#021e00] 2xl:text-5xl">
											{selectedTest.name}
										</h2>
									</div>
									<Button
										aria-label="Edit test"
										className="px-3"
										size="sm"
										variant="ghost"
										onClick={() => setTestModalMode("edit")}
									>
										<Pencil className="h-4 w-4" />
									</Button>
								</div>
							</div>

							<div className="px-7 py-5">
								<div className="flex flex-wrap items-end justify-between gap-5">
									<div className="min-w-[280px] flex-1">
										<label
											className="block text-xs font-semibold tracking-[0.08em] uppercase text-[#4a8a40]"
											htmlFor="fitness-session-trigger"
										>
											Sessions
										</label>
										<div className="relative mt-2">
											<button
												id="fitness-session-trigger"
												type="button"
												onClick={() =>
													setIsSessionMenuOpen((currentOpen) => !currentOpen)
												}
												className="flex h-9 items-center gap-1 border border-[#cbdbcc] px-3 text-xs font-medium text-[#021e00] hover:border-[#021e00]"
											>
												{selectedSession
													? formatDate(selectedSession.date)
													: "Select a session"}{" "}
												▾
											</button>
											{isSessionMenuOpen ? (
												<div className="absolute left-0 top-full z-20 mt-1 min-w-[180px] border border-[#cbdbcc] bg-white shadow-lg">
													{workspace.sessions.length === 0 ? (
														<div className="px-4 py-2.5 text-sm text-[#6c866d]">
															No sessions yet
														</div>
													) : (
														workspace.sessions.map((session) => (
															<button
																key={session._id}
																type="button"
																onClick={() => handleSessionChange(session._id)}
																className={cn(
																	"block w-full px-4 py-2.5 text-left text-sm hover:bg-[#eef4f1]",
																	session._id === selectedSessionId
																		? "font-medium text-[#298a29]"
																		: "text-[#021e00]",
																)}
															>
																{formatDate(session.date)}
															</button>
														))
													)}
												</div>
											) : null}
										</div>
									</div>

									<div className="flex flex-wrap items-center gap-3">
										<Button
											className="whitespace-nowrap px-5"
											size="sm"
											variant="outline"
											onClick={() => setSessionModalMode("create")}
										>
											<Plus className="mr-1.5 h-4 w-4" />
											New Session
										</Button>
									</div>
								</div>

								<div className="-mx-7 mt-5 border-t border-[#cbdbcc] px-7 pt-5 flex flex-wrap items-center justify-between gap-5">
									<div className="max-w-full">
										<SegmentedControl
											options={[
												{ label: "All", value: "ALL" },
												{ label: "Adult", value: "ADULT" },
												{ label: "Youth", value: "YOUTH" },
											]}
											size="sm"
											value={playerFilter}
											onChange={(value) => setPlayerFilter(value)}
										/>
									</div>

									<div className="flex flex-wrap items-center gap-3">
										<Button
											className="whitespace-nowrap px-4"
											disabled={!selectedSession}
											size="sm"
											variant="outline"
											onClick={() => setSessionModalMode("edit")}
										>
											Edit
										</Button>
										<Button
											className="min-w-[126px] whitespace-nowrap"
											disabled={!selectedSession || !hasUnsavedChanges}
											loading={saveState.isSaving}
											size="sm"
											onClick={() => void handleSaveSession()}
										>
											Save Changes
										</Button>
									</div>
								</div>

								{saveState.message || saveState.error ? (
									<p
										className={cn(
											"mt-4 text-sm",
											saveState.error ? "text-red-600" : "text-[#298a29]",
										)}
									>
										{saveState.error ?? saveState.message}
									</p>
								) : null}
							</div>

							<div className="flex-1 px-7 py-5">
								{selectedSession ? (
									<>
										<div className="grid grid-cols-[minmax(0,1.8fr)_minmax(90px,0.7fr)_minmax(140px,0.9fr)_minmax(160px,1fr)] gap-4 border border-[#cbdbcc] bg-[#eef4f1] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8aab8a]">
											<span>Player</span>
											<span>Best Result</span>
											<span>Today</span>
											<span>Notes</span>
										</div>
										{players.length === 0 ? (
											<div className="border-x border-b border-[#cbdbcc] bg-white px-4 py-10 text-center">
												<p className="text-base font-medium text-[#021e00]">
													No results
												</p>
											</div>
										) : (
											players.map((player) => (
												<FitnessResultRow
													key={player._id}
													bestResult={getFitnessTestBestLabel(
														bestResultsByPlayerId[player._id],
														selectedTest.unit,
													)}
													draft={drafts[player._id] ?? { notes: "", value: "" }}
													layout="desktop"
													onNotesChange={(value) =>
														updateDraft(player._id, "notes", value)
													}
													onValueChange={(value) =>
														updateDraft(player._id, "value", value)
													}
													player={player}
													unit={selectedTest.unit}
												/>
											))
										)}
									</>
								) : (
									<div className="border border-[#cbdbcc] bg-white px-6 py-12 text-center">
										<p className="text-xl font-medium text-[#021e00]">
											No session selected
										</p>
										<p className="mt-2 text-sm text-[#6c866d]">
											Create a session to start entering results.
										</p>
									</div>
								)}

								<div className="mt-7 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
									{workspace.summaryCards.map((card) => (
										<div
											key={card.label}
											className="border border-[#cbdbcc] bg-white px-4 py-4"
										>
											<p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8aab8a]">
												{card.label}
											</p>
											<p className="mt-2 text-xl font-medium leading-tight text-[#021e00]">
												{card.value}
											</p>
											<p className="mt-2 text-sm text-[#6c866d]">
												{card.secondary}
											</p>
										</div>
									))}
								</div>
							</div>
						</div>
					) : (
						<div className="flex min-h-[calc(100vh-95px)] flex-col items-center justify-center px-8 text-center">
							<p className="text-3xl font-medium text-[#021e00]">
								No fitness tests yet
							</p>
							<p className="mt-2 text-base text-[#6c866d]">
								Create the first test to start entering results by session.
							</p>
							<Button
								className="mt-5"
								onClick={() => setTestModalMode("create")}
							>
								New Test
							</Button>
						</div>
					)}
				</div>
			</div>

			<div className="md:hidden">
				<div className="border-b border-[#cbdbcc] bg-[#eef4f1] px-4 py-4">
					{selectedTest ? (
						<div className="flex items-center gap-2 pb-4">
							<p className="min-w-0 text-3xl font-medium leading-none text-[#021e00]">
								{selectedTest.name}
							</p>
							<Button
								aria-label="Edit test"
								className="px-3"
								size="sm"
								variant="ghost"
								onClick={() => setTestModalMode("edit")}
							>
								<Pencil className="h-4 w-4" />
							</Button>
						</div>
					) : null}
					<div className="flex items-end justify-between gap-3">
						<div className="min-w-0 flex-1">
							<label
								className="block text-xs font-semibold tracking-[0.08em] uppercase text-[#4a8a40]"
								htmlFor="fitness-session-trigger-mobile"
							>
								Sessions
							</label>
							<div className="relative mt-2">
								<button
									id="fitness-session-trigger-mobile"
									type="button"
									onClick={() =>
										setIsSessionMenuOpen((currentOpen) => !currentOpen)
									}
									className="flex h-9 items-center gap-1 border border-[#cbdbcc] px-3 text-xs font-medium text-[#021e00] hover:border-[#021e00]"
								>
									{selectedSession
										? formatDate(selectedSession.date)
										: "Select a session"}{" "}
									▾
								</button>
								{isSessionMenuOpen ? (
									<div className="absolute left-0 top-full z-20 mt-1 min-w-[180px] border border-[#cbdbcc] bg-white shadow-lg">
										{workspace?.sessions.length === 0 ? (
											<div className="px-4 py-2.5 text-sm text-[#6c866d]">
												No sessions yet
											</div>
										) : (
											workspace?.sessions.map((session) => (
												<button
													key={session._id}
													type="button"
													onClick={() => handleSessionChange(session._id)}
													className={cn(
														"block w-full px-4 py-2.5 text-left text-sm hover:bg-[#eef4f1]",
														session._id === selectedSessionId
															? "font-medium text-[#298a29]"
															: "text-[#021e00]",
													)}
												>
													{formatDate(session.date)}
												</button>
											))
										)}
									</div>
								) : null}
							</div>
						</div>
						<Button
							size="sm"
							variant="outline"
							onClick={() => setSessionModalMode("create")}
						>
							<Plus className="mr-1.5 h-4 w-4" />
							New Session
						</Button>
					</div>
					<div className="mt-4 border-t border-[#cbdbcc] pt-4">
						<div className="flex items-center justify-between gap-3">
							<div className="overflow-x-auto pb-1">
								<SegmentedControl
									options={[
										{ label: "All", value: "ALL" },
										{ label: "Adult", value: "ADULT" },
										{ label: "Youth", value: "YOUTH" },
									]}
									size="sm"
									value={playerFilter}
									onChange={(value) => setPlayerFilter(value)}
								/>
							</div>
							<div className="flex items-center gap-2">
								<Button
									disabled={!selectedSession}
									size="sm"
									className="px-4"
									variant="outline"
									onClick={() => setSessionModalMode("edit")}
								>
									Edit
								</Button>
								<Button
									disabled={!selectedSession || !hasUnsavedChanges}
									loading={saveState.isSaving}
									size="sm"
									className="min-w-[126px]"
									onClick={() => void handleSaveSession()}
								>
									Save Changes
								</Button>
							</div>
						</div>
					</div>
					{saveState.message || saveState.error ? (
						<p
							className={cn(
								"mt-3 text-sm",
								saveState.error ? "text-red-600" : "text-[#298a29]",
							)}
						>
							{saveState.error ?? saveState.message}
						</p>
					) : null}
				</div>

				<div>
					{loading ? (
						<div className="flex min-h-[40vh] items-center justify-center">
							<div className="h-6 w-6 rounded-full border-2 border-[#298a29] border-t-transparent animate-spin" />
						</div>
					) : selectedTest ? (
						selectedSession ? (
							players.length === 0 ? (
								<div className="px-4 py-5">
									<div className="grid grid-cols-[minmax(0,1.8fr)_minmax(90px,0.7fr)_minmax(140px,0.9fr)_minmax(160px,1fr)] gap-4 border border-[#cbdbcc] bg-[#eef4f1] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8aab8a]">
										<span>Player</span>
										<span>Best Result</span>
										<span>Today</span>
										<span>Notes</span>
									</div>
									<div className="border-x border-b border-[#cbdbcc] bg-white px-4 py-10 text-center">
										<p className="text-base font-medium text-[#021e00]">
											No results
										</p>
									</div>
								</div>
							) : (
								players.map((player) => (
									<FitnessResultRow
										key={player._id}
										bestResult={getFitnessTestBestLabel(
											bestResultsByPlayerId[player._id],
											selectedTest.unit,
										)}
										draft={drafts[player._id] ?? { notes: "", value: "" }}
										layout="mobile"
										onNotesChange={(value) =>
											updateDraft(player._id, "notes", value)
										}
										onValueChange={(value) =>
											updateDraft(player._id, "value", value)
										}
										player={player}
										unit={selectedTest.unit}
									/>
								))
							)
						) : (
							<div className="px-5 py-10 text-center">
								<p className="text-xl font-medium text-[#021e00]">
									No session selected
								</p>
								<p className="mt-2 text-sm text-[#6c866d]">
									Create a session to start entering results.
								</p>
							</div>
						)
					) : (
						<div className="px-5 py-10 text-center">
							<p className="text-xl font-medium text-[#021e00]">
								No fitness tests yet
							</p>
						</div>
					)}
				</div>

				{workspace ? (
					<div className="grid gap-3 bg-[#f4f7f4] px-4 py-4">
						{workspace.summaryCards.map((card) => (
							<div
								key={card.label}
								className="border border-[#cbdbcc] bg-white px-4 py-4"
							>
								<p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8aab8a]">
									{card.label}
								</p>
								<p className="mt-2 text-xl font-medium leading-tight text-[#021e00]">
									{card.value}
								</p>
								<p className="mt-2 text-sm text-[#6c866d]">{card.secondary}</p>
							</div>
						))}
					</div>
				) : null}
			</div>

			{testModalMode ? (
				<EditFitnessTestModal
					fitnessTest={testModalMode === "edit" ? selectedTest : undefined}
					onArchived={() => {
						setSelectedSessionId(undefined);
						setSelectedTestId(undefined);
						setTestModalMode(undefined);
					}}
					onClose={() => setTestModalMode(undefined)}
					onSaved={(fitnessTestId) => {
						setSelectedTestId(fitnessTestId);
						setTestModalMode(undefined);
					}}
				/>
			) : null}

			{sessionModalMode && selectedTestId ? (
				<EditFitnessTestSessionModal
					fitnessTestId={selectedTestId}
					onClose={() => setSessionModalMode(undefined)}
					onDeleted={() => {
						const currentSessionIndex =
							workspace?.sessions.findIndex(
								(session) => session._id === selectedSessionId,
							) ?? -1;
						const nextSession = workspace?.sessions.at(currentSessionIndex + 1);
						const previousSession =
							currentSessionIndex > 0
								? workspace?.sessions.at(currentSessionIndex - 1)
								: undefined;
						setSelectedSessionId(nextSession?._id ?? previousSession?._id);
						setSessionModalMode(undefined);
					}}
					onSaved={(sessionId) => {
						setSelectedSessionId(sessionId);
						setSessionModalMode(undefined);
					}}
					session={sessionModalMode === "edit" ? selectedSession : undefined}
				/>
			) : null}
		</div>
	);
}
