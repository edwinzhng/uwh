import { toast } from "sonner";
import { renderActionToast } from "./action-toast-view.web";
import { type ToastKind, toastDuration } from "./toast-lifetime";
import {
	resolveToastCopy,
	type ToastContext,
	type ToastMessage,
} from "./toast-messages";
export const actionToast = (
	message: ToastMessage,
	kind: ToastKind = "success",
	context?: ToastContext,
): void => {
	const copy = resolveToastCopy(message, context);
	const startedAt = Date.now();
	toast.custom(
		(id) =>
			renderActionToast({
				copy,
				kind,
				startedAt,
				duration: toastDuration(context?.duration),
				onExpire: (): void => {
					toast.dismiss(id);
				},
			}),
		{ duration: Number.POSITIVE_INFINITY, closeButton: false },
	);
};
