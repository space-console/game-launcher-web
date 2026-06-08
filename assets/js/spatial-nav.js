// Geometry-based spatial navigation.
//
// TV remotes only emit up/down/left/right. Rather than hard-coding a grid,
// we pick the nearest focusable element in the pressed direction using the
// on-screen rectangles. This works for any layout and survives resizing,
// reflow, and dynamically added tiles.

const FOCUSABLE = "[data-focusable]";

export class SpatialNav {
  constructor(root = document) {
    this.root = root;
    this.current = null;
  }

  items() {
    return Array.from(this.root.querySelectorAll(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null /* visible */
    );
  }

  /** Focus a specific element, updating styling and scrolling it into view. */
  focus(el) {
    if (!el || el === this.current) return;
    if (this.current) this.current.classList.remove("is-focused");
    el.classList.add("is-focused");
    el.focus({ preventScroll: true });
    this.scrollIntoView(el);
    this.current = el;
    el.dispatchEvent(new CustomEvent("sn:focus", { bubbles: true }));
  }

  /** Focus the first item, or restore focus if it was lost. */
  focusInitial() {
    if (this.current && this.current.offsetParent !== null) {
      this.focus(this.current);
      return;
    }
    const items = this.items();
    if (items.length) this.focus(items[0]);
  }

  /** Move focus in a direction: "up" | "down" | "left" | "right". */
  move(dir) {
    const items = this.items();
    if (!items.length) return;
    if (!this.current) return this.focus(items[0]);

    const from = rectCenter(this.current.getBoundingClientRect());
    let best = null;
    let bestScore = Infinity;

    for (const el of items) {
      if (el === this.current) continue;
      const to = rectCenter(el.getBoundingClientRect());
      const dx = to.x - from.x;
      const dy = to.y - from.y;

      // Reject candidates not in the pressed direction.
      if (dir === "left" && dx >= -1) continue;
      if (dir === "right" && dx <= 1) continue;
      if (dir === "up" && dy >= -1) continue;
      if (dir === "down" && dy <= 1) continue;

      // Score = primary-axis distance + heavy penalty for off-axis drift,
      // so we prefer the closest element roughly in line with the cursor.
      const primary = dir === "left" || dir === "right" ? Math.abs(dx) : Math.abs(dy);
      const offAxis = dir === "left" || dir === "right" ? Math.abs(dy) : Math.abs(dx);
      const score = primary + offAxis * 2.5;

      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    }

    if (best) this.focus(best);
  }

  /** Activate (launch / select) the focused element. */
  activate() {
    if (this.current) this.current.click();
  }

  scrollIntoView(el) {
    // Keep the focused tile comfortably away from screen edges (overscan-safe).
    el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }
}

function rectCenter(r) {
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
