# pcf-star-rating — scaffolded, built, and packed

Picked to exercise the parts of `_template` that no existing control had: the
template's `index.ts` handled exactly one piece of platform state
(`context.mode.isControlDisabled`) and bound exactly one `SingleLine.Text`
property, so read-only, error, field-security, RTL and numeric handling had been
reinvented per control and proven in none of them.

Adopted from `_template` with `--framework standard`. Verified with Microsoft's
own tooling: `npm run refreshTypes`, `npm run lint`, `npm run build`, and a full
`msbuild /t:build /restore /p:configuration=Release` pack of the solution.

| Step | Result |
| --- | --- |
| `npm run check` | passes, including the demo-path check once `out/` exists |
| `npm run lint` | clean |
| `npm run build` | `out/controls/StarRating/bundle.js`, **18.7 KiB** |
| `msbuild` Release pack | rebuilds production: **8,773 bytes**, both zips |

No React anywhere: `grep -c '__SECRET_INTERNALS\|react-dom.production'` on the
bundle returns 0. For scale, `pcf-barcode-scanner` is 7.78 KiB and
`pcf-tag-list` is 96.7 KiB.

## The type group does *not* erase types here — `control-patterns.md` is too broad

`references/control-patterns.md` states that a type-grouped property "generates
as the *base* `ComponentFramework.PropertyTypes.Property` — `raw: any`, and
`attributes?: Metadata` without the specific metadata", and that "every read
then needs a cast".

That is true for the case it was written from (`OptionSet | MultiSelectOptionSet`,
in `pcf-choices-picker`) and false here. `refreshTypes` over
`<type-group>Whole.None, Decimal</type-group>` generated:

```ts
value: ComponentFramework.PropertyTypes.NumberProperty;
// IOutputs
value?: number;
```

Fully typed — `raw: number | null`, `attributes?: NumberMetadata` carrying
`MinValue` and `MaxValue`. Not one cast in `index.ts`.

The rule is narrower than the reference states: **`pcf-scripts` erases to the
base `Property` only when the grouped types have no common generated property
type.** `Whole.None`, `Decimal` and `FP` all generate `NumberProperty`
subtypes, and the platform's own type definitions say so out loud — the
`NumberProperty` doc comment reads "when property manifest type is
Whole.None|FP|Decimal". `OptionSetProperty` and `MultiSelectOptionSetProperty`
share no such parent, so that group collapses.

What is lost is only the *subtype*: `NumberProperty.attributes` is
`NumberMetadata`, not `DecimalNumberMetadata`, so `Precision` is not reachable
without a cast. `MinValue` and `MaxValue` are.

The other two costs the reference names still stand and were accepted: the hub
publishes the type as `Whole.None | Decimal`, and the demo panel's editor
inference falls through to a text box.

## Deciding half steps — and the first version of this was wrong

The interesting consequence of the type group. A rating control that offers half
stars on a Whole Number column writes 3.5 to a column that truncates it to 3 —
the user's choice is silently altered on save.

`attributes.Precision` would be the obvious signal and is not reachable (above).
`context.parameters.value.type` is, so the first implementation tested it against
`/decimal|fp|float|currency/i` and forced whole steps otherwise.

**That was the exact bug the skill had just been updated to warn about.**
`pcfhub-controls-skill` commit `7c92019`, written from a real model-driven form:
for a type-grouped property the platform may report *the group’s accepted types*
rather than the resolved member — a string naming every type in the group,
whichever column is bound. `pcf-choices-picker` tested `/multi/i` that way and
rendered every single-select column as a multi-select on real forms.

Here the failure would have been worse than no check: on such a host the string
contains "Decimal" whatever the column is, so `/decimal/i` matches on a Whole
Number column and enables precisely the half step the guard existed to prevent.

The rewrite compares exactly, and **vetoes rather than enables**:

```ts
if (!context.parameters.allowHalf.raw) return 1;
return (context.parameters.value.type ?? '').trim() === 'Whole.None' ? 1 : 0.5;
```

An exact `Whole.None` is proof the column truncates, and the half step is refused.
Anything else — a resolved `Decimal`, or a group string the control cannot
interpret — leaves the maker’s `allowHalf` standing. That is the only shape that
behaves correctly on both kinds of host: it never enables a half step on a column
known to reject it, and it never silently disables one the maker asked for.

The value’s own shape cannot help here, unlike the multi-select case.
`Array.isArray` is proof of arity; `Number.isInteger(3)` is not proof of a whole
number *column*, because a Decimal column holding 3.0 looks identical.

`allowHalf` is therefore a maker declaration with one platform override, which is
a documentation burden rather than a code one — called out in `docs/api.md`,
`docs/limitations.md`, `docs/faq.md`, `docs/canvas.md`, `docs/examples.md` and
`docs/model-driven.md`.

## Platform state the template never touched

All of it compiled against the real `@types/powerapps-component-framework`
definitions rather than assumed. Each is a candidate for promotion into
the template's `<Control>/index.ts`:

- **`context.mode.isVisible`** — canvas relies on it; a model-driven form hides
  the section itself. Honouring it costs one class toggle and covers both.
