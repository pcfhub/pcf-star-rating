---
title: FAQ
description: Questions that come up more than once.
order: 8
---

# FAQ

## Why does the control not appear in the component list?

Almost always the column type. Star Rating binds to **Whole Number** and
**Decimal Number** columns only, and the form designer hides a component from
every column it cannot bind to. Check the column type first; if it is right,
confirm the solution imported and that customizations were published.

## Why are half stars not working?

The column is a Whole Number column. **Allow half values** is only honoured on a
Decimal column, because a Whole Number column cannot store 3.5 — see
[Limitations](limitations.md).

## Why do I see fewer icons than I set?

The control never draws more icons than the bound column's **Maximum value**
allows. Raise the column's maximum, or lower the **Maximum** property to match.

## Can a user clear the rating?

Yes — the clear button, or the `Delete` or `Backspace` key. Hiding the clear
button removes the mouse path but not the keyboard one. To make blank invalid,
mark the column required.

## Does it work on a phone?

Yes, in both the model-driven mobile app and canvas apps, provided the component
is enabled for **Phone** on the form. Use the `large` size for touch — the
`small` size is below a comfortable touch target.

## Is it accessible?

It is a `radiogroup` with a roving tab stop, arrow-key navigation, `Home` and
`End`, per-icon accessible names, `aria-invalid` on validation errors, right-to-
left support, and an explicit Windows high contrast mode. If you find a gap,
that is a bug worth reporting.

## How do I report a bug?

Open an issue at <https://github.com/pcfhub/pcf-star-rating/issues>, with the
platform version and the control version from the solution.
