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
| `msbuild` Release pack | rebuilds production: **8,994 bytes**, both zips |

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

### A green msbuild is not proof the production bundle was rebuilt

The skill says msbuild is the only local step that compiles in production mode,
so a green `npm run build` is not evidence the shipping bundle compiles. True,
and incomplete — a green **msbuild** is not evidence either.

Observed here. After `npm run build` followed by a pack, `out/controls/
StarRating/bundle.js` was 20,271 bytes and still carried the webpack
"the eval devtool has been used... neither made for production" banner. msbuild
had reported both packs complete and no errors: its incremental check found
`obj/` up to date from an earlier pack and skipped the PCF build entirely,
leaving whatever `npm run build` had last written in `out/`.

So the production number is only trustworthy from a clean tree:

```powershell
Remove-Item -Recurse -Force obj, out, Solution\obj, Solution\bin
```

Clean, this control is **8,785 bytes** — against 19.4 KiB from
`npm run build`. Confirm by looking rather than by exit code: a production
bundle is one long line with no banner, and
`head -c 200 out/controls/<Control>/bundle.js` settles it in a second.

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

## The 20-icon scale overflowed its column

Reported from a real form: at `max` 20 in a narrow field, the trailing icons and
the clear button were painted outside the cell and clipped away. Measured in a
browser against the shipped stylesheet rather than diagnosed from the screenshot:

| Container | Group width | Clear button | 
| --- | --- | --- |
| 320px | 438px | right edge at x=487 against a cell edge of 350 — invisible |
| 200px | 438px | invisible |
| 320px, `max` 5 | 108px | visible |

438px is 20 icons at 20px plus 19 gaps at 2px, and the group held it at every
container width. Two causes, both in the stylesheet:

- **A flex item's `min-width` defaults to `auto`**, which means "never shrink
  below your content". So `.StarRating-group` kept its full 438px and pushed the
  clear button out of the cell instead of reflowing. `max-width: 100%` on the
  parent caps that box; it does nothing about content overflowing it.
- **The icons are `flex: 0 0 auto`** and deliberately stay that way — shrinking
  them takes the `small` scale below a usable touch target. With neither the
  group nor its children able to shrink, there was no way to fit.

Fixed with `min-width: 0` and `flex-wrap: wrap` on the group, `flex` rather than
`inline-flex` on the container, and `flex: 0 0 auto` on the clear button so it is
never the thing squeezed out. Twenty icons now reflow onto two rows at 320px and
three at 200px, with the clear button visible in every case.

**The same root cause hid a second defect nobody had reported.** The container
being a single non-wrapping flex row put the validation message *beside* the
icons rather than beneath them — so the platform's own error text read as a
caption. Confirmed by measurement (`message.top` inside the group's box), fixed
with `flex-basis: 100%`. Worth recording because it was found by reproducing the
reported bug properly rather than by patching the symptom described.

## The colour property, and why it is validated

`color` (`SingleLine.Text`, default `#F2B100`) writes the `StarRating-filled`
custom property on the container at render. It sets exactly one thing: the fill
of a selected icon. Unselected icons, the error state and the focus ring keep
fixed colours so contrast and the invalid state hold whatever a maker picks.

**A custom property accepts any string.** The CSSOM does not validate it, because
a custom property has no type until something substitutes it — so a typo would
silently blank the icons, and `url(evil.svg)` would become a live SVG paint
server the moment `fill: var(...)` substituted it. `CSS.supports('color', value)`
is the browser's own colour parser and rejects both.

Verified against ten inputs in a browser: `#0F6CBD`, `goldenrod`, `rgb(242 177
0)` and `hsl(44 100% 47%)` all substitute and paint; empty, whitespace,
`notacolour`, `url(evil.svg)` and a `red; background:url(x)` injection attempt all
fall back to the default.

**An XML comment may not contain a double hyphen** — anywhere, not just as a
delimiter. Naming the custom property with its real leading double hyphen
inside a manifest comment broke the parse, and `pcf-scripts` reported it as a
bare `Line: 92 Column: 18` with no message. Cost two builds to find.

## Canvas: the unconditional value assignment made the control look locked

Reported from a canvas app: clicking a star or the clear button did nothing.

Diagnosed from one detail in the maker's screenshot rather than by guessing.
The **clear button was visible**, and `clearButton.hidden` is
`!showClear || !interactive || value === null` — so `interactive` was true, and
the control was not disabled, not read-only and not security-trimmed. It was
not locked. It was snapping back.

`render()` had `this.value = this.clamp(parameter.raw)` with no guard, which
the template's own `index.ts` warns against for exactly this reason and which
this control then failed to apply. `updateView` runs after our own
`notifyOutputChanged`, so the platform's value is re-adopted immediately after
every click. On a model-driven form that is harmless, because the platform has
actually stored the new value and hands the same one back.

In a canvas app it is not harmless, because **a code component never writes to
its own input**. It raises `OnChange` and the app decides what to store. The
maker had bound `value` to the literal `3`, so the platform handed back `3`
after every click.

Simulated the lifecycle rather than reasoning about it — clicks 4, 5, clear, 2:

| guard | binding | painted |
| --- | --- | --- |
| off | constant | `3 -> 3 -> 3 -> 3 -> 3` |
| on | constant | `3 -> 4 -> 5 -> blank -> 2` |
| off or on | variable | `3 -> 4 -> 5 -> blank -> 2` |

The detail that made the report confusing: in the broken row `OnChange` still
fired four times and the app variable still ended up holding `2`. The binding
was half-working, and only the display was stuck — which is why it read as
"locked" rather than as "not saving".

Fixed by tracking the last value the platform supplied and adopting a new one
only when it differs. A constant binding is still the wrong configuration and
`docs/canvas.md` now opens with a warning about it, but the control no longer
presents it as a dead control.

## Canvas: `?? undefined` in getOutputs meant the clear button emitted nothing

Reported after the previous fix: stars worked in canvas, the clear button did
not — and the clear button worked fine on a model-driven form.

The code and its own comment disagreed, which is why a read-through had missed
it twice:

```ts
// `null` clears the column; `undefined` would leave it untouched.
return { value: this.value ?? undefined };
```

`this.value ?? undefined` turns `null` into `undefined` — literally the
"leave it untouched" case the comment warns about. Clearing emitted "no
change".

**It was written that way because the generated type is narrower than the
contract.** `refreshTypes` produces `value?: number` for the bound property, so
`null` does not type-check, and `?? undefined` is the change that makes `tsc`
go quiet. It compiles, it reads plausibly, and it is wrong.

The host split is what makes this expensive: a model-driven form is forgiving
about an undefined output and clears anyway, so the bug is invisible on the
host most people test first. Canvas honours it strictly and the button is inert.

Fixed by emitting `null` and casting past the generated type. Confirmed in the
built bundle rather than assumed — the compiled output is
`value: this.value === null ? null : this.value`, with the cast erased.

The general lesson, worth carrying to the next control: **a generated
`IOutputs` describes the shape, not the semantics.** Where clearing a value is
part of the contract, the generated optional-number type cannot express it, and
satisfying the type instead of the contract silently removes the feature.

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
