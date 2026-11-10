import { useQuery } from "convex/react";
import { randomUUID } from "expo-crypto";
import { parse, useURL } from "expo-linking";
import * as SecureStore from "expo-secure-store";
import { useAtomValue } from "jotai";
import { type ReactElement, useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import { selectedPersonAtom, useApp } from "../demo/app-state";
import { canManagePerson } from "../domain/app-rules";
import {
	type PracticeWidgetEntry,
	practiceWidgetSnapshot,
	practiceWidgetTimeline,
	signedOutWidgetProps,
	widgetReplyRequest,
} from "../domain/practice-widget";
import { nativeFeatureAvailable } from "../platform/native-feature";

const generation = { value: 0 };
const handledReplyLinks = new Set<string>();
const replyKeyName = "practice-widget-reply-key";
const replyKeyPromise: { value?: Promise<string> } = {};

const loadReplyKey = (): Promise<string> => {
	replyKeyPromise.value ??= SecureStore.getItemAsync(replyKeyName).then(
		async (stored): Promise<string> => {
			if (stored) return stored;
			const created = randomUUID();
			await SecureStore.setItemAsync(replyKeyName, created);
			return created;
		},
	);
	return replyKeyPromise.value;
};
const useReplyKey = (): string | undefined => {
	const [key, setKey] = useState<string>();
	useEffect((): void => {
		void loadReplyKey()
			.then(setKey)
			.catch((): void => setKey(""));
	}, []);
	return key;
};
const loadWidget = (): Promise<
	typeof import("../widgets/next-practice").default
> => import("../widgets/next-practice").then((module) => module.default);
const publish = (entries: PracticeWidgetEntry[]): void => {
	const current = ++generation.value;
	void loadWidget()
		.then((widget): void => {
			if (current === generation.value)
				widget.updateTimeline(
					entries.map((entry) => ({
						date: new Date(entry.timestamp),
						props: entry.props,
					})),
				);
		})
		.catch((): void => {});
};
const publishSignedOut = (): void =>
	publish([{ timestamp: Date.now(), props: signedOutWidgetProps }]);
const queryParams = (url: string): Record<string, string | undefined> =>
	Object.fromEntries(
		Object.entries(parse(url).queryParams ?? {}).map(([name, value]) => [
			name,
			typeof value === "string" ? value : undefined,
		]),
	);

export const PracticeWidgetBootstrap = (): undefined => {
	useEffect((): void => {
		if (!nativeFeatureAvailable("ExpoWidgets")) return;
		void loadWidget()
			.then((widget) => widget.getTimeline())
			.then((entries): void => {
				if (entries.length === 0) publishSignedOut();
			})
			.catch((): void => {});
	}, []);
	return undefined;
};
const LiveWidget = (): ReactElement | undefined => {
	const { account, dispatch } = useApp();
	const selected = useAtomValue(selectedPersonAtom);
	const personId = canManagePerson(account, selected)
		? selected
		: account.personId;
	const replyKey = useReplyKey();
	const url = useURL();
	const workspace = useQuery(api.club.current, { screen: "home" });
	const nextPractice = workspace
		? practiceWidgetSnapshot(
				workspace.data,
				workspace.account,
				personId,
				Date.now(),
			)
		: undefined;
	const eventId =
		nextPractice?.kind === "practice" ? nextPractice.eventId : undefined;
	const assignments = useQuery(
		api.lineup.homeAssignments,
		eventId ? { eventId } : "skip",
	);
	useEffect((): (() => void) => publishSignedOut, []);
	useEffect((): void => {
		if (!url || !workspace || replyKey === undefined) return;
		if (handledReplyLinks.has(url)) return;
		const request = widgetReplyRequest(
			queryParams(url),
			replyKey,
			workspace.data,
			workspace.account,
			Date.now(),
		);
		if (!request) return;
		handledReplyLinks.add(url);
		void dispatch({ type: "respond", ...request });
	}, [url, workspace, replyKey, dispatch]);
	useEffect((): void => {
		if (
			!workspace ||
			replyKey === undefined ||
			(eventId && assignments === undefined)
		)
			return;
		publish(
			practiceWidgetTimeline(
				workspace.data,
				workspace.account,
				personId,
				Date.now(),
				replyKey,
				eventId && assignments ? { eventId, assignments } : undefined,
			),
		);
	}, [workspace, eventId, assignments, personId, replyKey]);
	return undefined;
};
export const PracticeWidgetSync = (): ReactElement | undefined => {
	const { source } = useApp();
	return source === "convex" && nativeFeatureAvailable("ExpoWidgets") ? (
		<LiveWidget />
	) : undefined;
};
