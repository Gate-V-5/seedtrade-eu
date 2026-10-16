// Interaction pauses never cancel the visitor's explicit pause choice.
export const carouselCanAdvance = ({total, manualPaused, hovered, focused, reduced}) =>
  total > 1 && !manualPaused && !hovered && !focused && !reduced
