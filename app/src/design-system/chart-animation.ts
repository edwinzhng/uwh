import { motion } from "./tokens";

const [firstX, firstY, secondX, secondY] = motion.easing.out;
export const chartEasing: `cubic-bezier(${number},${number},${number},${number})` = `cubic-bezier(${firstX},${firstY},${secondX},${secondY})`;
