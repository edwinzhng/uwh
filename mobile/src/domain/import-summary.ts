import { money } from "./app-rules";
import type { ImportRecord } from "./import-data";
export const importSummary = (record: ImportRecord): string => {
	switch (record.kind) {
		case "members":
			return `${record.memberId ? "Link existing member" : "New player"} · ${record.sourceId}`;
		case "events":
			return `${record.draft.date} · ${record.draft.start}–${record.draft.end} · ${record.draft.venue} · ${record.draft.capacity} places · Private`;
		case "attendance":
			return `${record.person} · ${record.event} · ${record.response} · ${record.attendance}`;
		case "registration":
			return `${record.person} · ${record.status} · CUGA ${record.cuga ? "Yes" : "No"} · ${money(record.dues)} dues`;
		case "payments":
			return `${record.person} · ${money(record.amount)} · ${record.date} · ${record.note}`;
	}
};
