import { useState } from "react";
import type { SessionPerformanceService } from "../backend/use-session-performance";
import {
	type SessionPerformanceEntry,
	type SessionPerformanceKind,
	sessionPerformancePayload,
	validateSessionPerformance,
} from "../domain/session-performance";
import {
	type SessionPerformanceDraft,
	sessionPerformanceDraft,
} from "../domain/session-performance-draft";
import type { useFormTask } from "./use-form-task";
import { useOperationKey } from "./use-operation-key";

export const useSessionPerformanceForm = ({
	personId,
	eventId,
	kind,
	current,
	task,
	save,
	onClose,
}: {
	personId: string;
	eventId: string;
	kind: SessionPerformanceKind;
	current?: SessionPerformanceEntry;
	task: ReturnType<typeof useFormTask>;
	save: SessionPerformanceService["save"];
	onClose: () => void;
}): {
	rating?: string;
	comments: string;
	readOnly: boolean;
	changed: boolean;
	submitLabel: string;
	setRating: (rating: string | undefined) => void;
	setComments: (comments: string) => void;
	reload: () => void;
	submit: () => void;
} => {
	const [storedDraft, setDraft] = useState<SessionPerformanceDraft>();
	const initial = sessionPerformanceDraft(
		undefined,
		personId,
		eventId,
		kind,
		current,
	);
	const draft = sessionPerformanceDraft(
		storedDraft,
		personId,
		eventId,
		kind,
		current,
	);
	const operationKey = useOperationKey();
	const readOnly = Boolean(current && !current.canEdit);
	return {
		rating: draft.rating,
		comments: draft.comments,
		readOnly,
		changed: Boolean(current && current.revision !== draft.revision),
		submitLabel: current
			? "Save changes"
			: kind === "coach"
				? "Save coach feedback"
				: "Save self-rating",
		setRating: (rating): void => setDraft({ ...draft, rating }),
		setComments: (comments): void => setDraft({ ...draft, comments }),
		reload: (): void => {
			setDraft(initial);
			task.clear();
		},
		submit: (): void => {
			if (readOnly) return;
			const values = {
				personId,
				eventId,
				kind,
				rating: Number(draft.rating),
				comments: draft.comments,
				revision: draft.revision,
				requestId: "",
			};
			void task.submit(
				() => validateSessionPerformance(values),
				async (): Promise<void> => {
					await save({
						...values,
						requestId: operationKey(sessionPerformancePayload(values)),
					});
					onClose();
				},
			);
		},
	};
};
