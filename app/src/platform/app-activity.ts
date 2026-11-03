import { AppState } from "react-native";
import { createSharedSubscription } from "../shared/shared-subscription";

export const appIsActive = (): boolean =>
	AppState.currentState !== "background" &&
	AppState.currentState !== "inactive";

export const subscribeAppActivity = createSharedSubscription((notify) => {
	const subscription = AppState.addEventListener("change", notify);
	return (): void => subscription.remove();
});
