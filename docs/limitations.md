---
title: Limitations
description: What Star Rating does not do.
order: 7
---

# Limitations

- **Half values need a Decimal column.** `allowHalf` is ignored on a **Whole
  Number** column. This is a decision, not a bug: that column type truncates
  3.5 to 3, so offering the half step would save a value the user did not
  choose. Use a Decimal column with a precision of at least 1.

- **On some hosts the column type cannot be read.** For a property that accepts
  more than one column type, the platform sometimes reports the *set* of types
  the property accepts rather than the one actually bound. The control cannot
  tell the difference, so it does the safe thing in the other direction: it
  takes `allowHalf` at your word. Switch it on only for a column that can hold
  a half step, because on those hosts nothing will stop you.

- **Column metadata is model-driven only.** The control reads the column's
  maximum value to avoid drawing more icons than the column can hold. A canvas
  app has no such metadata, so **Maximum** is the only ceiling there.

- **Currency and Floating Point columns are not supported.** The bound property
  accepts `Whole.None` and `Decimal`. Widening it further would mean a rating
  control offering itself on every numeric column in the environment.

- **The scale stops at 20.** Past that the icons stop being scannable and a
  number box is the better control. Values above 20 are clamped rather than
  rejected.

- **A long scale wraps onto more than one row in a narrow column.** The icons
  keep their size rather than shrinking to fit, because shrinking them takes
  the `small` scale below a usable touch target. Twenty `medium` icons need
  about 440px to sit on one line; below that they reflow. Use a wider form
  column, a smaller **Size**, or a lower **Maximum** if a single row matters.

- **Only the filled colour is configurable.** **Colour** sets the fill of a
  selected icon and nothing else. Unselected icons, the error state and the
  focus ring are fixed, so that contrast and the invalid state hold whatever
  is chosen. The control has no dark-mode variant of its own; it inherits the
  host page.

- **Zero is not reachable.** The lowest rating is one icon; empty is expressed
  by clearing the column, not by a zero. A column where zero and blank mean
  different things needs a different control.

- **Five languages.** English, Spanish, French, German and Japanese. Any other
  user language falls back to English. Adding one is a `.resx` file and a line
  in the manifest — [open an issue](https://github.com/pcfhub/pcf-star-rating/issues).
