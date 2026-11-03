import { type ReactElement, useState } from "react";
import { newId } from "../demo/app-state";
import {
	Button,
	Field,
	List,
	ListItem,
	Row,
	Stack,
	Text,
} from "../design-system";
import {
	maxSessionPlanMedia,
	type SessionPlanMedia,
	supportedSessionPlanMedia,
} from "../domain/session-plan";
import { SessionPlanResourcePicker } from "./session-plan-resource-picker";
import { useFormTask } from "./use-form-task";

export const SessionDrillMediaEditor = ({
	media,
	onChange,
	disabled,
}: {
	media: SessionPlanMedia[];
	onChange: (media: SessionPlanMedia[]) => void;
	disabled: boolean;
}): ReactElement => {
	const [adding, setAdding] = useState<"link" | "resource">();
	const [label, setLabel] = useState("");
	const [url, setUrl] = useState("");
	const task = useFormTask();
	return (
		<Stack gap="sm">
			<List>
				{media.map((item) => (
					<ListItem
						key={item.id}
						title={item.label}
						description={
							item.source === "resource" ? "Club resource" : item.url
						}
						trailing={
							<Button
								label={`Remove ${item.label}`}
								prefix="close"
								variant="ghost"
								isDisabled={disabled || task.busy}
								onPress={(): void =>
									onChange(media.filter((entry) => entry.id !== item.id))
								}
							/>
						}
					/>
				))}
			</List>
			{adding === "resource" ? (
				<SessionPlanResourcePicker
					onSelect={(resource): void => {
						if (!disabled) {
							onChange([
								...media,
								{
									id: newId(),
									label: resource.title,
									source: "resource",
									resourceId: resource.id,
								},
							]);
							setAdding(undefined);
						}
					}}
					onCancel={(): void => setAdding(undefined)}
				/>
			) : adding === "link" ? (
				<Stack gap="sm">
					<Field
						label="Media name"
						value={label}
						onValueChange={setLabel}
						maxLength={120}
						isDisabled={disabled || task.busy}
					/>
					<Field
						label="Video, PDF or image link"
						value={url}
						onValueChange={setUrl}
						placeholder="https://"
						isDisabled={disabled || task.busy}
					/>
					<Row wrap>
						<Button
							label="Attach link"
							variant="secondary"
							isLoading={task.busy}
							isDisabled={disabled}
							onPress={(): void => {
								void task.submit(
									() =>
										!label.trim() || label.trim().length > 120
											? "Give this media item a name."
											: !supportedSessionPlanMedia(url.trim())
												? "Use a YouTube or Vimeo video, PDF, or image link."
												: undefined,
									async (): Promise<void> => {
										onChange([
											...media,
											{
												id: newId(),
												label: label.trim(),
												source: "link",
												url: url.trim(),
											},
										]);
										setLabel("");
										setUrl("");
										setAdding(undefined);
									},
								);
							}}
						/>
						<Button
							label="Cancel attachment"
							variant="ghost"
							isDisabled={disabled || task.busy}
							onPress={(): void => {
								setAdding(undefined);
								task.clear();
							}}
						/>
					</Row>
				</Stack>
			) : (
				<Row wrap>
					<Button
						label="Attach club resource"
						variant="ghost"
						prefix="archive"
						isDisabled={disabled || media.length >= maxSessionPlanMedia}
						onPress={(): void => setAdding("resource")}
					/>
					<Button
						label="Attach media link"
						variant="ghost"
						prefix="image"
						isDisabled={disabled || media.length >= maxSessionPlanMedia}
						onPress={(): void => setAdding("link")}
					/>
				</Row>
			)}
			{task.error ? (
				<Text tone="danger" variant="small">
					{task.error}
				</Text>
			) : undefined}
		</Stack>
	);
};
