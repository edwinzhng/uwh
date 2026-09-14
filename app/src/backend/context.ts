import type { FunctionReturnType } from "convex/server";
import { createContext, useContext } from "react";
import type { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { ImageService } from "./image-service";
import type { InviteService } from "./use-invites";

import type { SocialAuthService } from "./use-social-auth";

export type Backend = {
	social?: SocialAuthService;
	invites?: InviteService;
	accountInfo?: FunctionReturnType<typeof api.account.current>;
	authenticate?: (params: {
		flow:
			| "signIn"
			| "signUp"
			| "reset"
			| "reset-verification"
			| "email-verification";
		email: string;
		password?: string;
		newPassword?: string;
		name?: string;
		code?: string;
	}) => Promise<boolean>;
	updateName?: (name: string) => Promise<void>;
	signOutOthers?: () => Promise<void>;
	deleteAccount?: (
		password?: string,
		transferTo?: Id<"users">,
	) => Promise<void>;
	cancelRequest?: (requestId: Id<"joinRequests">) => Promise<void>;
	declineRequest?: (requestId: Id<"joinRequests">) => Promise<void>;

	images?: ImageService;
	available: boolean;
	authenticated: boolean;
	loading: boolean;
	clubCode?: string;
	requests: { id: Id<"joinRequests">; name: string }[];
	signOut?: () => Promise<void>;
	createClub?: (name: string, samples: boolean) => Promise<void>;
	joinClub?: (clubCode: string) => Promise<void>;
	setAccess?: (
		accountId: string,
		children: string[],
		coachPrograms: string[],
		admin: boolean,
	) => Promise<void>;
	approve?: (
		requestId: Id<"joinRequests">,
		personId: string,
		children: string[],
		coachPrograms: string[],
		admin: boolean,
	) => Promise<void>;
};
export const BackendContext = createContext<Backend>({
	available: false,
	authenticated: false,
	loading: false,
	requests: [],
});
export const useBackend = (): Backend => useContext(BackendContext);
