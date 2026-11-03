import type { ClubEvent } from "../domain/app-types";
import { clubTimestamp } from "../domain/event-time";
import { useClubNow } from "./use-club-now";

export const useEventNow = (event: ClubEvent | undefined): number =>
	useClubNow(
		event
			? [
					event.opensAt,
					event.closesAt,
					clubTimestamp(event.date, event.start, event.timeZone),
					clubTimestamp(event.endDate ?? event.date, event.end, event.timeZone),
				]
			: [],
	);
