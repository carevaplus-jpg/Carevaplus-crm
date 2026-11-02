/* Careva+ website interactions — no dependencies */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ============================================================
     Preloader — lifts away once the page (and logo) has loaded
     ============================================================ */
  var preloader = document.getElementById("preloader");
  if (preloader) {
    if (reduced) {
      preloader.remove();
    } else {
      document.body.classList.add("loading");
      var dismiss = function () {
        preloader.classList.add("done");
        document.body.classList.remove("loading");
        setTimeout(function () {
          if (preloader.parentNode) preloader.remove();
        }, 1100);
      };
      // minimum visible time so it reads as a transition, not a flash
      var ready = false;
      window.addEventListener("load", function () { ready = true; });
      setTimeout(function wait() {
        if (ready) dismiss();
        else setTimeout(wait, 120);
      }, 850);
      // hard fallback — never trap the page behind the curtain
      setTimeout(dismiss, 4000);
    }
  }

  /* ---- current year in footer ---- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ============================================================
     Sticky header + scroll progress bar
     ============================================================ */
  var header = document.getElementById("siteHeader");
  var progress = document.getElementById("scrollProgress");
  var ticking = false;

  var onScroll = function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY;
      header.classList.toggle("scrolled", y > 8);
      if (progress) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.transform = "scaleX(" + (max > 0 ? y / max : 0) + ")";
      }
      ticking = false;
    });
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  /* ============================================================
     Mobile navigation
     ============================================================ */
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

  /* ============================================================
     Reveal on scroll, staggered per group
     ============================================================ */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

  // give siblings an incremental delay so grids cascade
  revealEls.forEach(function (el) {
    var parent = el.parentNode;
    var sibs = Array.prototype.filter.call(parent.children, function (c) {
      return c.classList && c.classList.contains("reveal");
    });
    if (sibs.length > 1) el.style.setProperty("--i", sibs.indexOf(el));
  });

  if ("IntersectionObserver" in window && !reduced) {
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
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("visible"); });
  }

  /* ============================================================
     Animated counters
     ============================================================ */
  var counters = document.querySelectorAll("[data-count]");
  var runCounter = function (el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    if (reduced) { el.textContent = target; return; }
    var duration = 1300;
    var start = null;
    var step = function (ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
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
    counters.forEach(function (el) { cio.observe(el); });
  } else {
    counters.forEach(function (el) { el.textContent = el.getAttribute("data-count"); });
  }

  /* ============================================================
     Active link highlighting as sections pass under the header
     ============================================================ */
  var navLinks = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);

  if (sections.length && "IntersectionObserver" in window) {
    var sio = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          navLinks.forEach(function (a) {
            a.classList.toggle("active", a.getAttribute("href") === "#" + entry.target.id);
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach(function (s) { sio.observe(s); });
  }

  /* ============================================================
     Forms
     Front-end only. Enquiries are stored in localStorage so the
     Careva+ CRM can pick them up locally. Connect a backend or an
     email service to receive them for real.
     ============================================================ */
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
