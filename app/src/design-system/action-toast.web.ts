import { toast } from "sonner";
import {
	resolveToastCopy,
	type ToastContext,
	type ToastMessage,
} from "./toast-messages";
export const actionToast = (
	message: ToastMessage,
	kind: "success" | "error" | "warning" | "info" = "success",
	context?: ToastContext,
): void => {
	const copy = resolveToastCopy(message, context);
	toast[kind](copy.title, { description: copy.description });
};
