"use client";
import type { ReactElement } from "react";
import { JoinButton } from "./join-button";
import { LiquidLens } from "./liquid-lens";
export const Hero = ({
	headline,
	intro,
}: {
	headline: string;
	intro: string;
}): ReactElement => (
	<section className="hero">
		<div className="hero-visual">
			<div className="hero-photo" />
			<div className="hero-drift" />
			<LiquidLens />
		</div>
		<div className="hero-shade" />
		<div className="hero-bottom-blur" aria-hidden="true" />
		<div className="hero-title wrap">
			<p className="eyebrow">Calgary Crocs Underwater Hockey</p>
			<h1>{headline}</h1>
			<p className="hero-description">{intro}</p>
			<JoinButton className="button button-green">Join today</JoinButton>
		</div>
	</section>
);
