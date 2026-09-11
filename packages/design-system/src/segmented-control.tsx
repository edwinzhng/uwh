import type { ReactElement } from "react";

type Option = { value: string; label: string };
export const SegmentedControl = ({
	name,
	options,
	defaultValue,
	className,
	required = false,
}: {
	name: string;
	options: readonly Option[];
	defaultValue?: string;
	className?: string;
	required?: boolean;
}): ReactElement => (
	<div className={className}>
		{options.map((option) => (
			<label key={option.value}>
				<input
					type="radio"
					name={name}
					value={option.value}
					defaultChecked={option.value === defaultValue}
					required={required}
				/>
				<span>{option.label}</span>
			</label>
		))}
	</div>
);
