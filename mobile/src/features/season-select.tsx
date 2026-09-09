import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { Select } from "../design-system";
import { useSeason } from "./use-season";
export const SeasonSelect = ({
	isDisabled = false,
	onChange,
}: {
	isDisabled?: boolean;
	onChange?: () => void;
}): ReactElement => {
	const { data } = useApp();
	const [season, select] = useSeason();
	return (
		<Select
			label="Season"
			value={season}
			isDisabled={isDisabled}
			options={data.seasons.map((season) => ({
				value: season.id,
				label: season.name,
			}))}
			onValueChange={(value): void => {
				if (value) {
					onChange?.();
					select(value);
				}
			}}
		/>
	);
};
