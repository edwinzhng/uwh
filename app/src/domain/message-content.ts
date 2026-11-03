import { parseRichMessage } from "../shared/rich-message-parser";

export const hasVisibleMessageContent = (body: string): boolean =>
	parseRichMessage(body).blocks.some((block) =>
		block.runs.some((run) => Boolean(run.text.trim())),
	);
