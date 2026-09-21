import { expect, test } from "bun:test";
import { type ToastT, toast } from "sonner";
import { actionToast } from "../src/design-system/action-toast.web";

test("repeated profile actions create distinct Sonner toasts with their own details", (): void => {
	actionToast("switchedProfile", "success", { subject: "Sam" });
	actionToast("switchedProfile", "success", { subject: "Edwin" });
	const history = toast
		.getHistory()
		.filter((entry): entry is ToastT => "title" in entry);
	const first = history.at(-2);
	const second = history.at(-1);
	expect(first?.id).not.toBe(second?.id);
	expect(first?.title).toBe("You’re now viewing Sam’s profile");
	expect(second?.title).toBe("You’re now viewing Edwin’s profile");
	expect(first?.description).toBeTruthy();
	expect(second?.description).toBeTruthy();
});
