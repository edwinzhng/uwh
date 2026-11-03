import type { PaginationResult } from "convex/server";
import type { Notice } from "../src/domain/app-types";
import { bannerNotices } from "../src/domain/notices";

export const homeAnnouncementPage = (
	result: PaginationResult<Notice>,
	accountId: string,
	today: string,
): PaginationResult<Notice> => ({
	...result,
	page: bannerNotices(result.page, accountId, today)
		.slice(0, 1)
		.map((notice) => ({
			...notice,
			dismissedBy: notice.dismissedBy?.filter((id) => id === accountId),
			acknowledgedBy: [],
		})),
});
