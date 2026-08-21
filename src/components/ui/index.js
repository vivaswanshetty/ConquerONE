/**
 * Soft premium UI primitives.
 *
 * Shared surface / typography / motion layer for the core flow
 * (Home · WorkoutDetail · ActiveWorkout · WorkoutComplete). Built on
 * the `soft*` tokens in src/utils/theme.js so the remaining screens
 * keep their original tactical styling.
 *
 *   import { Card, Pill, SectionHeader, PrimaryButton } from "../components/ui";
 */
export { default as Card, withAlpha } from "./Card";
export { default as SectionHeader } from "./SectionHeader";
export { default as Pill } from "./Pill";
export { default as StatTile } from "./StatTile";
export { default as ProgressRing } from "./ProgressRing";
export { default as ProgressDots } from "./ProgressDots";
export { default as AnimatedNumber } from "./AnimatedNumber";
export { default as PrimaryButton } from "./PrimaryButton";
export { default as SecondaryButton } from "./SecondaryButton";
export { default as Reveal } from "./Reveal";

export {
    SPRING,
    TIMING,
    EASE,
    EASE_OUT,
    STAGGER,
    useReveal,
    usePressScale,
    useBreathe,
} from "./motion";