- **`parameters.value.security`** (`SecurityValues`: `editable`, `readable`,
  `secured`) — field-level security is *separate* from read-only state. A user
  denied read access gets `raw === null`, which is indistinguishable from
  "unrated" unless `security.readable` is checked. Drawing an empty rating there
  is a real information bug, not a cosmetic one.
- **`parameters.value.error` / `.errorMessage`** — the platform's own validation
  message. Surfaced under the icons plus `aria-invalid` on the group.
- **`attributes.MaxValue`** (`NumberMetadata`) — model-driven only, absent in
  canvas, so it narrows the maker's `max` when present and is ignored when not.
  `attributes` being optional is the whole canvas/model-driven difference
  expressed in one `?`.
- **`context.mode.label`** — the label the maker gave the field on the form. A
  better accessible name for the group than anything in the `.resx`, and the
  `.resx` string is the fallback rather than the default.
- **`context.userSettings.isRTL`** — flips `dir`, which flips the horizontal
  arrow keys and the half-step hit test. Invisible to an LTR reviewer, so it is
  worth stating that both were handled: `ArrowRight` decrements under RTL.
- **`context.formatting.formatInteger` / `.formatDecimal`** — preferred over
  `Intl` so "3,5" renders as the rest of the form renders it.

## Demo — `full`, with one unverified assumption

Nothing leaves the browser: no `<feature-usage>`, no `context.webAPI`, no
`context.device`, no `external-service-usage`. Both of the skill's questions
answer clean, so `fidelity: "full"`.

**Every input property is set in every preset**, per `pcfhub-manifest.md`: a
manifest `default-value` reaches the harness as the raw XML *string*, and
`Parameters.ts` does `raw: Boolean(raw)`, so `default-value="false"` would
arrive as `Boolean("false")` — `true`. `allowHalf` would have been on in every
preset that omitted it.

`attributes.MaxValue` is safe in the demo without special handling:
`baseAttributes()` returns no `MaxValue`, so `resolveMax()` takes its
`ceiling === undefined` branch and uses the maker's `max` — the same path a
canvas app takes.

The `half-steps` preset is safe under the rewritten `resolveStep()` in a way it
was not under the first version. It now needs the harness to report anything
*other than* the exact string `Whole.None`, rather than needing it to report a
specific fractional type — so the default behaviour of a harness that synthesises
`Property` objects from `presets[].props` works in its favour. Still worth
confirming against `demo-harness/context/Parameters.ts` in the hub repo, but it
is no longer the difference between `full` and `limited`.

## Solution pack

Packs both types. Worth recording because the template's own comment is slightly
wrong: `release.yml:76` says msbuild "calls the unmanaged one
`<UniqueName>.zip`". It does not — it names it after the **project file**, so
with the template's `Solution.cdsproj` the output is `Solution.zip`, not
`StarRatingSolution.zip`. The workflow's rename is glob-based
(`*.zip` minus `*_managed.zip`) so it works either way; only the comment is
wrong.

Identity, permanent from here: publisher `PCFHub`, prefix `pcfhu`, solution
`<UniqueName>StarRatingSolution</UniqueName>`.

## Things setup.mjs already handles that the skill lists as manual

Checked rather than assumed, and all three are wrong in `SKILL.md` or stale:

- It **deletes `variants/`** on adoption, not just `TEMPLATE.md`. An adopted
  standard control carries no dead React variant.
- It **deletes `docs/migration.md`**, so the "delete it on a first release"
  step is already done.
- Its final output block already says to commit `package-lock.json`, as step 2
  of 6. The skill and `TEMPLATE.md` both describe this as a trap to remember.

## What went back into `_template`

This control existed to find these, so they belong here as well as in the
template's own history (`_template` commit `3a4f6dd`).

- **`check-template.mjs` now validates the control shape** — `control.type` and
  `control.framework` against the manifest under the hub's dataset > virtual >
  field precedence, `demo.fidelity` against the four values, and `limited`
  against having any `demo.limitations` at all. Three items moved off the
  review checklist and into CI.
- **It caught a real `setup.mjs` bug on its first run.** `--framework react`
  set `control-type="virtual"` and `framework: "react_virtual"` but left
  `control.type` at `"field"`. Every React control ever scaffolded from this
  template started with a `pcfhub.json` the hub would silently re-derive. The
  comment directly above the bug read "nothing validates that agreement but a
  reader", which had just stopped being true.
- **The template's `index.ts` carries the state block** proven above, with the
  text-input equivalent of each branch (`attributes.MaxLength` in place of
  `MaxValue`).
- **A `SPEC.md` skeleton, a `demo.presets` scaffold**, and `TEMPLATE.md`
  sections on presets and multi-locale resx.

One thing did **not** go back: `parameters.value.type` as the half-step signal.
It is specific to a numeric type group and would be noise in a text-field
template. It belongs in the skill instead.

## Still open

- `media/logo.png` is the template placeholder, and `media.screenshots` is
  empty. `docs/overview.md` and `docs/examples.md` had their `::image`
  directives **removed** rather than left pointing at files that do not exist —
  `check-template.mjs` does not validate doc-referenced images, so a broken one
  would have shipped silently.
- Verify the harness `type` value, above.
- No GitHub repo yet; local `git init` only, nothing pushed, no tag.
- Not imported into a real environment, so the field-security and business-rule
  error paths are read-correct but not observed.
