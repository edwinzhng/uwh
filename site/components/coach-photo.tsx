"use client";

import Image from "next/image";
import { type ReactElement, useState } from "react";

export const CoachPhoto = ({
	src,
	name,
}: {
	src: string;
	name: string;
}): ReactElement => {
	const [loaded, setLoaded] = useState(false);
	return (
		<Image
			src={src}
			alt={name}
			width={480}
			height={360}
			loading="lazy"
			decoding="async"
			unoptimized
			className="coach-photo"
			data-loaded={loaded}
			ref={(image): void => {
				if (image?.complete && image.naturalWidth > 0) setLoaded(true);
			}}
			onLoad={(): void => setLoaded(true)}
		/>
	);
};
