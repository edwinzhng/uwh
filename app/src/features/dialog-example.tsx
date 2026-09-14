import { atom, useAtom } from "jotai";
import type { ReactElement } from "react";
import { Button, Dialog, Select, Stack, Text } from "../design-system";

const openAtom = atom(false);
const audienceAtom = atom<string | undefined>("club");
export const DialogExample = (): ReactElement => {
	const [open, setOpen] = useAtom(openAtom);
	const [audience, setAudience] = useAtom(audienceAtom);
	return (
		<Stack>
			<Button
				label="Open dialog"
				prefix="layers"
				variant="secondary"
				onPress={(): void => setOpen(true)}
			/>
			<Dialog isOpen={open} onOpenChange={setOpen} title="Session saved">
				<Text>Monday practice is ready.</Text>
				<Select
					label="Audience"
					value={audience}
					onValueChange={setAudience}
					options={[
						{ value: "club", label: "Club", icon: "users" },
						{ value: "squad", label: "Squad", icon: "target" },
					]}
				/>
			</Dialog>
		</Stack>
	);
};
