/*
 * Drives the real built bundle outside a browser.
 *
 *     npm run build && npm run smoke
 *
 * A **standard** control writes into the container it was handed, so these
 * assertions read the DOM it built.
 *
 * Why it exists alongside `npm start`: that renders the control and lets you
 * click the stars, which is the happy path and the better tool for it. What it
 * cannot produce is every state below — a column the user may not read, a host
 * reporting a type-group's accepted types rather than the resolved member, an
 * RTL layout where the arrow keys swap, or a colour the maker typed wrong.
 *
 * **What passing here does NOT mean.** Every value is supplied by this file. It
 * cannot tell you the icons look right, that a real browser's `CSS.supports`
 * agrees with the narrow one in `dev/host.js`, or that a save persists
 * anything. Keep those in SPEC.md under "Not verified".
 */

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.join(__dirname, '..');
const dom = require('./dom.js');
const host = require('./host.js');
const clock = require('./clock.js');

const BUNDLE = path.join(root, 'out', 'controls', 'StarRating', 'bundle.js');

if (!fs.existsSync(BUNDLE)) {
    console.error('\n  No bundle at out/controls/StarRating. Run npm run build first.\n');
    process.exit(1);
}

/* ----------------------------------------------------------- the platform */

dom.install(global);
host.installCssSupports(global);

const time = clock.install(Date.UTC(2026, 0, 1, 12, 0, 0), global);

const registration = host.captureRegistration(global);

vm.runInThisContext(fs.readFileSync(BUNDLE, 'utf8'), { filename: 'bundle.js' });

/* ---------------------------------------------------------------- harness */

const results = [];

function check(label, ok, detail) {
    results.push({ ok, label, detail });
}

const marked = (key) => `resx:${key}`;

const live = [];

function disposeAll() {
    while (live.length > 0) {
        live.pop().destroy();
    }
}

function mount(options) {
    const container = dom.createElement('div');
    const context = host.createContext({ ...options, getString: marked });
    const instance = new registration.ctor();

    let notifications = 0;

    instance.init(
        context,
        () => {
            notifications += 1;
        },
        {},
        container,
    );

    instance.updateView(context);

    const handle = {
        instance,
        container,
        outputs: () => instance.getOutputs(),
        notifications: () => notifications,
        update: (next) => instance.updateView(host.createContext({ ...options, ...next, getString: marked })),
        destroy: () => {
            instance.destroy();

            const at = live.indexOf(handle);

            if (at !== -1) {
                live.splice(at, 1);
            }
        },
        find: (selector) => container.querySelector(selector),
        all: (selector) => container.querySelectorAll(selector),
        /** Press a key on the radiogroup, the way a keyboard user does. */
        press: (key) => {
            const group = container.querySelector('.StarRating-group');

            group.dispatchEvent({ type: 'keydown', key, target: group, preventDefault() {} });
        },
    };

    live.push(handle);

    return handle;
}

check('bundle registered a control', typeof registration.ctor === 'function');

if (typeof registration.ctor !== 'function') {
    report();
}

/* ------------------------------------------------------------ what it draws */

const plain = mount({});

check('renders one icon per point on the scale', plain.all('.StarRating-icon').length === 5, String(plain.all('.StarRating-icon').length));

check('and honours a different maximum', mount({ max: 10 }).all('.StarRating-icon').length === 10, String(mount({ max: 10 }).all('.StarRating-icon').length));

check(
    'the icons are a radio group rather than decorative shapes',
    plain.all('.StarRating-icon')[0].getAttribute('role') === 'radio',
    plain.all('.StarRating-icon')[0].getAttribute('role'),
);

check(
    'the chosen one is the one marked checked',
    plain.all('.StarRating-icon')[2].getAttribute('aria-checked') === 'true'
        && plain.all('.StarRating-icon')[0].getAttribute('aria-checked') === 'false',
);

/*
 * The accessible name comes from the maker's label for this field, not from the
 * .resx — the resource string cannot know what the field is called on this
 * form, so it is the fallback rather than the default.
 */
check("the group's accessible name is the form's own label", plain.find('.StarRating-group').getAttribute('aria-label') === 'Satisfaction');

check(
    'and falls back to the .resx when the form gives none',
    mount({ label: '' }).find('.StarRating-group').getAttribute('aria-label') === 'resx:StarRating_AriaLabel',
);

check(
    'an unrated record says so rather than reading as zero',
    mount({ value: null }).find('.StarRating-group').getAttribute('aria-valuetext') === 'resx:StarRating_Empty',
    mount({ value: null }).find('.StarRating-group').getAttribute('aria-valuetext'),
);

/* ------------------------------------------------------------- the states */

