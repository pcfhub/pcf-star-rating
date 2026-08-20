---
title: Model-driven apps
description: Adding Star Rating to a form.
order: 4
---

# Using it on a model-driven form

:::steps
1. Open the form in the modern form designer.
2. Select the column this control binds to.
3. Under **Components -> Add component**, choose **Star Rating**.
4. Enable it for **Web**, **Phone** and **Tablet** as appropriate.
5. Save and publish.
:::

## Column types

| Column type | Supported | Notes |
| --- | --- | --- |
| Whole Number | Yes | Whole steps only. **Allow half values** is ignored. |
| Decimal Number | Yes | Half steps available when **Allow half values** is on. |
| Currency, Floating Point | No | Not offered by the designer; the control binds to Whole Number and Decimal only. |
| Anything else | No | The control does not appear in the component list for the column. |

The control reads the column's own **Maximum value** and never draws more icons
than the column can hold, so a Whole Number column capped at 3 shows three icons
even if **Maximum** is set to 10.

## Form state it honours

- **Read-only fields** and read-only forms render the rating without
  interaction, at reduced opacity.
- **Field-level security** is respected separately from read-only state. A user
  who cannot read the column sees "You do not have access to this value." rather
  than an empty rating; a user who can read but not write sees the value without
  being able to change it.
- **Business rule and validation errors** on the column are surfaced as the
  platform's own message underneath the icons, and the group is marked
  `aria-invalid`.
- **The field label** from the form is used as the group's accessible name, so
  a screen reader says "Satisfaction, 3 of 5" rather than a generic "Rating".

:::callout{type=info}
The control is localised into English, Spanish, French, German and Japanese. The
language follows the user's own setting; there is nothing for a maker to
configure per form.
:::
