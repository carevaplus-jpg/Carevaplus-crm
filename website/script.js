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
     Forms — submitted to FormSubmit, which emails the care team.
     Config comes from window.CAREVA_CONFIG (written by build.py).
     Every enquiry is also kept in localStorage as a local backup, so
     nothing is lost if the network call fails.
     ============================================================ */
  var CFG = window.CAREVA_CONFIG || {};
  var STORE_KEY = "carevaEnquiries";

  var backup = function (data) {
    try {
      var list = JSON.parse(localStorage.getItem(STORE_KEY)) || [];
      list.push(data);
      localStorage.setItem(STORE_KEY, JSON.stringify(list));
    } catch (err) {
      /* private mode or blocked storage — the network call still carries it */
    }
  };

  var callUs = function () {
    return CFG.phone
      ? " Please call us on " + CFG.phone + " instead."
      : " Please call our helpline instead.";
  };

  document.querySelectorAll("[data-form]").forEach(function (form) {
    var note = form.querySelector("[data-note]");
    var button = form.querySelector('button[type="submit"]');
    var buttonText = button ? button.textContent : "";

    var say = function (message, kind) {
      note.textContent = message;
      note.className = "form-note " + kind;
    };

    var busy = function (on) {
      if (!button) return;
      button.disabled = on;
      button.textContent = on ? "Sending…" : buttonText;
    };

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var fd = new FormData(form);
      var data = {};
      fd.forEach(function (value, key) {
        data[key] = typeof value === "string" ? value.trim() : value;
      });

      // Bots fill the hidden field; humans never see it.
      if (data._honey) return;

      if (!data.name || !data.phone) {
        say("Please enter your name and phone number.", "err");
        return;
      }

      data.source = form.getAttribute("data-form");
      data.receivedAt = new Date().toISOString();
      fd.set("Page", document.title);
      fd.set("Submitted at", new Date().toLocaleString());

      backup(data);

      if (!CFG.endpoint) {
        say("Thank you, " + data.name.split(" ")[0] + "." + callUs(), "ok");
        form.reset();
        return;
      }

      busy(true);
      say("", "");

      fetch(CFG.endpoint, {
        method: "POST",
        body: fd,
        headers: { Accept: "application/json" }
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; });
        })
        .then(function (body) {
          var ok = body && String(body.success) === "true";
          if (ok) {
            say(
              "Thank you, " + data.name.split(" ")[0] +
                ". Your request has reached our care team — an advisor will call you shortly.",
              "ok"
            );
            form.reset();
          } else {
            // Most common cause: the address has not been activated yet.
            say(
              (body && body.message ? body.message + " " : "We could not send your request just now.") + callUs(),
              "err"
            );
          }
        })
        .catch(function () {
          say("We could not reach our server — your connection may be offline." + callUs(), "err");
        })
        .then(function () {
          busy(false);
        });
    });
  });
})();
