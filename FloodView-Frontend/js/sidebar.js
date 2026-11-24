"use strict";
(() => {
  const sidebar = document.getElementById("fv-sidebar");
  const toggle = document.getElementById("sidebar-toggle");
  const backdrop = document.getElementById("sidebar-backdrop");
  const close = document.getElementById("sidebar-close");
  document.getElementById("nav-dashboard").setAttribute("aria-current", "page");
  const mobile = () => window.innerWidth < 1024;
  function setOpen(open, restoreFocus = true) {
    open = mobile() && open;
    document.body.classList.toggle("sidebar-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    sidebar.inert = mobile() && !open;
    backdrop.hidden = !open;
    if (open) close.focus();
    else if (restoreFocus && sidebar.contains(document.activeElement))
      toggle.focus();
  }
  toggle.addEventListener("click", () =>
    setOpen(!document.body.classList.contains("sidebar-open")),
  );
  close.addEventListener("click", () => setOpen(false));
  backdrop.addEventListener("click", () => setOpen(false));
  sidebar.querySelector("nav").addEventListener("click", (event) => {
    if (event.target.closest("button")) setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (!document.body.classList.contains("sidebar-open")) return;
    if (event.key === "Escape") setOpen(false);
    if (event.key === "Tab") {
      const items = [...sidebar.querySelectorAll("a[href], button")];
      const first = items[0],
        last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  window.addEventListener("resize", () => setOpen(false, false));
  setOpen(false, false);
})();
