import watercolor_amber_dark_0 from "../../assets/materials/watercolor-amber-dark-0.png";
import watercolor_amber_dark_1 from "../../assets/materials/watercolor-amber-dark-1.png";
import watercolor_amber_light_0 from "../../assets/materials/watercolor-amber-light-0.png";
import watercolor_amber_light_1 from "../../assets/materials/watercolor-amber-light-1.png";
import watercolor_coral_dark_0 from "../../assets/materials/watercolor-coral-dark-0.png";
import watercolor_coral_dark_1 from "../../assets/materials/watercolor-coral-dark-1.png";
import watercolor_coral_light_0 from "../../assets/materials/watercolor-coral-light-0.png";
import watercolor_coral_light_1 from "../../assets/materials/watercolor-coral-light-1.png";
import watercolor_fern_dark_0 from "../../assets/materials/watercolor-fern-dark-0.png";
import watercolor_fern_dark_1 from "../../assets/materials/watercolor-fern-dark-1.png";
import watercolor_fern_light_0 from "../../assets/materials/watercolor-fern-light-0.png";
import watercolor_fern_light_1 from "../../assets/materials/watercolor-fern-light-1.png";
import watercolor_indigo_dark_0 from "../../assets/materials/watercolor-indigo-dark-0.png";
import watercolor_indigo_dark_1 from "../../assets/materials/watercolor-indigo-dark-1.png";
import watercolor_indigo_light_0 from "../../assets/materials/watercolor-indigo-light-0.png";
import watercolor_indigo_light_1 from "../../assets/materials/watercolor-indigo-light-1.png";
import watercolor_orange_dark_0 from "../../assets/materials/watercolor-orange-dark-0.png";
import watercolor_orange_dark_1 from "../../assets/materials/watercolor-orange-dark-1.png";
import watercolor_orange_light_0 from "../../assets/materials/watercolor-orange-light-0.png";
import watercolor_orange_light_1 from "../../assets/materials/watercolor-orange-light-1.png";
import watercolor_sky_dark_0 from "../../assets/materials/watercolor-sky-dark-0.png";
import watercolor_sky_dark_1 from "../../assets/materials/watercolor-sky-dark-1.png";
import watercolor_sky_light_0 from "../../assets/materials/watercolor-sky-light-0.png";
import watercolor_sky_light_1 from "../../assets/materials/watercolor-sky-light-1.png";
import watercolor_violet_dark_0 from "../../assets/materials/watercolor-violet-dark-0.png";
import watercolor_violet_dark_1 from "../../assets/materials/watercolor-violet-dark-1.png";
import watercolor_violet_light_0 from "../../assets/materials/watercolor-violet-light-0.png";
import watercolor_violet_light_1 from "../../assets/materials/watercolor-violet-light-1.png";
export const cardMaterialImages = {
	watercolor: {
		sky: {
			light: [watercolor_sky_light_0, watercolor_sky_light_1],
			dark: [watercolor_sky_dark_0, watercolor_sky_dark_1],
		},
		fern: {
			light: [watercolor_fern_light_0, watercolor_fern_light_1],
			dark: [watercolor_fern_dark_0, watercolor_fern_dark_1],
		},
		amber: {
			light: [watercolor_amber_light_0, watercolor_amber_light_1],
			dark: [watercolor_amber_dark_0, watercolor_amber_dark_1],
		},
		violet: {
			light: [watercolor_violet_light_0, watercolor_violet_light_1],
			dark: [watercolor_violet_dark_0, watercolor_violet_dark_1],
		},
		coral: {
			light: [watercolor_coral_light_0, watercolor_coral_light_1],
			dark: [watercolor_coral_dark_0, watercolor_coral_dark_1],
		},
		orange: {
			light: [watercolor_orange_light_0, watercolor_orange_light_1],
			dark: [watercolor_orange_dark_0, watercolor_orange_dark_1],
		},
		indigo: {
			light: [watercolor_indigo_light_0, watercolor_indigo_light_1],
			dark: [watercolor_indigo_dark_0, watercolor_indigo_dark_1],
		},
	},
} as const;
