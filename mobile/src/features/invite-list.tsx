import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import { EmptyState, List, Surface } from "../design-system";
import { DataPage } from "./data-page";
import { InviteRow } from "./invite-row";

export const InviteList = (): ReactElement => (
	<DataPage config={{ query: api.invites.list, args: {}, preview: [] }}>
		{(items) => (
			<Surface padding="xs">
				<List>
					{items.length ? (
						items.map((invite) => <InviteRow key={invite.id} invite={invite} />)
					) : (
						<EmptyState
							title="No invitations"
							description="New invitations will appear here."
						/>
					)}
				</List>
			</Surface>
		)}
	</DataPage>
);
