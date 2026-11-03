export type PushRegistration = {
	installationId: string;
	userId: string;
	sessionId: string;
	token: string;
	platform: "ios" | "android";
};

export const pushRegistrationPlan = <DeviceId extends string>(
	devices: readonly (PushRegistration & { _id: DeviceId })[],
	registration: PushRegistration,
): { existingId?: DeviceId; removeIds: DeviceId[] } => {
	const existing = devices.find(
		(device) =>
			device.installationId === registration.installationId &&
			device.userId === registration.userId &&
			device.sessionId === registration.sessionId &&
			device.token === registration.token &&
			device.platform === registration.platform,
	);
	return {
		existingId: existing?._id,
		removeIds: [...new Set(devices.map((device) => device._id))].filter(
			(id) => id !== existing?._id,
		),
	};
};
