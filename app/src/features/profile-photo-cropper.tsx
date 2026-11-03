import type { ReactElement } from "react";
import { Button, PhotoCropView, Row, Stack, Text } from "../design-system";
import {
	clampPhotoCrop,
	movePhotoCrop,
	type PhotoCrop,
	type PhotoSource,
	photoCropRectangle,
} from "../domain/photo-crop";

export const ProfilePhotoCropper = ({
	source,
	crop,
	onChange,
	isDisabled,
}: {
	source: PhotoSource;
	crop: PhotoCrop;
	onChange: (update: (current: PhotoCrop) => PhotoCrop) => void;
	isDisabled: boolean;
}): ReactElement => (
	<Stack gap="sm">
		<PhotoCropView
			uri={source.uri}
			width={source.width}
			height={source.height}
			region={photoCropRectangle(source, crop)}
			onMove={(dx, dy, viewport): void =>
				onChange((current) => movePhotoCrop(source, current, dx, dy, viewport))
			}
			isDisabled={isDisabled}
		/>
		<Row justify="center" wrap>
			<Button
				label="Zoom out"
				variant="secondary"
				isDisabled={isDisabled || crop.zoom <= 1}
				onPress={(): void =>
					onChange((current) =>
						clampPhotoCrop({ ...current, zoom: current.zoom - 0.2 }),
					)
				}
			/>
			<Text variant="caption">{Math.round(crop.zoom * 100)}%</Text>
			<Button
				label="Zoom in"
				variant="secondary"
				isDisabled={isDisabled || crop.zoom >= 3}
				onPress={(): void =>
					onChange((current) =>
						clampPhotoCrop({ ...current, zoom: current.zoom + 0.2 }),
					)
				}
			/>
		</Row>
		<Row justify="center" wrap>
			<Button
				label="Left"
				variant="ghost"
				isDisabled={isDisabled}
				onPress={(): void =>
					onChange((current) =>
						clampPhotoCrop({ ...current, x: current.x - 0.1 }),
					)
				}
			/>
			<Button
				label="Right"
				variant="ghost"
				isDisabled={isDisabled}
				onPress={(): void =>
					onChange((current) =>
						clampPhotoCrop({ ...current, x: current.x + 0.1 }),
					)
				}
			/>
			<Button
				label="Up"
				variant="ghost"
				isDisabled={isDisabled}
				onPress={(): void =>
					onChange((current) =>
						clampPhotoCrop({ ...current, y: current.y - 0.1 }),
					)
				}
			/>
			<Button
				label="Down"
				variant="ghost"
				isDisabled={isDisabled}
				onPress={(): void =>
					onChange((current) =>
						clampPhotoCrop({ ...current, y: current.y + 0.1 }),
					)
				}
			/>
		</Row>
	</Stack>
);
