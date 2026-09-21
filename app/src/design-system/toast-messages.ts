export type ToastCopy = { title: string; description: string };
export const toastMessages = {
	savedName: {
		title: "Your account name was updated",
		description: "Your new name will appear on your account.",
	},
	savedPassword: {
		title: "Your password was updated",
		description: "Use your new password the next time you sign in.",
	},
	savedFilters: {
		title: "Your chat filters were saved",
		description: "Your updated filters are ready to use in Messages.",
	},
	sentInvite: {
		title: "Your club invite is queued",
		description: "Check Members → Invites for delivery status.",
	},
	savedNotifications: {
		title: "Your notification preferences were saved",
		description: "Future alerts will follow your updated preferences.",
	},
	switchedProfile: {
		title: "Your active profile changed",
		description: "You’re now viewing the selected household profile.",
	},
	signedOut: {
		title: "You’ve signed out of Calgary UWH",
		description: "Sign in again to access your household and club.",
	},
	copiedLink: {
		title: "Your invite link was copied",
		description:
			"The link is ready to paste and share with the invited member.",
	},
	revokedInvite: {
		title: "The club invite was revoked",
		description: "This invite link can no longer be used to join.",
	},
	enabledNotifications: {
		title: "Push notifications are enabled on this device",
		description: "This device can receive alerts allowed by your preferences.",
	},
	disabledNotifications: {
		title: "Push notifications are disabled on this device",
		description: "This device will no longer receive push alerts.",
	},
	retryAction: {
		title: "Your action couldn’t be completed",
		description: "Review the details on this screen and try again.",
	},
} satisfies Record<string, ToastCopy>;
export type ToastMessage = keyof typeof toastMessages;
export type ToastContext = { subject?: string; description?: string };
export const resolveToastCopy = (
	message: ToastMessage,
	context?: ToastContext,
): ToastCopy => {
	const subject = context?.subject?.trim();
	const titles: Partial<Record<ToastMessage, string>> = subject
		? {
				switchedProfile: `You’re now viewing ${subject}’s profile`,
				sentInvite: `An invite for ${subject} is queued`,
				revokedInvite: `The invite for ${subject} was revoked`,
				copiedLink: `The invite link for ${subject} was copied`,
				savedName: `Your account name is now ${subject}`,
				savedNotifications: `${subject} notification preferences were saved`,
			}
		: {};
	return {
		title: titles[message] ?? toastMessages[message].title,
		description: context?.description ?? toastMessages[message].description,
	};
};
