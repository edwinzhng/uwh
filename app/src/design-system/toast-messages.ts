export type ToastCopy = { title: string; description?: string };
export const toastMessages = {
	savedName: {
		title: "Account name updated",
	},
	savedPassword: {
		title: "Password updated",
	},
	savedFilters: {
		title: "Chat filters saved",
	},
	sentInvite: {
		title: "Invite queued",
		description: "Members → Invites",
	},
	savedNotifications: {
		title: "Notification settings saved",
	},
	switchedProfile: {
		title: "Profile view updated",
	},
	signedOut: {
		title: "Signed out",
	},
	copiedLink: {
		title: "Invite link copied",
	},
	revokedInvite: {
		title: "Invite revoked",
	},
	enabledNotifications: {
		title: "Device notifications enabled",
	},
	disabledNotifications: {
		title: "Device notifications disabled",
	},
	retryAction: {
		title: "Action failed",
		description: "Try again",
	},
} satisfies Record<string, ToastCopy>;
export type ToastMessage = keyof typeof toastMessages;
export type ToastContext = {
	subject?: string;
	description?: string;
	duration?: number;
};
export const resolveToastCopy = (
	message: ToastMessage,
	context?: ToastContext,
): ToastCopy => {
	const subject = context?.subject?.trim();
	const copy: ToastCopy = toastMessages[message];
	return {
		title: copy.title,
		description: context?.description?.trim() || subject || copy.description,
	};
};
