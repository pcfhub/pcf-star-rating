---
title: Canvas apps
description: Adding Star Rating to a canvas app or custom page.
order: 3
---

# Using it in a canvas app

:::steps
1. From **Insert -> Get more components**, open the **Code** tab and import
   **Star Rating**.
2. Place it from **Insert -> Code components**.
3. Bind the properties below.
:::

## Wiring the properties

```powerfx
Set(varRating, 3);
```

| Property | Value |
| --- | --- |
| Value | `varRating` |
| Maximum | `5` |
| Allow half values | `false` |
| Shape | `"star"` |
| Size | `"medium"` |
| Show clear button | `true` |

## Reading the output

The control writes the chosen number straight back to the bound property, so
`StarRating1.value` is the current rating and updates as soon as the user picks
one. Clearing sets it to blank.

```powerfx
// Save the rating when it changes
Patch(Reviews, ThisItem, { Score: StarRating1.value })
```

:::callout{type=info}
A canvas app has no Dataverse column behind the control, so there is no column
metadata to read. Two things follow: the **Maximum** property is the only
ceiling, and **Allow half values** has no column type to check against, so half
steps stay off. Bind a decimal column through a model-driven form if you need
them.
:::
