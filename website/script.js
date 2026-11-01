/* Careva+ website interactions — no dependencies */
(function () {
  "use strict";

  /* ---- current year in footer ---- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- sticky header shadow ---- */
  var header = document.getElementById("siteHeader");
  var onScroll = function () {
    header.classList.toggle("scrolled", window.scrollY > 8);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---- mobile navigation ---- */
  var toggle = document.getElementById("navToggle");
  var nav = document.getElementById("nav");
  var closeNav = function () {
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu");
  };
  toggle.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
  nav.addEventListener("click", function (e) {
    if (e.target.tagName === "A") closeNav();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeNav();
  });

  /* ---- reveal on scroll ---- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    revealEls.forEach(function (el) {
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("visible");
    });
  }

  /* ---- animated counters ---- */
  var counters = document.querySelectorAll("[data-count]");
  var runCounter = function (el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    var duration = 1100;
    var start = null;
    var step = function (ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      // ease-out
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if ("IntersectionObserver" in window) {
    var cio = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          runCounter(entry.target);
          cio.unobserve(entry.target);
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach(function (el) {
      cio.observe(el);
    });
  } else {
    counters.forEach(function (el) {
      el.textContent = el.getAttribute("data-count");
    });
  }

  /* ---- forms ----
     Front-end only. Enquiries are stored in localStorage so the Careva+ CRM
     can pick them up locally. Connect a backend or email service to receive
     them for real. */
  var STORE_KEY = "carevaEnquiries";

  var saveEnquiry = function (data) {
    try {
      var list = JSON.parse(localStorage.getItem(STORE_KEY)) || [];
      list.push(data);
      localStorage.setItem(STORE_KEY, JSON.stringify(list));
      return true;
    } catch (err) {
      return false;
    }
  };

  document.querySelectorAll("[data-form]").forEach(function (form) {
    var note = form.querySelector("[data-note]");

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var data = {};
      new FormData(form).forEach(function (value, key) {
        data[key] = typeof value === "string" ? value.trim() : value;
      });

      if (!data.name || !data.phone) {
        note.textContent = "Please enter your name and phone number.";
        note.className = "form-note err";
        return;
      }

      data.source = form.getAttribute("data-form");
      data.receivedAt = new Date().toISOString();

      var stored = saveEnquiry(data);
      note.textContent = stored
        ? "Thank you, " + data.name.split(" ")[0] + ". Your request is saved — a care advisor will call you shortly."
        : "Thank you. Please also call our helpline so we don't miss your request.";
      note.className = "form-note ok";
      form.reset();
    });
  });
})();
