import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { api } from "../../convex/_generated/api";

export const useAttendanceReport = (
	seasonId: string,
	month: string,
	search: string,
): {
	result: FunctionReturnType<typeof api.attendance_reports.roster> | undefined;
	page: number;
	next?: () => void;
	previous?: () => void;
} => {
	const [cursors, setCursors] = useState<Array<string | null>>([null]);
	const result = useQuery(api.attendance_reports.roster, {
		seasonId,
		month: month || undefined,
		search,
		paginationOpts: { numItems: 100, cursor: cursors.at(-1) ?? null },
	});
	return {
		result,
		page: cursors.length,
		next:
			result && !result.isDone
				? (): void =>
						setCursors((current) => [...current, result.continueCursor])
				: undefined,
		previous:
			cursors.length > 1
				? (): void => setCursors((current) => current.slice(0, -1))
				: undefined,
	};
};
