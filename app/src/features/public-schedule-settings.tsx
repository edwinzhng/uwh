import { useMutation, useQuery } from "convex/react";
import * as Clipboard from "expo-clipboard";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import { friendlyError } from "../backend/errors";
import {
	Button,
	Field,
	SectionHeading,
	Stack,
	Surface,
	Text,
	Toggle,
} from "../design-system";

export const PublicScheduleSettings = (): ReactElement => {
	const settings = useQuery(api.public_schedule.settings, {});
	const save = useMutation(api.public_schedule.configure);
	const [slug, setSlug] = useState<string>();
	const [enabled, setEnabled] = useState<boolean>();
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState("");
	const link = settings?.slug
		? `${settings.baseUrl.replace(/\/$/, "")}/calendar?club=${settings.slug}`
		: "";
	const submit = async (): Promise<void> => {
		setBusy(true);
		setMessage("");
		try {
			await save({
				slug: slug ?? settings?.slug ?? "",
				enabled: enabled ?? settings?.enabled ?? false,
			});
			setMessage("Saved.");
		} catch (error) {
			setMessage(friendlyError(error));
		} finally {
			setBusy(false);
		}
	};
	return (
		<Stack gap="sm">
			<SectionHeading>Public schedule</SectionHeading>
			<Surface>
				<Stack>
					<Field
						label="Address"
						placeholder="calgary-crocs"
						value={slug ?? settings?.slug ?? ""}
						onValueChange={setSlug}
					/>
					<Toggle
						label="Publish schedule"
						value={enabled ?? settings?.enabled ?? false}
						onValueChange={setEnabled}
						description="Only events marked public will appear."
					/>
					<Button
						label="Save"
						isLoading={busy}
						isDisabled={!settings}
						onPress={(): void => {
							void submit();
						}}
					/>
					{settings?.enabled && link ? (
						<>
							<Text variant="small">{link}</Text>
							<Button
								label="Copy link"
								variant="secondary"
								onPress={(): void => {
									void Clipboard.setStringAsync(link)
										.then(() => setMessage("Link copied."))
										.catch((error) => setMessage(friendlyError(error)));
								}}
							/>
						</>
					) : undefined}
					{message ? <Text variant="small">{message}</Text> : undefined}
				</Stack>
			</Surface>
		</Stack>
	);
};
