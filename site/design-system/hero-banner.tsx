"use client";

import { LiquidLens } from "@calgarycrocs/design-system/liquid-lens";
import Image from "next/image";
import {
	type ReactElement,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";
export const HeroBanner = ({
	headline,
	intro,
	name,
	action,
}: {
	headline: string;
	intro: string;
	name: string;
	action: ReactNode;
}): ReactElement => {
	const image = useRef<HTMLImageElement>(null);
	const hero = useRef<HTMLElement>(null);
	const [ready, setReady] = useState(false);
	useEffect(() => {
		const element = hero.current;
		if (!element || !matchMedia("(pointer: coarse)").matches) return;
		const viewport = { width: 0 };
		const lockHeight = (): void => {
			if (viewport.width === window.innerWidth) return;
			viewport.width = window.innerWidth;
			element.style.removeProperty("--hero-height");
			element.style.setProperty(
				"--hero-height",
				`${element.getBoundingClientRect().height}px`,
			);
		};
		lockHeight();
		window.addEventListener("resize", lockHeight);
		return (): void => window.removeEventListener("resize", lockHeight);
	}, []);
	useEffect(() => {
		const element = image.current;
		if (!element) return;
		const state = { active: true };
		const reveal = (): void => {
			void element.decode().then(
				() => {
					if (state.active) setReady(true);
				},
				() => {},
			);
		};
		element.addEventListener("load", reveal);
		if (element.complete && element.naturalWidth > 0) reveal();
		return (): void => {
			state.active = false;
			element.removeEventListener("load", reveal);
		};
	}, []);
	return (
		<section ref={hero} className="hero">
			<div className="hero-visual" data-ready={ready}>
				<Image
					fill
					unoptimized
					sizes="100vw"
					ref={image}
					className="hero-photo"
					src="/hockey-action.webp"
					alt=""
					decoding="async"
					fetchPriority="high"
				/>
				<div className="hero-drift" />
				<div className="hero-bottom-blur" aria-hidden="true" />
				<LiquidLens
					imageSrc="/hockey-action.webp"
					areaSelector=".hero"
					className="liquid-canvas"
				/>
			</div>
			<div className="hero-shade" />
			<div className="hero-title wrap">
				<p className="eyebrow">{name}</p>
				<h1>{headline}</h1>
				<p className="hero-description">{intro}</p>
				{action}
			</div>
		</section>
	);
};
