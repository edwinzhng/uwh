import { toast } from "sonner-native";
import { renderActionToast } from "./action-toast-view";
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
	const onExpire = (): void => {
		toast.dismiss(id);
	};
	const id = toast.custom(
		renderActionToast({
			copy,
			kind,
			startedAt: Date.now(),
			duration: toastDuration(context?.duration),
			onExpire,
		}),
		{
			duration: Number.POSITIVE_INFINITY,
			closeButton: false,
			dismissible: false,
		},
	);
};
