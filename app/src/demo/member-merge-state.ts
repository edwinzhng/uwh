import { type Atom, atom, type ExtractAtomValue, type Getter } from "jotai";
import { coreMemberMerge, mergeCollision } from "../domain/core-member-merge";
import { mergeDevelopmentHistory } from "../domain/development-member-merge";
import {
	type MemberMergePreview,
	memberMergeFingerprint,
} from "../domain/member-merge";
import { memberIdentityConflicts } from "../domain/member-merge-identity";
import { mergedProfileFields } from "../domain/profile-member-merge";
import { previewResourceMemberMerge } from "../domain/resource-member-merge";
import { mergeSeasonHistory } from "../domain/season-member-merge";
import { planSessionMemberPreview } from "../domain/session-member-merge";
import {
	previewAccountAtom,
	previewAccountsAtom,
	previewDataAtom,
	selectedPersonAtom,
} from "./app-state";
import { previewDevelopmentAtom } from "./development-state";
import { previewFitnessAtom } from "./fitness-state";
import { previewGoalReflectionsAtom } from "./goal-reflections-state";
import { previewHouseholdLinks } from "./household-data";
import {
	previewMemberProfiles,
	previewProfilePhotos,
} from "./member-profile-state";
import { previewResources } from "./resource-state";
import { previewSeasonLedgerAtom } from "./season-ledger-data";
import { previewSessionCheckinsAtom } from "./session-checkins-state";
import {
	previewPerformanceReports,
	previewSessionPerformanceAtom,
} from "./session-performance-state";
import { previewSessionSeries } from "./session-series-state";

export type MemberMergeInput = {
	sourceId: string;
	targetId: string;
	fillEmptyProfile: boolean;
};
export type MemberMergeCommand = MemberMergeInput & {
	token: string;
	confirmation: string;
	key: string;
};
export const previewMemberMergeAudits = atom<
	(MemberMergePreview & {
		actorId: string;
		key: string;
		at: number;
		fillEmptyProfile: boolean;
	})[]
>([]);

