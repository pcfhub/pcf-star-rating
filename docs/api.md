---
title: API reference
description: Properties and outputs, generated from the control manifest.
order: 5
---

# API reference

<!--
  Do not write the property tables by hand.

  `props-table` renders from what the hub parsed out of
  ControlManifest.Input.xml at the release being viewed, so it cannot drift from
  the control.

  kind: input | bound | output | dataset | dataset_column
-->

## Input properties

::props-table{kind=input}

## Bound properties

::props-table{kind=bound}

## Notes

**`value` accepts two column types.** It is declared as a type group over
`Whole.None` and `Decimal`, so the API reference above shows the type as
`Whole.None | Decimal`. Which one it actually is at runtime is what decides
whether half values are possible.

**`allowHalf` can be overruled.** It is your declaration and it normally stands,
including in a canvas app. The one exception is a **Whole Number** column, which
cannot store 3.5 at all: there the control stays on whole steps rather than
writing a value the column would silently truncate. See
[Limitations](limitations.md).

**`max` is a request, not a guarantee.** The control uses the smaller of this
value and the bound column's own maximum, then clamps the result to between 1
and 20.

**`shape` and `size` are enumerations.** `shape` is one of `star`, `heart` or
`circle`; `size` is one of `small`, `medium` or `large`. An unrecognised value
falls back to `star` and `medium` respectively rather than rendering nothing.

**Clearing writes blank, not zero.** Both the clear button and the `Delete` key
set the column to empty. Zero is not a reachable rating.
