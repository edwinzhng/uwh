import type { ReactElement } from "react";
import {
	useDevelopment,
	useDevelopmentOverview,
} from "../backend/use-development";
import { DevelopmentList } from "./development-list";
import { DevelopmentPanel } from "./development-panel";

export const DevelopmentLive = ({
	personId,
}: {
	personId?: string;
}): ReactElement => {
	const service = useDevelopment(personId);
	const overview = useDevelopmentOverview(!personId);
	return personId ? (
		<DevelopmentPanel
			player={service.player}
			loading={service.loading}
			save={service.save}
			finalize={service.finalize}
			reopen={service.reopen}
		/>
	) : (
		<DevelopmentList
			players={overview.players}
			loading={overview.loading}
			loadingMore={overview.loadingMore}
			canLoadMore={overview.canLoadMore}
			loadMore={overview.loadMore}
		/>
	);
};
