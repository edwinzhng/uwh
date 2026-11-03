import { initialAppData, primaryAccount } from "../../src/demo/app-data";
import { attendanceSegmentRadius } from "../../src/design-system/attendance-plot-model";
import { richSelection } from "../../src/design-system/rich-message-model";
import type { ClubEvent } from "../../src/domain/app-types";
import { normalizeGroup } from "../../src/domain/group-conversation";
import { homeSchedule, nextCoachingEvent } from "../../src/domain/home";
import { balancingProfileChanged } from "../../src/domain/player-coaching";
import { resourceUrl } from "../../src/domain/resources";
import { normalizeParticipantIds } from "../../src/domain/thread-participants";

export const nativeRuntimeSmoke = (): {
	coaching: boolean;
	events: number;
	participants: string[];
	group: string[];
	immutable: boolean;
	selection: number;
	rounded: boolean;
	resource: boolean;
} => {
	const now = Date.parse("2026-10-26T12:00:00Z");
	const event: ClubEvent = {
		id: "native-runtime-practice",
		title: "Runtime practice",
		date: "2026-10-27",
		start: "19:00",
		end: "20:00",
		venue: "Pool",
		program: "club",
		kind: "training",
		signup: "open",
		description: "",
		cancelled: false,
	};
	const data = { ...initialAppData, events: [event] };
	const positions = ["WING", "FORWARD"] as const;
	const profile = {
		personId: "native-runtime-person",
		rating: 50,
		positions: [...positions],
		ageGroup: "adult" as const,
		revision: 0,
	};
	const changed = balancingProfileChanged(profile, {
		...profile,
		positions: ["FORWARD", "WING"],
	});
	return {
		coaching: Boolean(
			nextCoachingEvent(
				data,
				{ ...primaryAccount, coachPrograms: ["club"] },
				now,
			),
		),
		events: homeSchedule(data.events, now, initialAppData.timeZone).events
			.length,
		participants: normalizeParticipantIds(["second", "first", "second"]),
		group: normalizeGroup({
			groupId: "group-native-runtime",
			name: "Runtime compatibility",
			recipientIds: ["second", "first"],
		}).recipientIds,
		immutable:
			!changed &&
			JSON.stringify(profile.positions) === JSON.stringify(positions),
		selection: richSelection("A🦦B", { start: 2, end: 2 }).start,
		resource:
			resourceUrl("https://club.example.org/docs") ===
				"https://club.example.org/docs" &&
			resourceUrl("bad link") === undefined &&
			resourceUrl("https://secret@club.example.org/docs") === undefined,
		rounded:
			attendanceSegmentRadius(
				{ label: "Oct", onTime: 4, late: 2, absent: 0 },
				"late",
				30,
				20,
			) > 0,
	};
};
