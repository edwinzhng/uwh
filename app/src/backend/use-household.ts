import { useMutation, useQuery } from "convex/react";
import { useAtomValue, useSetAtom } from "jotai";
import { api } from "../../convex/_generated/api";
import { selectedPersonAtom } from "../demo/app-state";
import {
	type HouseholdCommand,
	previewHouseholdCommand,
	previewHouseholdState,
} from "../demo/household-state";
import type { HouseholdState } from "../domain/household";

export type HouseholdService = {
	state?: HouseholdState;
	command: (command: HouseholdCommand) => Promise<void>;
};
export const useLiveHousehold = (): HouseholdService => {
	const state = useQuery(api.household.state, {});
	const create = useMutation(api.household.create);
	const invite = useMutation(api.household.invite);
	const accept = useMutation(api.household.accept);
	const dismiss = useMutation(api.household.dismiss);
	const unlink = useMutation(api.household.unlink);
	const setDefault = useMutation(api.household.setDefault);
	const select = useSetAtom(selectedPersonAtom);
	return {
		state,
		command: async (command): Promise<void> => {
			switch (command.type) {
				case "create":
					await create({ name: command.name, key: command.key });
					return;
				case "invite":
					await invite({
						accountId: command.accountId,
						personId: command.personId,
						key: command.key,
					});
					return;
				case "accept":
					await accept({ id: command.id });
					return;
				case "dismiss":
					await dismiss({ id: command.id });
					return;
				case "unlink":
					await unlink({ personId: command.personId });
					select("");
					return;
				case "default":
					await setDefault({ personId: command.personId });
					select(command.personId);
					return;
			}
		},
	};
};
export const usePreviewHousehold = (): HouseholdService => {
	const state = useAtomValue(previewHouseholdState);
	const command = useSetAtom(previewHouseholdCommand);
	return { state, command: async (input): Promise<void> => command(input) };
};
