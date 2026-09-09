import type { ReactElement } from "react";
import { ProfileOption } from "./profile-option";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";

type Props = {
	label: string;
	value: string;
	options: readonly { id: string; name: string; description: string }[];
	onValueChange: (id: string) => void;
};
export const ProfileSwitcher = ({
	label,
	value,
	options,
	onValueChange,
}: Props): ReactElement => (
	<Stack gap="xs">
		<Text variant="caption" tone="secondary">
			{label}
		</Text>
		<Row wrap gap="xs">
			{options.map((profile) => (
				<ProfileOption
					key={profile.id}
					name={profile.name}
					description={profile.description}
					isSelected={value === profile.id}
					onPress={(): void => onValueChange(profile.id)}
				/>
			))}
		</Row>
	</Stack>
);
