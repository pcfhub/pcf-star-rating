---
title: Limitations
description: What Star Rating does not do.
order: 7
---

# Limitations

- **Half values need a Decimal column.** `allowHalf` is ignored on a Whole
  Number column, and in a canvas app where there is no column type to inspect.
  This is a decision, not a bug: a Whole Number column truncates 3.5 to 3, so
  offering the half step there would save a value the user did not choose. Use
  a Decimal column with a precision of at least 1.

- **Column metadata is model-driven only.** The control reads the column's
  maximum value to avoid drawing more icons than the column can hold. A canvas
  app has no such metadata, so **Maximum** is the only ceiling there.

- **Currency and Floating Point columns are not supported.** The bound property
  accepts `Whole.None` and `Decimal`. Widening it further would mean a rating
  control offering itself on every numeric column in the environment.

- **The scale stops at 20.** Past that the icons stop being scannable and a
  number box is the better control. Values above 20 are clamped rather than
  rejected.

- **Zero is not reachable.** The lowest rating is one icon; empty is expressed
  by clearing the column, not by a zero. A column where zero and blank mean
  different things needs a different control.

- **Five languages.** English, Spanish, French, German and Japanese. Any other
  user language falls back to English. Adding one is a `.resx` file and a line
  in the manifest — [open an issue](https://github.com/pcfhub/pcf-star-rating/issues).
