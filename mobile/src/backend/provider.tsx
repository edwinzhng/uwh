import {
	ConvexAuthProvider,
	useAuthActions,
	useAuthToken,
} from "@convex-dev/auth/react";
import {
	ConvexReactClient,
	useAction,
	useConvexAuth,
	useMutation,
	useQuery,
} from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useGlobalSearchParams, usePathname } from "expo-router";
import { useAtomValue } from "jotai";
import {
	type ReactElement,
	type ReactNode,
	useMemo,
	useRef,
	useState,
} from "react";
import { api } from "../../convex/_generated/api";
import {
	AppContext,
	PreviewProvider,
	selectedPersonAtom,
} from "../demo/app-state";
import { AuthLayout, Stack, Text } from "../design-system";
import type { AppAction } from "../domain/app-types";
import { AccountGate } from "../features/account-gate";
import { AuthCallbackScreen } from "../features/auth-callback-screen";
import { ConnectAccountScreen } from "../features/connect-account-screen";
import { DeleteAccountScreen } from "../features/delete-account-screen";
import { JoinInviteScreen } from "../features/join-invite-screen";
import { PublicScheduleScreen } from "../features/public-schedule-screen";
import { handlesAuthCode } from "./auth-browser";
import { ChatSafetyProvider } from "./chat-safety";
import { type Backend, BackendContext } from "./context";
import { friendlyError } from "./errors";
import { createImageService } from "./image-service";
import { installationId } from "./native-push";
import { PushBridge } from "./push-bridge";
import { tokenStorage } from "./token-storage";
import { useInvites } from "./use-invites";
import { useRetainedQuery } from "./use-retained-query";
import { useSocialAuth } from "./use-social-auth";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
const client = url ? new ConvexReactClient(url) : undefined;
const LiveBridge = ({ children }: { children: ReactNode }): ReactElement => {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const auth = useAuthActions();
	const invites = useInvites();
	const social = useSocialAuth();
	const token = useAuthToken();
	const removeImage = useMutation(api.images.remove);
	const images = useMemo(
		() =>
			token
				? createImageService(token, async (id): Promise<void> => {
						await removeImage({ imageId: id });
					})
				: undefined,
		[token, removeImage],
	);
	const path = usePathname();
	const params = useGlobalSearchParams<{ id?: string; event?: string }>();
	const selected = useAtomValue(selectedPersonAtom);
	const screen =
		path === "/" ? "schedule" : path === "/progress" ? "member" : path.slice(1);
	const workspaceResult = useRetainedQuery(
		api.club.current,
		isAuthenticated
			? {
					screen,
					id:
						screen === "session"
							? (params.event ?? params.id)
							: screen === "member" || screen === "club"
								? (params.id ?? selected)
								: undefined,
				}
			: "skip",
	);
	const accountInfo = useQuery(
		api.account.current,
		isAuthenticated ? {} : "skip",
	);
	const previous = useRef<{
		userId: string;
		workspace: FunctionReturnType<typeof api.club.current>;
	}>(undefined);
	if (
		!isAuthenticated ||
		!accountInfo ||
		previous.current?.userId !== accountInfo.id
	)
		previous.current = undefined;
	if (workspaceResult !== undefined && accountInfo)
		previous.current = { userId: accountInfo.id, workspace: workspaceResult };
	const workspace =
		workspaceResult === undefined
			? previous.current?.workspace
			: workspaceResult;
	const deleteAccount = useAction(api.account_actions.deleteAccount);
	const updateName = useMutation(api.account.updateName);
	const signOutOthers = useMutation(api.account.signOutOthers);
	const cancelRequest = useMutation(api.account.cancelRequest);
	const declineRequest = useMutation(api.account.declineRequest);
	const unregisterPush = useMutation(api.notifications.unregister);
	const apply = useMutation(api.club.apply);
	const create = useMutation(api.club.create);
	const join = useMutation(api.club.requestToJoin);
	const approve = useMutation(api.club.approveRequest);
	const setAccess = useMutation(api.club.setAccess);
	const [pending, setPending] = useState(0);
	const [error, setError] = useState<string>();
	const backend: Backend = {
		social,
		invites,
		declineRequest: async (requestId): Promise<void> => {
			await declineRequest({ requestId });
		},
		accountInfo,
		authenticate: async (params): Promise<boolean> => {
			try {
				return (await auth.signIn("password", params)).signingIn;
			} catch (error) {
				if (
					params.flow === "reset" &&
					error instanceof Error &&
					error.message.includes("InvalidAccountId")
				)
					return false;
				throw error;
			}
		},
		updateName: async (name): Promise<void> => {
			await updateName({ name });
		},
		signOutOthers: async (): Promise<void> => {
			await signOutOthers({});
		},
		deleteAccount: async (password, transferTo): Promise<void> => {
			await deleteAccount({ password, transferTo });
		},
		cancelRequest: async (requestId): Promise<void> => {
			await cancelRequest({ requestId });
		},

		images,
		available: true,
		authenticated: isAuthenticated,
		loading: isLoading,
		clubCode: workspace?.clubId,
		requests: workspace?.requests ?? [],
		signOut: async (): Promise<void> => {
			setError(undefined);
			void installationId()
				.then((id) => unregisterPush({ installationId: id }))
				.catch((): void => {});
			await auth.signOut();
		},
		createClub: async (name, samples): Promise<void> => {
			await create({ name, samples });
		},
		joinClub: async (clubCode): Promise<void> => {
			await join({ clubCode });
		},
		setAccess: async (
			accountId,
			children,
			coachPrograms,
			admin,
		): Promise<void> => {
			await setAccess({ accountId, children, coachPrograms, admin });
		},
		approve: async (
			requestId,
			personId,
			children,
			coachPrograms,
			admin,
		): Promise<void> => {
			await approve({ requestId, personId, children, coachPrograms, admin });
		},
	};
	const dispatch = async (action: AppAction): Promise<boolean> => {
		setPending((count) => count + 1);
		setError(undefined);
		try {
			await apply({ action });
			return true;
		} catch (error) {
			setError(friendlyError(error));
			return false;
		} finally {
			setPending((count) => count - 1);
		}
	};
	return (
		<BackendContext.Provider value={backend}>
			<ChatSafetyProvider
				active={isAuthenticated && Boolean(workspace)}
				admin={workspace?.account.admin ?? false}
			>
				{path === "/calendar" ? (
					<PublicScheduleScreen />
				) : path === "/connect-account" ? (
					<ConnectAccountScreen />
				) : path === "/auth-callback" ? (
					<AuthCallbackScreen />
				) : path === "/join" ? (
					<JoinInviteScreen />
				) : path === "/delete-account" ? (
					<DeleteAccountScreen />
				) : path === "/design-system" ? (
					<PreviewProvider>{children}</PreviewProvider>
				) : isLoading ||
					(isAuthenticated &&
						(workspace === undefined || accountInfo === undefined)) ? (
					<Stack padding="lg">
						<Text>Connecting…</Text>
					</Stack>
				) : workspace ? (
					<AppContext.Provider
						value={{
							data: workspace.data,
							account: workspace.account,
							accounts: workspace.accounts,
							source: "convex",
							loading: workspaceResult === undefined,
							busy: pending > 0,
							error,
							clearError: (): void => setError(undefined),
							dispatch,
						}}
					>
						<PushBridge />
						{children}
					</AppContext.Provider>
				) : (
					<AccountGate />
				)}
			</ChatSafetyProvider>
		</BackendContext.Provider>
	);
};
export const BackendProvider = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => {
	const path = usePathname();
	return client ? (
		<ConvexAuthProvider
			client={client}
			storage={tokenStorage}
			shouldHandleCode={handlesAuthCode}
		>
			<LiveBridge>{children}</LiveBridge>
		</ConvexAuthProvider>
	) : path === "/design-system" ||
		process.env.EXPO_PUBLIC_DEMO_MODE === "true" ? (
		<PreviewProvider>{children}</PreviewProvider>
	) : (
		<AuthLayout title="Crocs Club">
			<Text>The account service isn’t configured for this build.</Text>
		</AuthLayout>
	);
};
