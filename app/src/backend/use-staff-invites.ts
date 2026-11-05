import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type StaffInviteService = {
	state: FunctionReturnType<typeof api.staff_invites.list> | undefined;
	create: (input: {
		admin: boolean;
		coachPrograms: string[];
	}) => Promise<string>;
	revoke: (id: Id<"staffInvites">) => Promise<void>;
};
export const useStaffInvites = (): StaffInviteService => {
	const state = useQuery(api.staff_invites.list, {});
	const create = useMutation(api.staff_invites.create);
	const revoke = useMutation(api.staff_invites.revoke);
	return {
		state,
		create,
		revoke: async (id): Promise<void> => {
			await revoke({ id });
		},
	};
};
