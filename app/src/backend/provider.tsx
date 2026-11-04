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
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Platform } from "react-native";
import { api } from "../../convex/_generated/api";
import {
	AppContext,
	type AppContextValue,
	type AppStatus,
	AppStatusContext,
	PreviewProvider,
	selectedPersonAtom,
} from "../demo/app-state";
import {
	AuthLayout,
	LoadingHandoff,
	LoadingScreen,
	Text,
} from "../design-system";
import type { AppAction } from "../domain/app-types";
import { AccountGate } from "../features/account-gate";
import { AuthCallbackScreen } from "../features/auth-callback-screen";
import { ConnectAccountScreen } from "../features/connect-account-screen";
import { DeleteAccountScreen } from "../features/delete-account-screen";
import { EmailSignInScreen } from "../features/email-sign-in-screen";
import { JoinInviteScreen } from "../features/join-invite-screen";
import { PublicScheduleScreen } from "../features/public-schedule-screen";
import { TermsGate } from "../features/terms-gate";
import { callbackAddress, handlesAuthCode } from "./auth-browser";
import { browserInstallationId } from "./browser-push";
import { BrowserPushBridge } from "./browser-push-bridge";
import { ChatSafetyProvider } from "./chat-safety";
import { type Backend, BackendContext } from "./context";
import { friendlyError } from "./errors";
import { createImageService } from "./image-service";
import { installationId } from "./native-push";
import { PushBridge } from "./push-bridge";
import { signOutAfterPushCleanup } from "./push-lifecycle";
import { tokenStorage } from "./token-storage";
import { useInvites } from "./use-invites";
import { useRetainedQuery } from "./use-retained-query";
import { useSocialAuth } from "./use-social-auth";

