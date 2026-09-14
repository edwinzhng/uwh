import { useMutation } from "convex/react";
import type { FunctionArgs } from "convex/server";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export type InviteService = {
	create: (
		args: FunctionArgs<typeof api.invites.create>,
	) => Promise<Id<"clubInvites">>;
	resend: (id: Id<"clubInvites">) => Promise<void>;
	revoke: (id: Id<"clubInvites">) => Promise<void>;
};

export const useInvites = (): InviteService => {
	const create = useMutation(api.invites.create);
	const resend = useMutation(api.invites.resend);
	const revoke = useMutation(api.invites.revoke);
	return {
		create,
		resend: async (id): Promise<void> => {
			await resend({ id });
		},
		revoke: async (id): Promise<void> => {
			await revoke({ id });
		},
	};
};
