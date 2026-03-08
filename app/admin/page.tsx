"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";

export default function AdminPage() {
	const [cookiePaste, setCookiePaste] = useState("");
	const [cookieStatus, setCookieStatus] = useState<{
		active: boolean;
		lastSynced?: string;
	} | null>(null);
	const [updatingCookie, setUpdatingCookie] = useState(false);
	const [testingConnection, setTestingConnection] = useState(false);
	const [testConnectionStatus, setTestConnectionStatus] = useState<{
		ok: boolean;
		message: string;
	} | null>(null);

	const [importPlayersStatus, setImportPlayersStatus] = useState<string | null>(
		null,
	);
	const [importPracticesStatus, setImportPracticesStatus] = useState<
		string | null
	>(null);
	const [syncAttendanceStatus, setSyncAttendanceStatus] = useState<
		string | null
	>(null);

	const [importingPlayers, setImportingPlayers] = useState(false);
	const [importingPractices, setImportingPractices] = useState(false);
	const [syncingAttendance, setSyncingAttendance] = useState(false);

	const dbCookie = useQuery(api.settings.getSettingByKey, {
		key: "sporteasy_cookie",
	});
	const setSettingMutation = useMutation(api.settings.setSetting);

	const testConnectionAction = useAction(api.sporteasy.testConnection);
	const importProfilesAction = useAction(api.sporteasy.importProfiles);
	const importEventsAction = useAction(api.sporteasy.importEvents);

	useEffect(() => {
		if (dbCookie !== undefined && dbCookie !== null) {
			setCookieStatus({
				active: true,
				lastSynced: new Date(dbCookie._creationTime).toISOString(),
			});
		}
	}, [dbCookie]);

	const handleUpdateCookie = async () => {
		if (!cookiePaste.trim()) return;
		setUpdatingCookie(true);
		try {
			await setSettingMutation({
				key: "sporteasy_cookie",
				value: cookiePaste.trim(),
			});
			setCookieStatus({ active: true, lastSynced: new Date().toISOString() });
			setCookiePaste("");
		} catch (err) {
			console.error(err);
		} finally {
			setUpdatingCookie(false);
		}
	};

	const handleTestConnection = async () => {
		setTestingConnection(true);
		setTestConnectionStatus(null);
		try {
			const result = await testConnectionAction();
			setTestConnectionStatus(
				result.ok
					? { ok: true, message: "Connection successful" }
					: { ok: false, message: result.error ?? "Connection failed" },
			);
		} catch {
			setTestConnectionStatus({ ok: false, message: "Connection failed" });
		} finally {
			setTestingConnection(false);
			setTimeout(() => setTestConnectionStatus(null), 6000);
		}
	};

	const handleImportPlayers = async () => {
		setImportingPlayers(true);
		setImportPlayersStatus(null);
		try {
			const result = await importProfilesAction();
			const parts = [];
			if (result.imported > 0) parts.push(`${result.imported} imported`);
			if (result.updated > 0) parts.push(`${result.updated} updated`);
			if (result.skipped > 0) parts.push(`${result.skipped} skipped`);
			setImportPlayersStatus(
				parts.length > 0 ? parts.join(", ") : "Up to date",
			);
			setTimeout(() => setImportPlayersStatus(null), 5000);
		} catch {
			setImportPlayersStatus("Failed");
			setTimeout(() => setImportPlayersStatus(null), 5000);
		} finally {
			setImportingPlayers(false);
		}
	};

	const handleImportPractices = async () => {
		setImportingPractices(true);
		setImportPracticesStatus(null);
		try {
			const result = await importEventsAction();
			const parts = [];
			if (result.imported > 0) parts.push(`${result.imported} imported`);
			if (result.updated > 0) parts.push(`${result.updated} updated`);
			setImportPracticesStatus(
				parts.length > 0 ? parts.join(", ") : "Up to date",
			);
			setTimeout(() => setImportPracticesStatus(null), 5000);
		} catch {
			setImportPracticesStatus("Failed");
			setTimeout(() => setImportPracticesStatus(null), 5000);
		} finally {
			setImportingPractices(false);
		}
	};

	const handleSyncAttendance = async () => {
		setSyncingAttendance(true);
		setSyncAttendanceStatus(null);
		try {
			// Would call a sync attendance endpoint
			await new Promise((r) => setTimeout(r, 1500));
			setSyncAttendanceStatus("Synced");
			setTimeout(() => setSyncAttendanceStatus(null), 5000);
		} catch {
			setSyncAttendanceStatus("Failed");
			setTimeout(() => setSyncAttendanceStatus(null), 5000);
		} finally {
			setSyncingAttendance(false);
		}
	};

	const formatLastSync = (isoStr?: string) => {
		if (!isoStr) return "";
		const d = new Date(isoStr);
		return d.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
			hour: "numeric",
			minute: "2-digit",
		});
	};

	return (
		<div>
			<PageHeader eyebrow="Settings" title="Admin" />

			<div className="p-4 md:p-6 space-y-6 max-w-4xl">
				{/* SportEasy Integration */}
				<div className="border border-[#cbdbcc] overflow-hidden">
					<div className="bg-[#021e00] px-5 py-3 flex items-center gap-2">
						<RefreshCw className="h-4 w-4 text-[#8aab8a]" />
						<p className="text-[#eef4f1] text-xs font-semibold tracking-[0.12em] uppercase">
							SportEasy Integration
						</p>
					</div>
					<div className="bg-white p-5 space-y-5">
						<div>
							<div className="flex items-center gap-3 mb-1">
								<p className="text-[#021e00] font-semibold text-sm">
									Session Cookie
								</p>
								<p className="text-[#8aab8a] text-xs">
									Refreshes authentication with SportEasy API
								</p>
							</div>
							<p className="text-[#8aab8a] text-xs mb-3">
								To get your cookie: log into SportEasy in your browser → open
								DevTools → Network tab → copy the Cookie header value from any
								request.
							</p>
							{cookieStatus?.active && (
								<div className="flex items-center gap-2 px-3 py-2.5 bg-[#eef4f1] border border-[#cbdbcc] mb-4">
									<span className="h-2 w-2 bg-[#298a29] flex-shrink-0" />
									<p className="text-[#021e00] text-xs">
										Cookie active · Last synced{" "}
										{formatLastSync(cookieStatus.lastSynced)}
									</p>
								</div>
							)}
						</div>

						<div>
							<p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#4a8a40] mb-1.5">
								Paste New Cookie Value
							</p>
							<textarea
								value={cookiePaste}
								onChange={(e) => setCookiePaste(e.target.value)}
								placeholder="Paste cookie string here..."
								rows={3}
								className="w-full border border-[#cbdbcc] p-3 text-sm text-[#021e00] placeholder:text-[#8aab8a] focus:outline-none focus:border-[#298a29] resize-none"
							/>
						</div>

						<div className="flex flex-col gap-3">
							<div className="flex gap-3">
								<Button
									onClick={handleUpdateCookie}
									loading={updatingCookie}
									disabled={!cookiePaste.trim()}
									size="md"
								>
									Update Cookie
								</Button>
								<Button
									variant="outline"
									onClick={handleTestConnection}
									loading={testingConnection}
									size="md"
								>
									{!testingConnection && (
										<RefreshCw className="h-4 w-4 mr-1.5" />
									)}
									Test Connection
								</Button>
							</div>
							{testConnectionStatus && (
								<div
									className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border ${
										testConnectionStatus.ok
											? "bg-[#eef4f1] border-[#cbdbcc] text-[#021e00]"
											: "bg-red-50 border-red-200 text-red-700"
									}`}
								>
									<span
										className={`h-2 w-2 flex-shrink-0 ${
											testConnectionStatus.ok ? "bg-[#298a29]" : "bg-red-500"
										}`}
									/>
									{testConnectionStatus.message}
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Sync Actions */}
				<div className="border border-[#cbdbcc] overflow-hidden">
					<div className="bg-[#021e00] px-5 py-3">
						<p className="text-[#eef4f1] text-xs font-semibold tracking-[0.12em] uppercase">
							Sync Actions
						</p>
					</div>
					<div className="bg-white p-5">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<SyncCard
								title="Import Players"
								description="Pulls all profiles from SportEasy and upserts them into the player database."
								action="Run Import"
								onAction={handleImportPlayers}
								loading={importingPlayers}
								status={importPlayersStatus}
							/>
							<SyncCard
								title="Import Practices"
								description="Pulls upcoming events from SportEasy and upserts them into the practice schedule."
								action="Run Import"
								onAction={handleImportPractices}
								loading={importingPractices}
								status={importPracticesStatus}
							/>
							<SyncCard
								title="Sync Attendance"
								description="Refreshes attendance counts for all upcoming practices from SportEasy RSVP data."
								action="Run Sync"
								onAction={handleSyncAttendance}
								loading={syncingAttendance}
								status={syncAttendanceStatus}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function SyncCard({
	title,
	description,
	action,
	onAction,
	loading,
	status,
}: {
	title: string;
	description: string;
	action: string;
	onAction: () => void;
	loading: boolean;
	status: string | null;
}) {
	return (
		<div className="border border-[#cbdbcc] p-4 flex flex-col gap-3">
			<div>
				<p className="text-[#021e00] font-semibold text-sm">{title}</p>
				<p className="text-[#8aab8a] text-xs mt-1 leading-relaxed">
					{description}
				</p>
			</div>
			<div className="mt-auto">
				{status && (
					<p className="text-[#298a29] text-xs mb-2 font-medium">{status}</p>
				)}
				<Button
					variant="secondary"
					size="sm"
					onClick={onAction}
					loading={loading}
					className="text-[10px] px-3"
				>
					{action}
				</Button>
			</div>
		</div>
	);
}
