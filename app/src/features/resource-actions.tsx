import { type ReactElement, useState } from "react";
import type { ResourceState } from "../backend/use-resources";
import { Button, Row } from "../design-system";
import type { Resource } from "../domain/resources";
import { ConfirmationDialog } from "./confirmation-dialog";

export const ResourceActions = ({
	resource,
	state,
	canManage,
	onEdit,
}: {
	resource: Resource;
	state: ResourceState;
	canManage: boolean;
	onEdit: (resource: Resource) => void;
}): ReactElement => {
	const [archiving, setArchiving] = useState<Resource>();
	return (
		<>
			<Row justify="end" wrap gap="xs">
				{canManage ? (
					<>
						<Button
							label="Edit"
							prefix="edit"
							variant="ghost"
							compact
							onPress={(): void => onEdit(resource)}
						/>
						<Button
							label={resource.archived ? "Restore" : "Archive"}
							prefix="archive"
							variant="ghost"
							compact
							onPress={(): void => setArchiving(resource)}
						/>
					</>
				) : undefined}
			</Row>
			{archiving ? (
				<ConfirmationDialog
					title={archiving.archived ? "Restore resource?" : "Archive resource?"}
					description={
						archiving.archived
							? "Return this resource to the active library."
							: "Move this resource out of the active library. You can restore it later."
					}
					confirmLabel={archiving.archived ? "Restore" : "Archive"}
					isDisabled={!canManage}
					onClose={(): void => setArchiving(undefined)}
					onConfirm={(): Promise<void> =>
						state.archive(archiving, !archiving.archived)
					}
				/>
			) : undefined}
		</>
	);
};
