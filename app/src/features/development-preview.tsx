import type { ReactElement } from "react";
import {
	usePreviewDevelopment,
	usePreviewDevelopmentOverview,
} from "../backend/use-development";
import { DevelopmentList } from "./development-list";
import { DevelopmentPanel } from "./development-panel";

export const DevelopmentPreview = ({
	personId,
}: {
	personId?: string;
}): ReactElement => {
	const service = usePreviewDevelopment(personId);
	const overview = usePreviewDevelopmentOverview();
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