type PreviewPlan = {
	preview: MemberMergePreview;
	core: ReturnType<typeof coreMemberMerge>;
	session: ReturnType<typeof planSessionMemberPreview>;
	resources: ReturnType<typeof previewResourceMemberMerge>;
	ledger: ReturnType<
		typeof mergeSeasonHistory<
			ExtractAtomValue<typeof previewSeasonLedgerAtom>["history"][number]
		>
	>;
	development: ReturnType<
		typeof mergeDevelopmentHistory<
			ExtractAtomValue<typeof previewDevelopmentAtom>["rounds"][number],
			ExtractAtomValue<typeof previewDevelopmentAtom>["reviews"][number]
		>
	>;
	profile: ReturnType<typeof mergedProfileFields>;
	profiles: ExtractAtomValue<typeof previewMemberProfiles>;
	photos: ExtractAtomValue<typeof previewProfilePhotos>;
	reflections: ExtractAtomValue<typeof previewGoalReflectionsAtom>;
	rawResources: ExtractAtomValue<typeof previewResources>;
	performanceReports: ExtractAtomValue<typeof previewPerformanceReports>;
};
const previewPlan = (get: Getter, input: MemberMergeInput): PreviewPlan => {
	const actor = get(previewAccountAtom);
	if (!actor.admin) throw new Error("Administrator access required.");
	const data = get(previewDataAtom);
	const source = data.members.find((row) => row.id === input.sourceId);
	const target = data.members.find((row) => row.id === input.targetId);
	if (
		!source?.archived ||
		source.mergedInto ||
		!target ||
		target.archived ||
		target.mergedInto ||
		source.id === target.id
	)
		throw new Error(
			"Choose an unmerged archived source and a different active target.",
		);
	const pair = { source, target };
	const profiles = get(previewMemberProfiles);
	const photos = get(previewProfilePhotos);
	const rawDevelopment = get(previewDevelopmentAtom);
	const rawLedger = get(previewSeasonLedgerAtom);
	const reflections = get(previewGoalReflectionsAtom);
	const rawResources = get(previewResources);
	const performanceReports = get(previewPerformanceReports);
	const rawSession = {
		teams: data.teams,
		events: data.events,
		series: get(previewSessionSeries),
		checkins: get(previewSessionCheckinsAtom),
		fitness: get(previewFitnessAtom),
		performance: get(previewSessionPerformanceAtom),
	};
	const core = coreMemberMerge(data, pair);
	const session = planSessionMemberPreview(rawSession, source.id, target.id);
	const resources = previewResourceMemberMerge(
		rawResources,
		source.id,
		target.id,
	);
	const ledger = mergeSeasonHistory(
		rawLedger.records,
		rawLedger.history,
		source.id,
		target.id,
	);
	const development = mergeDevelopmentHistory(
		rawDevelopment.rounds,
		rawDevelopment.reviews,
		source.id,
		target.id,
	);
	const profile = mergedProfileFields(
		profiles[source.id],
		profiles[target.id],
		input.fillEmptyProfile,
	);
	const accounts = get(previewAccountsAtom);
	const householdLinks = get(previewHouseholdLinks);
	const conflicts = [
		...core.conflicts,
		...session.conflicts,
		...resources.conflicts,
		...ledger.conflicts,
		...memberIdentityConflicts(accounts, pair),
		...householdLinks
			.filter(
				(row) =>
					row.state === "available" &&
					[source.id, target.id].includes(row.personId),
			)
			.map(() =>
				mergeCollision(
					"Household invitations",
					"Pending guardian link or relink",
					"A pending household proof could restore a different private audience after this merge.",
					"Accept or dismiss the pending guardian link before merging.",
				),
			),
	];
	if (Object.keys(profiles).length > 1000)
		conflicts.push(
			mergeCollision(
				"Merge size",
				"Profile history",
				"This preview exceeds the safe interactive limit.",
				"Review the member history before merging.",
			),
		);
	const preview: MemberMergePreview = {
		source: { id: source.id, name: source.name },
		target: { id: target.id, name: target.name },
		filledFields: profile.filledFields,
		conflicts,
		counts: [
			{
				label: "Session feedback reports relinked",
				count: performanceReports.filter(
					(row) => row.source.personId === source.id,
				).length,
			},
			...core.counts,
			...session.counts,
			...resources.counts,
			{
				label: "Household account links relinked",
				count: accounts.filter(
					(row) =>
						row.personId === source.id || row.children.includes(source.id),
				).length,
			},
			{ label: "Season registration summaries relinked", count: ledger.count },
			{
				label: "Financial ledger entries relinked",
				count: rawLedger.history.filter((row) => row.personId === source.id)
					.length,
			},
			{
				label: "Goal reflections relinked",
				count: reflections.filter((row) => row.personId === source.id).length,
			},
			{
				label: "Player review rounds preserved and renumbered",
				count: rawDevelopment.rounds.some((row) => row.personId === source.id)
					? development.rounds.filter((row) => row.personId === target.id)
							.length
					: 0,
			},
			{
				label: "Coach review history relinked",
				count: rawDevelopment.reviews.filter(
					(row) => row.personId === source.id,
				).length,
			},
			{
				label: "Empty profile fields filled",
				count: profile.filledFields.length,
			},
		].filter((row) => row.count > 0),
		token: memberMergeFingerprint([
			JSON.stringify({
				data,
				profiles,
				photos,
				rawDevelopment,
				rawLedger,
				reflections,
				rawResources,
				performanceReports,
				rawSession,
				householdLinks,
				input: {
					sourceId: input.sourceId,
					targetId: input.targetId,
					fillEmptyProfile: input.fillEmptyProfile,
				},
			}),
		]),
	};
	return {
		preview,
		core,
		session,
		resources,
		ledger,
		development,
		profile,
		profiles,
		photos,
		reflections,
		rawResources,
		performanceReports,
	};
};
export const previewMemberMergePlanAtom = (
	input: MemberMergeInput,
): Atom<MemberMergePreview> =>
	atom((get): MemberMergePreview => previewPlan(get, input).preview);
