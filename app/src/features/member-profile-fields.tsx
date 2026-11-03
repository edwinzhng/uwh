import type { ReactElement } from "react";
import { Field, Stack, Text } from "../design-system";
import type { MemberProfileInput } from "../domain/member-profile";

export const MemberProfileFields = ({
	input,
	onChange,
	isDisabled,
}: {
	input: MemberProfileInput;
	onChange: (
		field: "name" | "capNumber" | "email" | "phone",
		value: string,
	) => void;
	isDisabled: boolean;
}): ReactElement => (
	<Stack>
		<Text variant="caption" tone="secondary">
			Name, cap and photo are shared with the club.
		</Text>
		<Field
			label="Name"
			value={input.name}
			onValueChange={(value): void => onChange("name", value)}
			maxLength={80}
			isDisabled={isDisabled}
		/>
		<Field
			label="Cap number"
			hint="1–99, optional"
			inputMode="numeric"
			value={input.capNumber}
			onValueChange={(value): void => onChange("capNumber", value)}
			maxLength={2}
			isDisabled={isDisabled}
		/>
		<Stack gap="xs">
			<Text variant="label">Contact details</Text>
			<Text variant="caption" tone="secondary">
				Only you and linked guardians can see these.
			</Text>
		</Stack>
		<Field
			label="Contact email"
			hint="Doesn’t change your sign-in email."
			inputMode="email"
			value={input.email}
			onValueChange={(value): void => onChange("email", value)}
			maxLength={254}
			isDisabled={isDisabled}
		/>
		<Field
			label="Phone"
			inputMode="tel"
			value={input.phone}
			onValueChange={(value): void => onChange("phone", value)}
			maxLength={32}
			isDisabled={isDisabled}
		/>
	</Stack>
);
