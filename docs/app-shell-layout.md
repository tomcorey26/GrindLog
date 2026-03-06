# App Shell Layout

Viewport-locked layout with fixed header/tabs and a bounded scrollable content area.

## The layout chain

```
div.h-dvh.flex.flex-col                                       <- 1. viewport lock
  div.max-w-md.w-full.mx-auto.flex.flex-col.flex-1.min-h-0   <- 2. centered column
    header (fixed size)                                        <- 3. header/tabs
    TabNav (fixed size)                                        <- 3.
    main.flex-1.min-h-0.overflow-auto.flex.flex-col            <- 4. content area
      {children}                                               <- 5. page content
```

### 1. Viewport lock

`h-dvh flex flex-col`

- `h-dvh` sets height to exactly the dynamic viewport height. This is the anchor — everything inside must fit within this box. Without a fixed height here, `flex-1` on children has nothing to fill.
- `flex flex-col` stacks children vertically, enabling flex-1.
- `dvh` instead of `vh` because `dvh` updates dynamically as mobile browser chrome (address bar) appears/disappears.

### 2. Centered column

`max-w-md w-full mx-auto flex flex-col flex-1 min-h-0`

- `max-w-md w-full mx-auto` caps width at 448px, centers it.
- `flex flex-col flex-1` fills the full height of layer 1, stacks its own children vertically.
- `min-h-0` overrides the default `min-height: auto`. Without this, the flex child would refuse to be shorter than its content, growing past its parent and breaking the viewport lock.

### 3. Header and tabs

`px-4 pt-6 pb-4` / `px-4 pb-2`

Fixed-size elements that take whatever height they need. The remaining space goes to `<main>`.

`px-4` is on each section individually (header, tabs, main) instead of the wrapper so that `overflow-auto` on main doesn't have its scrollbar inset from the edge.

### 4. Content area (main)

`flex-1 min-h-0 overflow-auto flex flex-col px-4 pb-[env(safe-area-inset-bottom)]`

- `flex-1` takes all remaining height after header and tabs.
- `min-h-0` allows main to be constrained by its parent instead of growing with content.
- `overflow-auto` makes scrollable pages work — content taller than main gets a scrollbar. Header and tabs stay pinned because they're outside this scroll container.
- `flex flex-col` makes main a flex column so children can use `flex-1` to fill it. This enables FullHeight pages.
- `pb-[env(safe-area-inset-bottom)]` adds bottom padding for the home indicator on notched iPhones.

### 5. Page content

**Scrollable pages** (Dashboard, Sessions, Rankings) render normally. If content is tall, main scrolls. No changes needed.

**Full-height pages** (TimerView, StartTimerModal) use the `<FullHeight>` component.

## FullHeight component

```
div.flex-1.flex.flex-col.min-h-0
```

- `flex-1` fills the remaining space in main.
- `flex flex-col` so its children can use flex layout (justify-center for centering, nested flex-1 sections, etc).
- `min-h-0` allows it to be constrained by main.

## The min-h-0 pattern

Every flex child in the chain needs `min-h-0` if it should be constrained by its parent. Flex children default to `min-height: auto` which means "never be shorter than my content." This breaks the height constraint — the child grows past its parent.

`min-h-0` says "I'm allowed to shrink to 0" so the parent's fixed height is respected.

**Rule: if a flex child has `flex-1` and its parent has a fixed height, add `min-h-0`.**
