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
  // Only plain "#section-id" links point at an element. Hash-route links such
  // as "#/services" are navigation, not selectors, and must be skipped — and
  // any unknown id simply yields no section.
  var navLinks = Array.prototype.slice
    .call(nav.querySelectorAll('a[href^="#"]'))
    .filter(function (a) { return /^#[A-Za-z][\w-]*$/.test(a.getAttribute("href")); });
  var sections = navLinks
    .map(function (a) {
      try {
        return document.querySelector(a.getAttribute("href"));
      } catch (err) {
        return null;
      }
    })
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

     Over http(s) the enquiry is POSTed to FormSubmit, which emails the
     care team. FormSubmit refuses submissions from pages opened as local
     files, and it also refuses until the address has been confirmed, so
     in either case the form falls back to handing the visitor a ready-made
     WhatsApp or email message containing everything they typed. Nothing is
     ever lost, and nothing has to be retyped.
     ============================================================ */
  var CFG = window.CAREVA_CONFIG || {};
  var STORE_KEY = "carevaEnquiries";
  var served = location.protocol === "http:" || location.protocol === "https:";

  var backup = function (data) {
    try {
      var list = JSON.parse(localStorage.getItem(STORE_KEY)) || [];
      list.push(data);
      localStorage.setItem(STORE_KEY, JSON.stringify(list));
    } catch (err) {
      /* private mode or blocked storage — delivery does not depend on this */
    }
  };

  var LABELS = {
    name: "Name", phone: "Phone", email: "Email", service: "Service",
    duration: "Duration", area: "Area", message: "Details"
  };

  var compose = function (data) {
    var lines = ["New care enquiry from the Careva+ website", ""];
    Object.keys(LABELS).forEach(function (key) {
      if (data[key]) lines.push(LABELS[key] + ": " + data[key]);
    });
    return lines.join("\n");
  };

  /* Render WhatsApp / email buttons pre-filled with the enquiry. */
  var offerFallback = function (form, note, data, reason) {
    var text = compose(data);
    var box = form.querySelector("[data-fallback]");
    if (!box) {
      box = document.createElement("div");
      box.setAttribute("data-fallback", "");
      box.className = "send-options";
      note.parentNode.insertBefore(box, note.nextSibling);
    }

    var wa = CFG.whatsapp
      ? '<a class="btn btn-whatsapp btn-block" target="_blank" rel="noopener" href="' +
        CFG.whatsapp + "?text=" + encodeURIComponent(text) + '">Send on WhatsApp</a>'
      : "";
    var mail = CFG.email
      ? '<a class="btn btn-navy btn-block" href="mailto:' + CFG.email +
        "?subject=" + encodeURIComponent("New care enquiry from the website") +
        "&body=" + encodeURIComponent(text) + '">Send by email</a>'
      : "";
    var call = CFG.phoneTel
      ? '<a class="btn btn-ghost btn-block" href="tel:' + CFG.phoneTel + '">Call ' +
        (CFG.phone || "us") + "</a>"
      : "";

    box.innerHTML =
      '<p class="send-options-title">Your enquiry is ready — choose how to send it:</p>' +
      wa + mail + call +
      '<p class="send-options-note">' + reason + "</p>";
    box.classList.remove("is-open");
    void box.offsetWidth;          // restart the entrance animation
    box.classList.add("is-open");
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
    var clearFallback = function () {
      var box = form.querySelector("[data-fallback]");
      if (box) box.remove();
    };

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var fd = new FormData(form);
      var data = {};
      fd.forEach(function (value, key) {
        data[key] = typeof value === "string" ? value.trim() : value;
      });

      if (data._honey) return;                       // bots only

      if (!data.name || !data.phone) {
        say("Please enter your name and phone number.", "err");
        return;
      }

      clearFallback();
      data.source = form.getAttribute("data-form");
      data.receivedAt = new Date().toISOString();
      backup(data);

      // Opened as a local file, or no endpoint configured: skip the request
      // that cannot succeed and go straight to the options that can.
      if (!served || !CFG.endpoint) {
        say("Almost there, " + data.name.split(" ")[0] + ".", "ok");
        offerFallback(form, note, data,
          "This page is open from a file on your device, so it cannot send email by itself. Any option above sends your details straight to our care team.");
        return;
      }

      fd.set("Page", document.title);
      fd.set("Submitted at", new Date().toLocaleString());

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
          if (body && String(body.success) === "true") {
            say("Thank you, " + data.name.split(" ")[0] +
                ". Your request has reached our care team — an advisor will call you shortly.", "ok");
            form.reset();
            return;
          }
          say("Almost there, " + data.name.split(" ")[0] + ".", "ok");
          offerFallback(form, note, data,
            "Our email service could not accept this request just now. Any option above reaches us immediately.");
        })
        .catch(function () {
          say("Almost there, " + data.name.split(" ")[0] + ".", "ok");
          offerFallback(form, note, data,
            "We could not reach our server — your connection may be offline. Any option above reaches us immediately.");
        })
        .then(function () {
          busy(false);
        });
    });
  });
})();