/*
 * Column-level security is separate from the form's read-only state, and
 * conflating them is a real information bug: a user denied read access gets
 * `raw === null`, which is indistinguishable from "not rated" unless
 * `security.readable` is checked.
 */
const denied = mount({ security: 'no-access', value: null });

check('a column the user cannot read says so', denied.find('.StarRating-message').textContent === 'resx:StarRating_NoAccess', denied.find('.StarRating-message').textContent);

check(
    'a read-only column makes it non-interactive on an editable form',
    mount({ security: 'read-only' }).container.classList.contains('StarRating--disabled'),
);

check('and so does a read-only form', mount({ disabled: true }).container.classList.contains('StarRating--disabled'));

check(
    'which is announced, not only styled',
    mount({ disabled: true }).find('.StarRating-group').getAttribute('aria-readonly') === 'true',
);

const invalid = mount({ error: true });

check('a validation error is shown to the user', invalid.find('.StarRating-message').textContent === host.DEFAULTS.errorMessage);

check('and announced rather than only coloured', invalid.find('.StarRating-group').getAttribute('aria-invalid') === 'true');

check('renders on a host that publishes no column metadata', mount({ host: 'canvas' }).all('.StarRating-icon').length === 5);

check('takes no position on the theme when the host publishes none', !mount({ host: 'canvas' }).container.classList.contains('StarRating--dark'));

check('renders nothing visible when the host says it is hidden', mount({ visible: false }).container.classList.contains('StarRating--hidden'));

/* ---------------------------------------------------------- clearing */

/*
 * **`null` is not `undefined`, and this control shipped the bug once.**
 *
 * `refreshTypes` generates `value?: number`, so `null` does not type-check and
 * the obvious `this.value ?? undefined` compiles — while meaning the exact
 * opposite of clearing. A canvas app honours "no change" strictly and the clear
 * button does nothing at all; a model-driven form is more forgiving, so it
 * hides on the host most people test first. This assertion is what stops it
 * coming back.
 */
const cleared = mount({});

cleared.find('.StarRating-clear').click();

check(
    'the clear button produces an output the platform can act on, not "no change"',
    cleared.outputs().value === null,
    `getOutputs() returned ${JSON.stringify(cleared.outputs())}`,
);

check('and notifies exactly once', cleared.notifications() === 1, String(cleared.notifications()));

check('the clear button is hidden when the maker turned it off', mount({ showClear: false }).find('.StarRating-clear').hidden === true);

check('and when there is nothing to clear', mount({ value: null }).find('.StarRating-clear').hidden === true);

/* ------------------------------------------------------- the half step */

/*
 * **`allowHalf` is the maker's declaration, and the type comparison vetoes
 * rather than enables.**
 *
 * For a type-grouped property a host may report the *group's accepted types* —
 * a string naming every member, whichever column is bound. A loose test like
 * `/decimal/i` would match that on a Whole Number column and enable the half
 * step it exists to prevent, which is worse than no check at all. Only an exact
 * `Whole.None` is proof the column truncates.
 */
const halves = mount({ allowHalf: true, type: 'Decimal', value: 3 });

halves.press('ArrowRight');

check('a decimal column moves in half steps when the maker asked', halves.outputs().value === 3.5, String(halves.outputs().value));

const whole = mount({ allowHalf: true, type: 'Whole.None', value: 3 });

whole.press('ArrowRight');

check('a whole-number column vetoes the half step', whole.outputs().value === 4, String(whole.outputs().value));

/*
 * The case the exact comparison exists for: a host naming the whole group.
 * A substring test matches "Whole.None" in here and refuses a half step the
 * maker asked for on a column that can hold one.
 */
const group = mount({ allowHalf: true, type: 'Whole.None,Currency,Decimal,FP', value: 3 });

group.press('ArrowRight');

check(
    'a host reporting the whole type group leaves the maker’s setting standing',
    group.outputs().value === 3.5,
    `${String(group.outputs().value)} — a substring test would give 4 here`,
);

/* ------------------------------------------------------------ the keyboard */

const keys = mount({ value: 3 });

keys.press('Home');

check('Home selects the first point on the scale', keys.outputs().value === 1, String(keys.outputs().value));

keys.press('End');

check('End selects the last', keys.outputs().value === 5, String(keys.outputs().value));

keys.press('Delete');

check('Delete clears it', keys.outputs().value === null, JSON.stringify(keys.outputs().value));

const stops = mount({ value: 5 });

stops.press('ArrowRight');

check('and it does not walk off the end of the scale', stops.outputs().value === 5, String(stops.outputs().value));

/*
 * **In an RTL layout the arrow that points at the next icon is the one pointing
 * left**, so the horizontal keys swap and the vertical ones do not. This is
 * invisible to an LTR reviewer, and it is the assertion this control most needs.
 */
