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

## Deciding half steps from `parameters.value.type`, not from metadata

The interesting consequence of the type group. A rating control that offers half
stars on a Whole Number column writes 3.5 to a column that truncates it to 3 —
the user's choice is silently altered on save.

`attributes.Precision` would be the obvious signal and is not reachable (above).
The signal that *is* reachable is `context.parameters.value.type`, which reports
the bound column's real type at runtime for a type-grouped property. So
`resolveStep()` tests it against `/decimal|fp|float|currency/i` and returns 1
otherwise, regardless of what `allowHalf` says.

This makes `allowHalf` a conditional property, which is a documentation burden
rather than a code one — it is called out in `docs/api.md`, `docs/limitations.md`,
`docs/faq.md` and `docs/examples.md`, because "I turned it on and nothing
happened" is otherwise a guaranteed issue.

## Platform state the template never touched

All of it compiled against the real `@types/powerapps-component-framework`
definitions rather than assumed. Each is a candidate for promotion into
`_template/__CONTROL__/index.ts`:

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

**Unverified:** the `half-steps` preset depends on the harness reporting a
`type` string that matches `/decimal|fp|float|currency/i` for the bound
property. The harness synthesises `Property` objects from `presets[].props` and
there is no real column behind them, so what it puts in `type` is not something
this repository can read. If it reports something else, that preset renders as
whole stars and the demo is quietly wrong — which would make it `limited`, not
`full`. **Check `demo-harness/context/Parameters.ts` in the hub repo before
publishing.** Everything else in this section was read from source or observed
in a build; this one was not.

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
