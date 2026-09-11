export const toastMessages = {
	savedName: "Saved name",
	savedPassword: "Updated password",
	savedFilters: "Saved filters",
	sentInvite: "Queued invite",
	savedNotifications: "Saved notifications",
	switchedProfile: "Switched profile",
	signedOut: "Signed out",
	copiedLink: "Copied link",
	revokedInvite: "Revoked invite",
	enabledNotifications: "Enabled notifications",
	disabledNotifications: "Disabled notifications",
	retryAction: "Retry action",
} as const;
export type ToastMessage = keyof typeof toastMessages;
