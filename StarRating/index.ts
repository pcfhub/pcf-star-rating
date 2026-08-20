import { IInputs, IOutputs } from './generated/ManifestTypes';

type Shape = IInputs['shape']['raw'];

/**
 * Icon geometry, drawn on a 24×24 viewBox so every shape shares one scale.
 * Inline SVG rather than a font or an image: it inherits `currentColor`, so
 * the host theme drives the colour and the control cannot fail contrast in a
 * dark or custom theme the way a baked-in palette would.
 */
const PATHS: Record<Shape, string> = {
    star: 'M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4 6.2 20.5l1.1-6.5L2.6 9.4l6.5-.9z',
    heart: 'M12 21s-7.5-4.7-9.3-9.2C1.4 8.3 3.3 5 6.6 5c2 0 3.5 1.1 4.4 2.4h2C13.9 6.1 15.4 5 17.4 5c3.3 0 5.2 3.3 3.9 6.8C19.5 16.3 12 21 12 21z',
    circle: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z',
};

/**
 * The one column type that definitively cannot hold a half step. Compared
 * exactly — never substring-matched — see `resolveStep()`.
 */
const WHOLE_ONLY = 'Whole.None';

/**
 * Fallback for the `color` property, and the same value the stylesheet declares
 * for `--StarRating-filled`. Kept in both places deliberately: the stylesheet
 * has to stand on its own before any script runs, and this is what an
 * unparseable maker value falls back to.
 */
const DEFAULT_COLOR = '#F2B100';

const SHAPES: readonly Shape[] = ['star', 'heart', 'circle'];
const SIZES: readonly IInputs['size']['raw'][] = ['small', 'medium', 'large'];

/**
 * A standard (non-virtual) field control.
 *
 * The four lifecycle methods below are the whole contract with the platform.
 * The one thing worth knowing that the docs bury: `updateView` runs on every
 * change to *any* bound value, including ones this control caused itself, so
 * anything expensive belongs behind a comparison rather than at the top.
 */
