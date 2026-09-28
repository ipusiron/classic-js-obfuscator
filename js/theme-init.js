/* Apply the saved theme before CSS and body content can be painted. */
(function () {
  "use strict";
  let theme = "dark";
  try {
    if (localStorage.getItem("theme") === "light") theme = "light";
  } catch { /* Unavailable storage keeps the existing dark default. */ }
  document.documentElement.setAttribute("data-theme", theme);
})();
