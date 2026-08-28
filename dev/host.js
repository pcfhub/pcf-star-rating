/*
 * The platform, stood in for: everything this control reads off `context`.
 *
 * ---
 *
 * **Why this exists when `npm start` already hosts a field control.**
 *
 * `pcf-start` renders it and lets you click the stars, which is the happy path
 * and genuinely the better tool for that. What it cannot produce:
 *
 *   - **field-level security** — `readable === false` arrives as `raw === null`,
 *     indistinguishable from "not rated" to a control that does not check;
 *   - **the type-group's reported type** — the one signal that decides whether
 *     a half step is allowed, and the one a host may report as the *group's*
 *     accepted types rather than the resolved member;
 *   - **an RTL layout**, where the arrow key that moves to the next star is the
 *     one pointing left — invisible to an LTR reviewer;
 *   - **a colour the maker typed wrong**, which the CSSOM does not validate
 *     because a custom property has no type until something substitutes it.
 *
 * ---
 *
 * **A stub must never be more capable than the thing it stands in for.**
 * `security` is `undefined` on a column with no FLS profile. `attributes` is
 * `undefined` on canvas. And `parameter.type` is a *switch* here rather than a
 * constant, because the whole point of `resolveStep` is that a host may report
 * something this control cannot interpret.
 */

(function (root, factory) {
    'use strict';

    var api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.__pcfHost = api;
    }
})(typeof window !== 'undefined' ? window : null, function () {
    'use strict';

    var STRINGS = {
        StarRating_AriaLabel: 'Rating',
        StarRating_NoAccess: 'You do not have access to this value.',
        StarRating_Clear: 'Clear the rating',
        StarRating_Empty: 'Not rated',
    };

    var SECURITY = {
        none: undefined,
        'read-only': { editable: false, readable: true, secured: true },
        'no-access': { editable: false, readable: false, secured: true },
    };

    var HOSTS = {
        'model-driven': { label: 'model-driven form', publishesTheme: true, publishesMetadata: true },
        canvas: { label: 'canvas app', publishesTheme: false, publishesMetadata: false },
    };

    var DEFAULTS = {
        host: 'model-driven',
        /** What the column holds. `null` is an unrated record. */
        value: 3,
        /**
         * What `parameter.type` reports.
         *
         * `Whole.None` is proof the column truncates 3.5 to 3, and is the only
         * value that vetoes a half step. A *group* string — a host reporting
         * every type the type-group accepts rather than the resolved member —
         * is the case a loose `/decimal/i` test gets wrong, so it is here as a
         * switch rather than as a comment.
         */
        type: 'Decimal',
        max: 5,
        allowHalf: false,
        shape: 'star',
        size: 'medium',
        showClear: true,
        /** Any string. The CSSOM does not validate a custom property. */
        color: null,
        label: 'Satisfaction',
        visible: true,
        /** The form's read-only state. Not the column's — see `security`. */
        disabled: false,
        security: 'none',
        error: false,
        errorMessage: 'Rate this before saving.',
        dark: undefined,
        rtl: false,
    };

    function createContext(options) {
        var o = Object.assign({}, DEFAULTS, options || {});
        var host = HOSTS[o.host] || HOSTS['model-driven'];
        var security = SECURITY[o.security];

        var getString =
            o.getString
            || function (key) {
                return STRINGS[key] !== undefined ? STRINGS[key] : key;
            };

        return {
            parameters: {
                value: {
                    raw: o.value,
                    type: o.type,
                    security: security,
                    attributes: host.publishesMetadata
                        ? { DisplayName: o.label, LogicalName: 'satisfaction' }
                        : undefined,
                    error: o.error,
                    errorMessage: o.error ? o.errorMessage : undefined,
                },
                max: { raw: o.max, type: 'Whole.None' },
                allowHalf: { raw: o.allowHalf, type: 'TwoOptions' },
                shape: { raw: o.shape, type: 'Enum' },
                size: { raw: o.size, type: 'Enum' },
                showClear: { raw: o.showClear, type: 'TwoOptions' },
                color: { raw: o.color, type: 'SingleLine.Text' },
            },

            mode: {
                isVisible: o.visible,
                isControlDisabled: o.disabled,
                label: o.label,
            },

            resources: { getString: getString },

            /*
             * The two number formatters this control calls, and no more.
             *
             * Marked rather than plausible: a real `formatInteger` returns "3",
             * which in an assertion is indistinguishable from `String(3)` — and
             * the whole point of going through `context.formatting` is that it
             * follows the user's Dataverse settings rather than the browser's,
             * so a half rating reads "3,5" for a user whose locale says so.
             * "fmt:3" can only have come through here.
             *
             * The rest of `FormattingApi` is absent rather than approximated. A
             * stub answering a call the control does not make would let an
             * assertion pass on formatting nobody asked for.
             */
            formatting: {
                formatInteger: function (value) {
                    return 'fmt:' + String(value);
                },
                formatDecimal: function (value, precision) {
                    return 'fmt:' + Number(value).toFixed(precision === undefined ? 1 : precision);
                },
            },

            fluentDesignLanguage: host.publishesTheme ? { isDarkTheme: Boolean(o.dark) } : undefined,

            userSettings: { isRTL: o.rtl, languageId: 1033 },
        };
    }

    /**
     * `CSS.supports`, which the control uses as the browser's own colour parser.
     *
     * A custom property accepts any string — the CSSOM does not validate one,
     * because it has no type until something substitutes it. So a typo silently
     * blanks the icons and `url(evil.svg)` becomes a live paint server the
     * moment `fill: var(…)` substitutes it. The control asks the browser
     * whether the value is a colour; in Node there is no browser, so this
     * answers the same question narrowly and **refuses everything it is not
     * sure about**, which is the direction that cannot manufacture a pass.
     */
    function installCssSupports(global) {
        var NAMED = ['red', 'blue', 'green', 'rebeccapurple', 'transparent', 'currentcolor'];

        global.CSS = {
            supports: function (property, value) {
                if (property !== 'color') {
                    return false;
                }

                var candidate = String(value).trim().toLowerCase();

                return (
                    /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(candidate)
                    || /^rgba?\([0-9.,%\s/]+\)$/.test(candidate)
                    || /^hsla?\([0-9.,%\s/deg]+\)$/.test(candidate)
                    || NAMED.indexOf(candidate) !== -1
                );
            },
        };
    }

    function captureRegistration(global) {
        var box = { name: null, ctor: null };

        global.ComponentFramework = global.ComponentFramework || {};
        global.ComponentFramework.registerControl = function (fullName, ctor) {
            box.name = fullName;
            box.ctor = ctor;
        };

        return box;
    }

    return {
        STRINGS: STRINGS,
        SECURITY: SECURITY,
        HOSTS: HOSTS,
        DEFAULTS: DEFAULTS,
        createContext: createContext,
        installCssSupports: installCssSupports,
        captureRegistration: captureRegistration,
    };
});
