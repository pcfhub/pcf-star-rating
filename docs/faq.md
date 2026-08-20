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

The column is a **Whole Number** column. It cannot store 3.5, so the control
refuses the half step no matter what **Allow half values** says. Change the
column to Decimal with a precision of at least 1 — see
[Limitations](limitations.md).

## Why do I see fewer icons than I set?

The control never draws more icons than the bound column's **Maximum value**
allows. Raise the column's maximum, or lower the **Maximum** property to match.

## In a canvas app the rating will not change when I click. Is it locked?

Almost certainly **Value** is bound to a number rather than to a variable.

A canvas code component cannot write to its own input. It raises `OnChange`,
and the app stores the result. With `Value` set to the literal `3`, there is
nowhere for the change to go, so the next render puts `3` back and the control
looks frozen. `OnChange` is firing the whole time — you can confirm it by
checking the variable it sets.

Set `Value` to `varRating`, `OnChange` to `Set(varRating, StarRating1.value)`,
and initialise `varRating` in `App.OnStart`.

If it is genuinely locked rather than snapping back, the clear button will be
hidden too, and the icons dimmed — that means **DisplayMode** is `View` or
`Disabled`.

## Why do the icons wrap onto two rows?

The column is narrower than the scale needs. Twenty `medium` icons want roughly
440px; in a narrower field they reflow onto another row rather than being
clipped at the edge. Widen the form column, drop **Size** to `small`, or lower
**Maximum**.

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
