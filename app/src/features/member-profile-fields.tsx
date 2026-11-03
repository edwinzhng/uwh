import type { ReactElement } from "react";
import { Field, Stack } from "../design-system";
import type { MemberProfileInput } from "../domain/member-profile";

export const MemberProfileFields = ({
	input,
	onChange,
	isDisabled,
	canEditCapNumber = false,
}: {
	input: MemberProfileInput;
	onChange: (
		field: "name" | "capNumber" | "email" | "phone",
		value: string,
	) => void;
	isDisabled: boolean;
	canEditCapNumber?: boolean;
}): ReactElement => (
	<Stack>
		<Field
			label="Name"
			value={input.name}
			onValueChange={(value): void => onChange("name", value)}
			maxLength={80}
			isDisabled={isDisabled}
		/>
		{canEditCapNumber ? (
			<Field
				label="Cap number"
				hint="1–99"
				inputMode="numeric"
				value={input.capNumber}
				onValueChange={(value): void => onChange("capNumber", value)}
				maxLength={2}
				isDisabled={isDisabled}
			/>
		) : undefined}
		<Field
			label="Phone (private)"
			inputMode="tel"
			value={input.phone}
			onValueChange={(value): void => onChange("phone", value)}
			maxLength={32}
			isDisabled={isDisabled}
		/>
	</Stack>
);