const url =
	process.env.EXPO_PUBLIC_REVIEW_MODE === "true"
		? undefined
		: process.env.EXPO_PUBLIC_CONVEX_URL;
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
	const params = useGlobalSearchParams<{
		id?: string;
		event?: string;
		person?: string;
	}>();
	const selected = useAtomValue(selectedPersonAtom);
	const screen =
		path === "/"
			? "home"
			: ["/progress", "/my-progress"].includes(path)
				? "member"
				: path.slice(1);
	const workspaceResult = useRetainedQuery(
		api.club.current,
		isAuthenticated
			? {
					screen,
					id:
						screen === "session"
							? (params.event ?? params.id)
							: screen === "fitness" || screen === "resources"
								? params.person
								: screen === "member" ||
										screen === "membership" ||
										screen === "account"
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
	const terms = useQuery(
		api.terms.current,
		isAuthenticated && workspace ? {} : "skip",
	);
	const deleteAccount = useAction(api.account_actions.deleteAccount);
	const updateName = useMutation(api.account.updateName);
	const signOutOthers = useMutation(api.account.signOutOthers);
	const cancelRequest = useMutation(api.account.cancelRequest);
	const declineRequest = useMutation(api.account.declineRequest);
	const unregisterPush = useMutation(api.notifications.unregister);
	const unregisterBrowserPush = useMutation(api.web_push.unregister);
	const apply = useMutation(api.club.apply);
	const create = useMutation(api.club.create);
	const join = useMutation(api.club.requestToJoin);
	const acceptPendingInvite = useMutation(
		api.invites.acceptPendingForCurrentUser,
	);
	const approve = useMutation(api.club.approveRequest);
	const setAccess = useMutation(api.club.setAccess);
	const [pending, setPending] = useState(0);
	const [error, setError] = useState<string>();
	const autoJoinAttempted = useRef<string>(undefined);
	useEffect((): void => {
		if (
			!isAuthenticated ||
			!accountInfo ||
			workspace !== null ||
			autoJoinAttempted.current === accountInfo.id
		)
			return;
		autoJoinAttempted.current = accountInfo.id;
		void acceptPendingInvite({}).catch((reason): void => {
			setError(friendlyError(reason));
		});
	}, [acceptPendingInvite, accountInfo, isAuthenticated, workspace]);
	const backend = useMemo<Backend>(
		() => ({
			social,
			requestEmailCode: async (email): Promise<void> => {
				await auth.signIn("email-code", { email: email.trim().toLowerCase() });
			},
			completeEmailCode: async (email, code): Promise<void> => {
				const result = await auth.signIn("email-code", {
					email: email.trim().toLowerCase(),
					code,
				});
				if (!result.signingIn)
					throw new Error("Invalid or expired code. Request a new code.");
			},
			requestEmailSignIn: async (email): Promise<void> => {
				await auth.signIn("email-link", {
					email: email.trim().toLowerCase(),
					redirectTo:
						Platform.OS === "web"
							? "/email-sign-in"
							: callbackAddress("email-sign-in"),
				});
			},
			completeEmailSignIn: async (code): Promise<void> => {
				const result = await auth
					.signIn("email-link", { code })
					.catch((): never => {
						throw new Error(
							"This sign-in link is invalid or expired. Request a new email.",
						);
					});
				if (!result.signingIn)
					throw new Error(
						"This sign-in link is invalid or expired. Request a new email.",
					);
			},
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
			clubCode: workspace?.inviteCode,
			requests: workspace?.requests ?? [],
			signOut: async (): Promise<void> => {
				setError(undefined);
				await signOutAfterPushCleanup({
					cleanup: async (signal): Promise<void> => {
						if (Platform.OS === "web") {
							const id = browserInstallationId();
							if (id && accountInfo && !signal.aborted)
								await unregisterBrowserPush({
									installationId: id,
									expectedUserId: accountInfo.id,
								});
						} else {
							const id = await installationId();
							if (accountInfo && !signal.aborted)
								await unregisterPush({
									installationId: id,
									expectedUserId: accountInfo.id,
								});
						}
					},
					signOut: auth.signOut,
				});
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
		}),
		[
			social,
			invites,
			declineRequest,
			accountInfo,
			auth,
			updateName,
			signOutOthers,
			deleteAccount,
			cancelRequest,
			images,
			isAuthenticated,
			isLoading,
			workspace,
			unregisterPush,
			unregisterBrowserPush,
			create,
			join,
			setAccess,
			approve,
		],
	);
	const dispatch = useCallback(
		async (action: AppAction): Promise<boolean> => {
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
		},
		[apply],
	);
	const clearError = useCallback((): void => setError(undefined), []);
	const status = useMemo<AppStatus>(
		() => ({ busy: pending > 0, error, clearError }),
		[pending, error, clearError],
	);
	const app = useMemo<AppContextValue | undefined>(
		() =>
			workspace
				? {
						data: workspace.data,
						account: workspace.account,
						accounts: workspace.accounts,
						source: "convex",
						workspaceId: workspace.clubId,
						loading: workspaceResult === undefined,
						dispatch,
					}
				: undefined,
		[workspace, workspaceResult, dispatch],
	);
	return (
		<BackendContext.Provider value={backend}>
			<ChatSafetyProvider
				active={
					isAuthenticated && Boolean(workspace) && terms?.accepted === true
				}
				admin={workspace?.account.admin ?? false}
			>
				{path === "/calendar" ? (
					<PublicScheduleScreen />
				) : path === "/connect-account" ? (
					<ConnectAccountScreen />
				) : path === "/email-sign-in" ? (
					<EmailSignInScreen />
				) : path === "/auth-callback" ? (
					<AuthCallbackScreen />
				) : path === "/join" ? (
					<JoinInviteScreen />
				) : path === "/delete-account" ? (
					<DeleteAccountScreen />
				) : path === "/otp-test" ? (
					<PreviewProvider>{children}</PreviewProvider>
				) : (
					<LoadingHandoff
						fillViewport
						loading={
							isLoading ||
							(isAuthenticated &&
								(workspace === undefined || accountInfo === undefined))
						}
					>
						{(): ReactNode =>
							app ? (
								<AppContext.Provider value={app}>
									<AppStatusContext value={status}>
										<TermsGate>
											<PushBridge />
											<BrowserPushBridge />
											{children}
										</TermsGate>
									</AppStatusContext>
								</AppContext.Provider>
							) : (
								<AccountGate />
							)
						}
					</LoadingHandoff>
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
	const params = useGlobalSearchParams<{
		reviewAccount?: string;
		reviewPerson?: string;
		reviewScenario?: string;
	}>();
	const reviewMode = process.env.EXPO_PUBLIC_REVIEW_MODE === "true";
	const [reviewReady, setReviewReady] = useState(!reviewMode);
	useEffect((): void => setReviewReady(true), []);
	if (!reviewReady) return <LoadingScreen />;
	return client ? (
		<ConvexAuthProvider
			client={client}
			storage={tokenStorage}
			shouldHandleCode={handlesAuthCode}
		>
			<LiveBridge>{children}</LiveBridge>
		</ConvexAuthProvider>
	) : path === "/otp-test" || process.env.EXPO_PUBLIC_DEMO_MODE === "true" ? (
		<PreviewProvider
			reviewAccount={reviewMode ? params.reviewAccount : undefined}
			reviewPerson={reviewMode ? params.reviewPerson : undefined}
			reviewScenario={reviewMode ? params.reviewScenario : undefined}
		>
			{children}
		</PreviewProvider>
	) : (
		<AuthLayout title="UWH Club">
			<Text>The account service isn’t configured for this build.</Text>
		</AuthLayout>
	);
};
