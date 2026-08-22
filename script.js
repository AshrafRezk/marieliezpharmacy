const year = document.getElementById("year");
if (year) year.textContent = String(new Date().getFullYear());

const toggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".site-nav");

if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
    });
  });
}