const rtl = mount({ rtl: true, value: 3 });

rtl.press('ArrowLeft');

check('in RTL the left arrow moves forward', rtl.outputs().value === 4, String(rtl.outputs().value));

const rtlBack = mount({ rtl: true, value: 3 });

rtlBack.press('ArrowRight');

check('and the right arrow moves back', rtlBack.outputs().value === 2, String(rtlBack.outputs().value));

const rtlUp = mount({ rtl: true, value: 3 });

rtlUp.press('ArrowUp');

check('while the vertical keys do not swap', rtlUp.outputs().value === 4, String(rtlUp.outputs().value));

/*
 * A non-interactive control must not respond to the keyboard either — leaving
 * the keys live is the easy miss, because the control already looks read-only.
 */
const locked = mount({ disabled: true, value: 3 });

locked.press('ArrowRight');

check('a read-only control ignores the keyboard too', locked.notifications() === 0, String(locked.notifications()));

/* -------------------------------------------------------------- the colour */

/*
 * A custom property accepts *any* string — the CSSOM does not validate it,
 * because it has no type until something substitutes it. So a typo silently
 * blanks the icons, and `url(evil.svg)` is a live paint server the moment
 * `fill: var(…)` substitutes it.
 */
const filled = (handle) => handle.container.style.getPropertyValue('--StarRating-filled');

check('a valid colour reaches the custom property', filled(mount({ color: '#0F6CBD' })) === '#0F6CBD', filled(mount({ color: '#0F6CBD' })));

const fallback = filled(mount({ color: null }));

check('and the default stands when the maker set none', fallback !== '' && fallback !== 'null', fallback);

/*
 * `url(…)` is the one that matters. A custom property has no type until
 * something substitutes it, so `fill: var(--StarRating-filled)` would turn this
 * into a live paint server fetching from another origin.
 */
const bad = mount({ color: 'url(https://evil.example/x.svg)' });

check(
    'a url() is refused rather than substituted into the paint',
    filled(bad) === fallback && !filled(bad).includes('evil.example'),
    filled(bad),
);

check(
    'and a typo falls back rather than silently blanking the icons',
    filled(mount({ color: 'blurple' })) === fallback,
    filled(mount({ color: 'blurple' })),
);

/* ---------------------------------------------------- the platform’s echo */

/*
 * `updateView` runs after this control's own `notifyOutputChanged`, so a
 * control that notified on every render would push an unchanged value back at
 * the form and dirty it. On a canvas app bound to a constant, that is every
 * click.
 */
const echoed = mount({ value: 3 });

echoed.update({});
echoed.update({});

check('a re-render never notifies the platform', echoed.notifications() === 0, String(echoed.notifications()));

const adopted = mount({ value: 3 });

adopted.update({ value: 5 });

check(
    'but a new value from the platform is adopted',
    adopted.all('.StarRating-icon')[4].getAttribute('aria-checked') === 'true'
        && adopted.all('.StarRating-icon')[2].getAttribute('aria-checked') === 'false',
    `fifth: ${adopted.all('.StarRating-icon')[4].getAttribute('aria-checked')}, third: ${adopted.all('.StarRating-icon')[2].getAttribute('aria-checked')}`,
);

/* --------------------------------------------------- what destroy owes */

/*
 * **Keep this when the rest of the file changes.**
 *
 * This control takes five listeners in `init` and releases five in `destroy` —
 * all on elements inside its own container, which the platform collects with
 * the subtree, so both counts are zero. They start meaning something the moment
 * one moves to `document` or a timer appears.
 */
disposeAll();

const timersBefore = time.pending();
const listeners = () => Object.values(dom.document.listeners).reduce((total, list) => total + list.length, 0);
const listenersBefore = listeners();

mount({}).destroy();

check('destroy() releases every timer the control took', time.pending() === timersBefore, `${timersBefore} → ${time.pending()}`);

check('and every document-level listener', listeners() === listenersBefore, `${listenersBefore} → ${listeners()}`);

disposeAll();

report();

function report() {
    const failed = results.filter((result) => !result.ok);

    for (const result of results) {
        const detail = result.detail ? `  — ${result.detail}` : '';

        console.log(`  ${result.ok ? 'ok  ' : 'FAIL'}  ${result.label}${detail}`);
    }

    console.log(
        failed.length > 0
            ? `\n  ${failed.length} of ${results.length} failed\n`
            : `\n  ${results.length} passed — the control's own decisions only; see SPEC.md for what a real form still has to confirm\n`,
    );

    process.exit(failed.length > 0 ? 1 : 0);
}
