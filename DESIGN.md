# Design System

<!-- impeccable:design-schema 1 -->

## Direction

Linea Bar is an operational field log: calm, high-contrast surfaces designed for reading a technical history quickly at a client site. Blue marks navigation, primary actions, and machine context; status colours are reserved for meaningful work states.

## Tokens

- Canvas: `#f5f7fa`; surface: white; ink: `#10223d`; secondary text: `#66758a`.
- Primary: `#145dd7`; primary pale: `#ebf3ff`; service cyan: `#0a9bb3`; attention orange: `#c56c07`.
- Type: Manrope for headings and metrics, DM Sans for controls and operational copy.
- Spacing uses 4 px increments; panels use a 14 px radius; touch targets are at least 44 px.
- The light and dark variables live in `frontend/src/estilos/tokens.css`; the theme is applied through the `data-theme` attribute on `html` and persisted in local storage.

## Interaction

The persistent floating action opens the two most frequent tasks: a receipt-backed intervention or an independent maintenance record. The receipt form is a three-stage bottom sheet on mobile, keeping entry focused while retaining a clear cancellation path.

## Responsive Behavior

Desktop uses a fixed left task rail and two-column operational overview. At 720 px, this becomes a compact top bar plus a four-item bottom navigation; detailed scheduling moves out of the dashboard and remains available in its dedicated route.