export class StarRating implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private container!: HTMLDivElement;
    private group!: HTMLDivElement;
    private clearButton!: HTMLButtonElement;
    private message!: HTMLParagraphElement;
    private notifyOutputChanged!: () => void;
    private resources!: ComponentFramework.Resources;

    private value: number | null = null;

    /** Rebuilding icons on every pass would destroy focus, so track the count. */
    private icons: SVGSVGElement[] = [];
    private shape: Shape | null = null;

    private max = 5;
    private step = 1;
    private interactive = true;

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        _state: ComponentFramework.Dictionary,
        container: HTMLDivElement,
    ): void {
        this.container = container;
        this.notifyOutputChanged = notifyOutputChanged;
        this.resources = context.resources;

        this.group = document.createElement('div');
        this.group.className = 'StarRating-group';
        // A radiogroup, not a row of buttons: it is one value chosen from a
        // fixed set, and a screen reader announces "3 of 5" rather than
        // reading five unrelated controls.
        this.group.setAttribute('role', 'radiogroup');
        this.group.addEventListener('keydown', this.onKeyDown);
        this.group.addEventListener('click', this.onClick);
        this.group.addEventListener('mousemove', this.onHover);
        this.group.addEventListener('mouseleave', this.onHoverEnd);

        this.clearButton = document.createElement('button');
        this.clearButton.className = 'StarRating-clear';
        this.clearButton.type = 'button';
        this.clearButton.innerHTML = '&#x2715;';
        this.clearButton.addEventListener('click', this.onClear);

        this.message = document.createElement('p');
        this.message.className = 'StarRating-message';

        this.container.classList.add('StarRating');
        this.container.append(this.group, this.clearButton, this.message);

        this.render(context);
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this.render(context);
    }

    public getOutputs(): IOutputs {
        // `null` clears the column; `undefined` would leave it untouched.
        return { value: this.value ?? undefined };
    }

    public destroy(): void {
        this.group.removeEventListener('keydown', this.onKeyDown);
        this.group.removeEventListener('click', this.onClick);
        this.group.removeEventListener('mousemove', this.onHover);
        this.group.removeEventListener('mouseleave', this.onHoverEnd);
        this.clearButton.removeEventListener('click', this.onClear);
    }

    // ------------------------------------------------------------------ render

    private render(context: ComponentFramework.Context<IInputs>): void {
        const parameter = context.parameters.value;

        // The form's own state reaches the control through `context.mode`.
        // Canvas relies on this; a model-driven form hides the section itself,
        // so honouring it costs nothing and covers both hosts.
        this.container.classList.toggle('StarRating--hidden', !context.mode.isVisible);

        if (!context.mode.isVisible) {
            return;
        }

        // Column-level security is separate from the form's read-only state: a
        // user can be denied *reading* the value entirely, in which case `raw`
        // is null for a reason that is not "unrated" and must not be drawn as
        // an empty rating.
        const security = parameter.security;

        if (security !== undefined && !security.readable) {
            this.group.hidden = true;
            this.clearButton.hidden = true;
            this.message.hidden = false;
            this.message.textContent = this.resources.getString('StarRating_NoAccess');

            return;
        }

        this.group.hidden = false;

        this.interactive =
            !context.mode.isControlDisabled && (security === undefined || security.editable);

        this.max = this.resolveMax(context);
        this.step = this.resolveStep(context);
        this.value = this.clamp(parameter.raw);

        const shape = SHAPES.includes(context.parameters.shape.raw) ? context.parameters.shape.raw : 'star';
        const size = SIZES.includes(context.parameters.size.raw) ? context.parameters.size.raw : 'medium';

        this.buildIcons(shape);

        this.container.dir = context.userSettings.isRTL ? 'rtl' : 'ltr';
        this.container.classList.toggle('StarRating--disabled', !this.interactive);
        this.container.classList.toggle('StarRating--invalid', parameter.error);
        this.container.style.setProperty('--StarRating-filled', this.resolveColor(context));

        for (const [index, icon] of this.icons.entries()) {
            icon.classList.remove('is-full', 'is-half');
            icon.classList.add(this.fillFor(index + 1));
            icon.setAttribute('role', 'radio');
            icon.setAttribute('aria-checked', String(this.value === index + 1));
            icon.setAttribute('aria-label', this.formatValue(context, index + 1));
            icon.tabIndex = this.tabIndexFor(index);
        }

        // `mode.label` is the label the maker gave the field on the form, which
        // is a better group name than anything shipped in the .resx. Fall back
        // to the resource only when the host supplies nothing.
        this.group.setAttribute(
            'aria-label',
            context.mode.label || this.resources.getString('StarRating_AriaLabel'),
        );
        this.group.setAttribute('aria-invalid', String(parameter.error));
        this.group.setAttribute('aria-readonly', String(!this.interactive));
        this.group.setAttribute(
            'aria-valuetext',
            this.value === null
                ? this.resources.getString('StarRating_Empty')
                : this.formatValue(context, this.value),
        );
        this.group.classList.toggle(`StarRating-group--${size}`, true);

        for (const other of SIZES) {
            if (other !== size) {
                this.group.classList.remove(`StarRating-group--${other}`);
            }
        }

        this.clearButton.hidden =
            !context.parameters.showClear.raw || !this.interactive || this.value === null;
        this.clearButton.title = this.resources.getString('StarRating_Clear');
        this.clearButton.setAttribute('aria-label', this.resources.getString('StarRating_Clear'));

        // The platform's own validation message, surfaced rather than swallowed.
        this.message.hidden = !parameter.error;
        this.message.textContent = parameter.error ? parameter.errorMessage : '';
    }

    /**
     * Icons are created once per shape/count change, never per `updateView` —
     * recreating them would drop focus mid-keyboard-interaction.
     */
    private buildIcons(shape: Shape): void {
        if (this.icons.length === this.max && this.shape === shape) {
            return;
        }

        this.shape = shape;
        this.group.textContent = '';
        this.icons = [];

        for (let index = 0; index < this.max; index += 1) {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('class', 'StarRating-icon');
            svg.dataset.index = String(index + 1);

            // Two paths, clipped left/right, so a half value is one icon rather
            // than a separate half-icon asset per shape.
            for (const half of ['full', 'half'] as const) {
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', PATHS[shape]);
                path.setAttribute('class', `StarRating-path StarRating-path--${half}`);
                svg.appendChild(path);
            }

            this.group.appendChild(svg);
            this.icons.push(svg);
        }
    }

    // ------------------------------------------------------------------ inputs

    private onClick = (event: MouseEvent): void => {
        const position = this.positionFrom(event);

        if (position !== null) {
            this.commit(position === this.value ? null : position);
        }
    };

    private onHover = (event: MouseEvent): void => {
        const position = this.positionFrom(event);

        for (const [index, icon] of this.icons.entries()) {
            icon.classList.toggle('is-preview', position !== null && index + 1 <= position);
        }
    };

    private onHoverEnd = (): void => {
        for (const icon of this.icons) {
            icon.classList.remove('is-preview');
        }
    };

    private onClear = (): void => {
        this.commit(null);
    };

    private onKeyDown = (event: KeyboardEvent): void => {
        if (!this.interactive) {
            return;
        }

        // In an RTL layout the arrow that points at the next icon is the one
        // pointing left, so the horizontal keys swap and the vertical ones do
        // not. Getting this wrong is invisible to an LTR reviewer.
        const forward = this.container.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
        const backward = this.container.dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';

        const current = this.value ?? 0;
        let next: number | null;

        switch (event.key) {
            case forward:
            case 'ArrowUp':
                next = Math.min(this.max, current + this.step);
                break;
            case backward:
            case 'ArrowDown':
                next = Math.max(0, current - this.step) || null;
                break;
            case 'Home':
                next = this.step;
                break;
            case 'End':
                next = this.max;
                break;
            case 'Delete':
            case 'Backspace':
                next = null;
                break;
            case ' ':
            case 'Enter':
                next = current === 0 ? this.step : current;
                break;
            default:
                return;
        }

        event.preventDefault();
        this.commit(next);
        this.focusCurrent();
    };

    private commit(next: number | null): void {
        if (!this.interactive || next === this.value) {
            return;
        }

        this.value = next;

        // Only on a user change. The platform calling `updateView` with a new
        // value is not something to notify back at it.
        this.notifyOutputChanged();
    }

    // ----------------------------------------------------------------- helpers

    /**
     * `allowHalf` is the maker's declaration, and it stands unless the platform
     * definitively contradicts it.
     *
     * The type string is compared **exactly**, never substring-matched. For a
     * type-grouped property a host may report the *group's accepted types*
     * rather than the resolved member — a string naming every type in the
     * group, whichever column is actually bound. A loose test like
     * `/decimal/i` would then match on a Whole Number column and enable the
     * half step it exists to prevent, which is worse than no check at all.
     *
     * So the comparison vetoes rather than enables. An exact `Whole.None` is
     * proof the column truncates 3.5 to 3, and the half step is refused.
     * Anything else — a resolved `Decimal`, or a group string this control
     * cannot interpret — leaves the maker's setting standing, which is the only
     * answer that behaves correctly on every host.
     */
    private resolveStep(context: ComponentFramework.Context<IInputs>): number {
        if (!context.parameters.allowHalf.raw) {
            return 1;
        }

        return (context.parameters.value.type ?? '').trim() === WHOLE_ONLY ? 1 : 0.5;
    }

    /**
     * The maker's colour, or the default.
     *
     * A custom property accepts *any* string — the CSSOM does not validate it,
     * because a custom property has no type until something substitutes it. So
     * a typo would silently blank the icons, and a value like `url(evil.svg)`
     * would be a live paint server once `fill: var(…)` substitutes it.
     * `CSS.supports` is the browser's own colour parser and rejects both.
     */
    private resolveColor(context: ComponentFramework.Context<IInputs>): string {
        const requested = context.parameters.color.raw?.trim();

        if (!requested) {
            return DEFAULT_COLOR;
        }

        return CSS.supports('color', requested) ? requested : DEFAULT_COLOR;
    }

    /**
     * The maker's `max` cannot exceed what the column can hold. `MaxValue` is
     * real column metadata in a model-driven app and absent in canvas, so it
     * narrows the range when present and is ignored when it is not.
     */
    private resolveMax(context: ComponentFramework.Context<IInputs>): number {
        const requested = context.parameters.max.raw ?? 5;
        const ceiling = context.parameters.value.attributes?.MaxValue;

        const max = ceiling === undefined ? requested : Math.min(requested, Math.floor(ceiling));

        // One icon is a checkbox, and twenty is already past useful.
        return Math.max(1, Math.min(20, Math.floor(max) || 5));
    }

    private clamp(raw: number | null): number | null {
        if (raw === null || Number.isNaN(raw)) {
            return null;
        }

        const snapped = Math.round(raw / this.step) * this.step;

        return Math.max(0, Math.min(this.max, snapped)) || null;
    }

    private fillFor(position: number): 'is-full' | 'is-half' | 'is-empty' {
        const value = this.value ?? 0;

        if (value >= position) {
            return 'is-full';
        }

        return value >= position - 0.5 ? 'is-half' : 'is-empty';
    }

    /** Roving tabindex: exactly one icon is in the tab order at a time. */
    private tabIndexFor(index: number): number {
        if (!this.interactive) {
            return -1;
        }

        const focused = this.value === null ? 1 : Math.ceil(this.value);

        return index + 1 === focused ? 0 : -1;
    }

    private focusCurrent(): void {
        const index = this.value === null ? 0 : Math.ceil(this.value) - 1;

        this.icons[Math.max(0, index)]?.focus();
    }

    private positionFrom(event: MouseEvent): number | null {
        const icon = (event.target as Element | null)?.closest('.StarRating-icon');

        if (!(icon instanceof SVGSVGElement) || icon.dataset.index === undefined) {
            return null;
        }

        const position = Number(icon.dataset.index);

        if (this.step === 1) {
            return position;
        }

        // Left half of the icon is the half step — mirrored under RTL.
        const bounds = icon.getBoundingClientRect();
        const offset = (event.clientX - bounds.left) / bounds.width;
        const leading = this.container.dir === 'rtl' ? 1 - offset : offset;

        return leading <= 0.5 ? position - 0.5 : position;
    }

    /**
     * `context.formatting` rather than `Intl`, so the number matches the rest
     * of the form — a user whose locale writes 3,5 sees 3,5 here too.
     */
    private formatValue(context: ComponentFramework.Context<IInputs>, value: number): string {
        const formatted =
            this.step === 1
                ? context.formatting.formatInteger(value)
                : context.formatting.formatDecimal(value, 1);

        return this.resources
            .getString('StarRating_ValueText')
            .replace('{0}', formatted)
            .replace('{1}', context.formatting.formatInteger(this.max));
    }
}
