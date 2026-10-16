# Frontend App Design Rules

These are the binding design and UX conventions for this project. Read this
before writing or changing any UI. When a request conflicts with a rule here,
flag it rather than quietly breaking the rule.

## Typography

- Use **Inter** for essentially all text: UI, labels, headings, body.
- Use a **monospace** face (inter has tabular and mono variants where available) only for metadata about
  things (dimensions, capture data, file info, and similar technical values, only if they are needed).
- Do not use a monospace font anywhere else unless it is explicitly requested.
- Do not use all-caps micro labels (tiny uppercase text). Use normal sentence
  case at a readable size.

## Styling

- Style with **Tailwind classes**. Reach for utility classes first.
- When a class pattern repeats, **abstract it into a reusable component**.
  Favor long term simplicity over short term cleverness. A small, obvious
  component beats a clever one nobody can read later.
- Keep bespoke CSS files for genuinely structural pieces only (for example the
  title bar). Everything routine should be Tailwind.

## Icons

- Use **Lucide** icons, and only Lucide, for iconography.
- Do not use inline text based unicode glyphs as icons.
- Subtle color on an icon is fine in specific, justified action-call situations. Never
  overdo it. The default is neutral, monochrome icons.

## Anti patterns to avoid

- No decorative "ping" or pulsing status dots.
- No "chips" or pill badges sprinkled around to surface state.
- No tiny all caps labels.
- No monospace where it is not warranted.
- No em dashes in copy or in code comments. Use commas, parentheses, or
  separate sentences.
- No inline text based unicode icons.

## Writing for the interface

- Keep UX copy plain and human. Avoid technical language when describing
  actions.
- **Never reveal backend behavior or implementation lingo** in the interface.
  The user does not need to know how something works internally.

  Good: "Drop images here"
  Avoid: "Drop images here to index asynchronously"

  Describe what the person gets, not what the system does.

## Working practices

- **Never run the UI to "verify" a change by launching it and then polling,
  sleeping, or reading log output to guess what happened.** It does not work and
  it wastes time. The human runs the app and looks at it.
- For backend or pure-logic changes, a quick static check is fine: type-check,
  syntax-check, import-check, or a small direct unit-style call. Confirm the
  code is internally consistent and hand it back. Leave the visual and
  interactive verification to the human.