export const mergePreviewMemberAtom = atom(
	undefined,
	(get, set, input: MemberMergeCommand): string => {
		const actor = get(previewAccountAtom);
		if (!actor.admin) throw new Error("Administrator access required.");
		if (input.key.length < 16 || input.key.length > 100)
			throw new Error("Reopen the merge preview and try again.");
		const previous = get(previewMemberMergeAudits).find(
			(row) => row.source.id === input.sourceId,
		);
		if (previous) {
			if (
				previous.actorId === actor.id &&
				previous.key === input.key &&
				previous.target.id === input.targetId &&
				previous.fillEmptyProfile === input.fillEmptyProfile &&
				previous.token === input.token &&
				previous.target.name === input.confirmation.trim()
			)
				return previous.target.id;
			throw new Error(
				"This profile was already merged. Open its canonical profile.",
			);
		}
		const plan = previewPlan(get, input);
		if (input.confirmation.trim() !== plan.preview.target.name)
			throw new Error("Type the target member’s full name to confirm.");
		if (input.token !== plan.preview.token)
			throw new Error(
				"A record changed after this preview. Review the refreshed preview before merging.",
			);
		if (plan.preview.conflicts.length)
			throw new Error(
				"Resolve every listed conflict before merging. No records have changed.",
			);
		const targetProfile = plan.profiles[input.targetId];
		if (targetProfile || plan.profile.filledFields.length)
			set(previewMemberProfiles, {
				...plan.profiles,
				[input.targetId]: {
					...plan.profile.fields,
					revision: (targetProfile?.revision ?? 0) + 1,
					lastKey: `merge:${input.sourceId}`,
					lastActorId: "",
					lastPayload: JSON.stringify({
						name: plan.preview.target.name,
						...plan.profile.fields,
					}),
				},
			});
		set(
			previewProfilePhotos,
			plan.photos.map((photo) =>
				photo.personId === input.sourceId && !photo.attached
					? { ...photo, personId: input.targetId }
					: photo,
			),
		);
		set(previewSessionSeries, plan.session.next.series);
		set(previewSessionCheckinsAtom, plan.session.next.checkins);
		set(previewFitnessAtom, plan.session.next.fitness);
		set(previewSessionPerformanceAtom, plan.session.next.performance ?? []);
		set(
			previewPerformanceReports,
			plan.performanceReports.map((row) =>
				row.source.personId === input.sourceId
					? { ...row, source: { ...row.source, personId: input.targetId } }
					: row,
			),
		);
		set(
			previewResources,
			plan.rawResources.map((resource) => {
				const update = plan.resources.updates.find(
					(row) => row.id === resource.id,
				);
				return update
					? {
							...resource,
							personIds: update.personIds,
							revision: resource.revision + 1,
							updatedAt: Date.now(),
						}
					: resource;
			}),
		);
		set(previewDevelopmentAtom, plan.development);
		set(
			previewHouseholdLinks,
			get(previewHouseholdLinks).map((row) =>
				row.personId === input.sourceId
					? { ...row, personId: input.targetId }
					: row,
			),
		);
		set(previewSeasonLedgerAtom, {
			records: plan.ledger.records,
			history: plan.ledger.history,
		});
		set(
			previewGoalReflectionsAtom,
			plan.reflections.map((row) =>
				row.personId === input.sourceId
					? { ...row, personId: input.targetId }
					: row,
			),
		);
		set(previewDataAtom, {
			...plan.core.next,
			teams: plan.session.next.teams,
			members: plan.core.next.members.map((row) =>
				row.id === input.sourceId
					? {
							...row,
							archived: true,
							mergedInto: input.targetId,
							mergedAt: new Date().toISOString(),
						}
					: row,
			),
		});
		if (get(selectedPersonAtom) === input.sourceId)
			set(selectedPersonAtom, input.targetId);
		set(previewMemberMergeAudits, [
			...get(previewMemberMergeAudits),
			{
				...plan.preview,
				actorId: actor.id,
				key: input.key,
				at: Date.now(),
				fillEmptyProfile: input.fillEmptyProfile,
			},
		]);
		return input.targetId;
	},
);
