# Star Rating

A numeric column as an accessible star rating.

[![Build](https://github.com/pcfhub/pcf-star-rating/actions/workflows/build.yml/badge.svg)](https://github.com/pcfhub/pcf-star-rating/actions/workflows/build.yml)
[![Release](https://github.com/pcfhub/pcf-star-rating/actions/workflows/release.yml/badge.svg)](https://github.com/pcfhub/pcf-star-rating/actions/workflows/release.yml)

[![Try it live on PCFHub](https://pcfhub.dev/badges/try-it-live.svg)](https://pcfhub.dev/components/pcf-star-rating)

Documentation lives on [PCFHub](https://pcfhub.dev/components/pcf-star-rating), built
from the `docs/` directory in this repository. Edit the Markdown here; the hub
recompiles it.

## What it does

Draws a Whole Number or Decimal column as a row of icons a user can click or type
into, instead of a number box. It behaves like a form control rather than a widget:
it honours read-only state, field-level security, the column's own maximum, the
user's locale and reading direction, and it is fully operable from the keyboard as a
`radiogroup` — arrows, `Home`/`End`, `Delete`, and a single roving tab stop.

It binds through **one** property that accepts either column type. A field control
binds its first bound property to the column it is placed on, and any further bound
property shows up as a second column picker in the configuration pane — so two
properties would mean asking a maker to choose a second column for a control that
attaches to exactly one. A type-group is the only shape that accepts both types
through a single binding.

**Half steps are vetoed, not enabled.** A Whole Number column truncates `3.5` to
`3`, so offering the half step there would save a value the user did not choose.
The check compares the bound column's type *exactly* against `Whole.None` and
refuses only that case, because for a type-grouped property some hosts report the
group's accepted types rather than the resolved member — and a loose test like
`/decimal/i` then matches on every binding and switches the half step on for exactly
the column it was meant to protect. Anything the control cannot positively identify
as whole-number-only leaves `allowHalf` standing.

**A long scale wraps rather than clips.** Twenty `medium` icons need about 440px;
in a narrower form column they reflow onto another row. The icons keep their size
instead of shrinking, because shrinking takes the `small` scale below a usable touch
target.

## Properties

| Property | Type | Usage | Default | What it controls |
| --- | --- | --- | --- | --- |
| `value` | Whole.None or Decimal | bound, **required** | — | The column the rating reads and writes |
| `max` | Whole.None | input | `5` | How many icons to show; clamped to the column's own maximum, and to 20 |
| `allowHalf` | TwoOptions | input | `false` | Half steps — overruled on a Whole Number column |
| `shape` | Enum: `star` · `heart` · `circle` | input | `star` | Which icon to draw |
| `size` | Enum: `small` · `medium` · `large` | input | `medium` | Icon size |
| `color` | SingleLine.Text | input | `#F2B100` | Fill of a selected icon — any CSS colour |
| `showClear` | TwoOptions | input | `true` | Show the button that empties the column |

`color` is handed to the browser's own colour parser, so `#F2B100`, `goldenrod`,
`rgb(242 177 0)` and `hsl(44 100% 47%)` all work, and anything it cannot read falls
back to the default rather than rendering the icons blank. It sets one thing: the
fill of a selected icon. Unselected icons, the error state and the focus ring keep
fixed colours so that contrast and the invalid state survive whatever is chosen.

Clearing writes blank, not zero — from the clear button, or `Delete` from the
keyboard. Zero is not a reachable rating.

Strings ship in English, Spanish, French, German and Japanese. This is a
**standard** control with no framework: the production bundle is 9,090 bytes, and
neither React nor Fluent is loaded on its account.

:warning: **In a canvas app, bind `value` to a variable, never to a number.** A code
component does not write back to its own input — it raises `OnChange` and the app
decides what to store. Bound to a literal, every click is overwritten on the next
render and the control looks frozen even though `OnChange` is firing. Use
`Set(varRating, StarRating1.value)` and point `value` at `varRating`.

## On the hub

The demo runs at **full** fidelity, which follows from the manifest declaring no
`feature-usage` at all: the control renders and writes back a bound column and does
nothing else — no Web API, no device, no navigation. That absence is what lets the
sandbox run the real thing, and it is one fewer permission prompt for the maker
installing it.

Four presets cover the default five stars, half steps on a decimal column, a
ten-heart scale in another colour, and the empty state.

## Install

Download the managed solution from the
[latest release](https://github.com/pcfhub/pcf-star-rating/releases/latest), or from
the component's page on the hub, and import it into your environment.

## Develop

```bash
npm install
npm start          # the PCF test harness
npm run build
npm run lint
npm run check      # what CI runs first: placeholders, pcfhub.json, control shape
```

Run `npm run refreshTypes` after every manifest edit — until you do,
`context.parameters` is typed from the old manifest and `tsc` will accept code that
cannot work.

To pack the solution locally you need msbuild — either Visual Studio or the
Visual Studio Build Tools:

```bash
cd Solution
msbuild /t:build /restore /p:configuration=Release
```

Both zips land in `Solution/bin/Release`. This is the only local step that compiles
in **production** mode, so a green `npm run build` is not evidence the shipping
bundle compiles — and the pack is incremental, so delete `obj/`, `out/`,
`Solution/obj/` and `Solution/bin/` first if you intend to quote a bundle size from
it.

## Release

1. Bump the version in **three** places, in one commit — they are checked
   against each other in CI:
   - `StarRating/ControlManifest.Input.xml` → `<control version="…">`
   - `Solution/src/Other/Solution.xml` → `<Version>`
   - `package.json` → `"version"`
2. Tag it: `git tag v1.2.3 && git push --tags`

The release workflow builds, packs both solution types, and attaches them to a
GitHub Release. PCFHub picks the release up from its webhook within seconds, or
from the hourly sweep otherwise. A sync imports a draft; a person publishes it.

## Repository layout

| Path | What it is |
| --- | --- |
| `StarRating/` | The control: manifest, entry point, CSS, localised strings |
| `Solution/` | The Dataverse solution that packages it |
| `SPEC.md` | What building this corrected, and what is verified versus read |
| `docs/` | The pages PCFHub publishes — see the comments in each file |
| `media/` | Images and video referenced from the docs |
| `pcfhub.json` | The hub's manifest: identity, links, docs path, demo |
| `scripts/` | Template setup and the CI guard that keeps it adopted |

## Licence

[MIT](LICENSE)
