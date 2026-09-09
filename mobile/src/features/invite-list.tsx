import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import { ListItem, Stack, Surface } from "../design-system";
import { DataPage } from "./data-page";
import { InviteRow } from "./invite-row";

export const InviteList = (): ReactElement => (
	<DataPage config={{ query: api.invites.list, args: {}, preview: [] }}>
		{(items) => (
			<Surface padding="xs">
				<Stack gap="xs">
					{items.length ? (
						items.map((invite) => <InviteRow key={invite.id} invite={invite} />)
					) : (
						<ListItem title="No invitations" />
					)}
				</Stack>
			</Surface>
		)}
	</DataPage>
);
