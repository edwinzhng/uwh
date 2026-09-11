import { toast } from "sonner-native";
import { type ToastMessage, toastMessages } from "./toast-messages";
export const actionToast = (
	message: ToastMessage,
	kind: "success" | "error" | "warning" | "info" = "success",
): void => {
	toast[kind](toastMessages[message], { id: message });
};
