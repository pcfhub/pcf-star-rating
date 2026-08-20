---
title: Examples
description: Worked configurations of Star Rating.
order: 6
---

# Examples

## A five-star satisfaction score

The default configuration, on a Whole Number column capped at 5.

| Property | Value |
| --- | --- |
| Value | the column |
| Maximum | `5` |
| Allow half values | `false` |
| Shape | `star` |
| Size | `medium` |
| Colour | `#F2B100` |
| Show clear button | `true` |

A user clicks the third star, or tabs to the control and presses the right arrow
three times. Pressing `Delete`, or clicking the clear button, empties the
column.

## Half stars on a decimal column

The same control on a **Decimal Number** column with a precision of at least 1.

| Property | Value |
| --- | --- |
| Value | the decimal column |
| Maximum | `5` |
| Allow half values | `true` |
| Shape | `star` |
| Size | `large` |
| Colour | `#0F6CBD` |
| Show clear button | `true` |

Clicking the **left half** of an icon selects the half step; the right half
selects the whole. From the keyboard, each arrow press moves by 0.5.

:::callout{type=warning}
Switching **Allow half values** on while the column is a Whole Number column
does nothing, and that is deliberate — see [Limitations](limitations.md).
Everywhere else the setting is taken at your word, so point it at a column
that can actually hold a half step.
:::

## A ten-point score without a clear button

For a required column where blank is not a meaningful answer.

| Property | Value |
| --- | --- |
| Value | the column |
| Maximum | `10` |
| Allow half values | `false` |
| Shape | `heart` |
| Size | `small` |
| Colour | `#C4314B` |
| Show clear button | `false` |

Hiding the clear button removes the mouse path to blank. `Delete` still clears
from the keyboard, because removing a keyboard equivalent that a mouse user
never had would fail the accessibility contract rather than enforce anything;
use a required column or a business rule if blank must be rejected.
