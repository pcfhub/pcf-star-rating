---
title: Overview
description: What Star Rating does, and when to reach for it.
order: 1
---

# Star Rating

Star Rating draws a whole number or decimal column as a row of icons a user can
click or type into, instead of a number box. It is a rating widget that behaves
like a form control: it honours the form's read-only state, column-level
security, the column's own maximum, the user's locale and reading direction, and
it is fully operable from the keyboard.

::image{src=media/screenshot.png alt="A Score column drawn as five stars with two and a half filled, and a clear button at the end of the row" zoom}

## Why this one

- **It is a real radio group.** Arrow keys move through the values, `Home` and
  `End` jump to the ends, `Delete` clears, and a screen reader announces
  "3 of 5" rather than reading five unlabelled images.
- **It refuses to lie about half values.** Half steps are only offered when the
  bound column can actually store them. On a whole number column the control
  stays on whole steps rather than rounding a user's 3.5 down to 3 behind their
  back.
- **It has no palette of its own.** Every colour comes from a CSS custom
  property with a fallback, so a themed environment restyles it by setting one
  variable, and Windows high contrast mode is handled explicitly.
- **It is a standard control, not a React one.** The bundle is under 20 KB and
  carries no framework, so it loads on older platform versions too.

## What it works with

:::callout{type=info}
Star Rating works in **model-driven forms**, **canvas apps** and **custom
pages**. It binds to a **Whole Number** or **Decimal** column and needs no
special privileges: it makes no Web API calls, uses no device features, and
reaches no third-party service.
:::

Column metadata such as the column's maximum value is only available in
model-driven apps. In a canvas app the control falls back to the **Maximum**
property alone, which is the correct behaviour there rather than a degradation.
