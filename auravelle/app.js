/* ============================================================
   Auravelle — Kojiba
   Parallax, scroll reveals, cart and PWA. No dependencies.
   ============================================================ */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var CURRENCY = "₹";
  var money = function (n) { return CURRENCY + n.toLocaleString("en-IN"); };

  /* ---- current year ---- */
  var y = document.querySelector("[data-year]");
  if (y) y.textContent = new Date().getFullYear();

  /* ============================================================
     Sticky header
     ============================================================ */
  var header = document.getElementById("siteHeader");
  var onScrollHeader = function () {
    if (header) header.classList.toggle("scrolled", window.scrollY > 8);
  };

  /* ============================================================
     Mobile nav
     ============================================================ */
  var nav = document.getElementById("nav");
  var navStrip = document.getElementById("navStrip");
  var navToggle = document.getElementById("navToggle");
  if (nav && navToggle) {
    var closeNav = function () {
      nav.classList.remove("open");
      if (navStrip) navStrip.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Open menu");
    };
    navToggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      if (navStrip) navStrip.classList.toggle("open", open);
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    nav.addEventListener("click", function (e) { if (e.target.tagName === "A") closeNav(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeNav(); });
  }

  /* ---- skip link: move real focus, leave the URL alone ---- */
  var skip = document.querySelector(".skip-link");
  var mainEl = document.getElementById("main");
  if (skip && mainEl) {
    skip.addEventListener("click", function (e) {
      e.preventDefault();
      mainEl.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    });
  }

  /* ============================================================
     PARALLAX

     Every [data-depth] element inside a [data-parallax-root] is
     translated against the scroll position, by a fraction of how far
     its section has travelled through the viewport. Positions are
     read once per frame and written in one batch, so the browser is
     never asked to interleave layout reads and writes.
     ============================================================ */
  var layers = [];
  var ticking = false;

  var collectLayers = function () {
    layers = [];
    if (reduced) return;
    document.querySelectorAll("[data-parallax-root]").forEach(function (root) {
      root.querySelectorAll("[data-depth]").forEach(function (el) {
        var depth = parseFloat(el.getAttribute("data-depth")) || 0.1;
        layers.push({ el: el, root: root, depth: depth, last: null });
      });
    });
  };

  var applyParallax = function () {
    var vh = window.innerHeight;
    for (var i = 0; i < layers.length; i++) {
      var L = layers[i];
      var r = L.root.getBoundingClientRect();
      // skip anything comfortably off screen
      if (r.bottom < -200 || r.top > vh + 200) continue;
      // -1 when the section is entering, +1 when it has left
      var progress = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
      var shift = Math.round(progress * L.depth * 160 * 10) / 10;
      if (shift !== L.last) {
        L.el.style.transform = "translate3d(0," + shift + "px,0)";
        L.last = shift;
      }
    }
  };

  var onScroll = function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      onScrollHeader();
      applyParallax();
      ticking = false;
    });
  };

  collectLayers();
  onScrollHeader();
  if (!reduced) applyParallax();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () { collectLayers(); onScroll(); });

  /* ============================================================
     Scroll reveals, staggered per group
     ============================================================ */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
  revealEls.forEach(function (el) {
    var sibs = Array.prototype.filter.call(el.parentNode.children, function (c) {
      return c.hasAttribute && c.hasAttribute("data-reveal");
    });
    if (sibs.length > 1) el.style.setProperty("--i", sibs.indexOf(el));
  });
  if ("IntersectionObserver" in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("is-in");
        io.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ============================================================
     Toast
     ============================================================ */
  var toastEl = document.querySelector("[data-toast]");
  var toastTimer;
  var toast = function (msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.hidden = false;
    requestAnimationFrame(function () { toastEl.classList.add("is-on"); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("is-on");
      setTimeout(function () { toastEl.hidden = true; }, 320);
    }, 2600);
  };

  /* ============================================================
     CART

     Lines are kept in localStorage so the bag survives a reload and
     works offline. It holds only product choices — never a name,
     address or payment detail.
     ============================================================ */
  var CART_KEY = "auravelle.cart.v1";
  var PACK_IMG = "assets/kojiba-pack-480.jpg";

  var readCart = function () {
    try {
      var raw = JSON.parse(localStorage.getItem(CART_KEY));
      return Array.isArray(raw) ? raw.filter(function (l) {
        return l && typeof l.id === "string" && typeof l.price === "number" && l.qty > 0;
      }) : [];
    } catch (err) {
      return [];
    }
  };
  var writeCart = function (lines) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(lines)); } catch (err) { /* storage blocked */ }
  };

  var cart = readCart();
  var countEls = document.querySelectorAll("[data-cart-count]");
  var itemsEl = document.querySelector("[data-cart-items]");
  var footEl = document.querySelector("[data-cart-foot]");
  var totalEl = document.querySelector("[data-cart-total]");

  var cartCount = function () {
    return cart.reduce(function (n, l) { return n + l.qty; }, 0);
  };
  var cartTotal = function () {
    return cart.reduce(function (n, l) { return n + l.price * l.qty; }, 0);
  };

  var renderCart = function () {
    var n = cartCount();
    countEls.forEach(function (el) {
      el.textContent = n;
      el.hidden = n === 0;
    });
    if (!itemsEl) return;

    if (!cart.length) {
      itemsEl.innerHTML = '<p class="cart-empty">Your bag is empty.</p>';
      if (footEl) footEl.hidden = true;
      return;
    }

    itemsEl.innerHTML = cart.map(function (l, i) {
      return '<div class="cart-line">' +
          '<img src="' + PACK_IMG + '" width="64" height="69" alt="" />' +
          '<div>' +
            '<h3>Kojiba</h3>' +
            '<p class="cl-meta">' + escapeHtml(l.name) + ' · ' + l.bars + ' × 75 g</p>' +
            '<div class="cl-controls">' +
              '<button type="button" data-dec="' + i + '" aria-label="Decrease">−</button>' +
              '<span>' + l.qty + '</span>' +
              '<button type="button" data-inc="' + i + '" aria-label="Increase">+</button>' +
            '</div><br />' +
            '<button type="button" class="cl-remove" data-rm="' + i + '">Remove</button>' +
          '</div>' +
          '<span class="cl-price">' + money(l.price * l.qty) + '</span>' +
        '</div>';
    }).join("");

    if (footEl) footEl.hidden = false;
    if (totalEl) totalEl.textContent = money(cartTotal());
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var addToCart = function (line) {
    var found = null;
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === line.id) { found = cart[i]; break; }
    }
    if (found) found.qty += line.qty;
    else cart.push(line);
    writeCart(cart);
    renderCart();
  };

  if (itemsEl) {
    itemsEl.addEventListener("click", function (e) {
      var t = e.target.closest("button");
      if (!t) return;
      var inc = t.getAttribute("data-inc"), dec = t.getAttribute("data-dec"), rm = t.getAttribute("data-rm");
      if (inc !== null) cart[+inc].qty += 1;
      else if (dec !== null) { cart[+dec].qty -= 1; if (cart[+dec].qty < 1) cart.splice(+dec, 1); }
      else if (rm !== null) cart.splice(+rm, 1);
      else return;
      writeCart(cart);
      renderCart();
    });
  }

  /* ---- drawer ---- */
  var drawer = document.getElementById("cartDrawer");
  var scrim = document.querySelector("[data-cart-scrim]");
  var cartButton = document.getElementById("cartButton");
  var lastFocus = null;

  var openCart = function () {
    if (!drawer) return;
    lastFocus = document.activeElement;
    drawer.hidden = false;
    if (scrim) scrim.hidden = false;
    document.body.style.overflow = "hidden";
    var close = drawer.querySelector("[data-cart-close]");
    if (close) close.focus();
  };
  var closeCart = function () {
    if (!drawer || drawer.hidden) return;
    drawer.hidden = true;
    if (scrim) scrim.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  };
  if (cartButton) cartButton.addEventListener("click", openCart);
  if (scrim) scrim.addEventListener("click", closeCart);
  document.querySelectorAll("[data-cart-close]").forEach(function (b) {
    b.addEventListener("click", closeCart);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeCart();
    // keep tabbing inside the drawer while it is open
    if (e.key === "Tab" && drawer && !drawer.hidden) {
      var f = drawer.querySelectorAll('button, [href], input, select, textarea');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---- product form ---- */
  var form = document.querySelector("[data-add-form]");
  if (form) {
    var priceDisplay = document.querySelector("[data-price-display]");
    var qtyInput = form.querySelector("[data-qty-input]");

    var currentVariant = function () {
      return form.querySelector("[data-variant]:checked") || form.querySelector("[data-variant]");
    };
    var priceEls = document.querySelectorAll("[data-price-display]");
    var offEls = document.querySelectorAll("[data-off]");
    var syncPrice = function () {
      var v = currentVariant();
      if (!v) return;
      var price = +v.getAttribute("data-price");
      var mrp = +v.getAttribute("data-mrp") || price;
      priceEls.forEach(function (el) { el.textContent = money(price); });
      var pct = mrp > price ? Math.round((mrp - price) / mrp * 100) : 0;
      offEls.forEach(function (el) {
        el.textContent = pct ? pct + "% off" : "";
        el.hidden = !pct;
      });
    };
    form.querySelectorAll("[data-variant]").forEach(function (r) {
      r.addEventListener("change", syncPrice);
    });
    syncPrice();

    var clampQty = function () {
      var n = parseInt(qtyInput.value, 10);
      if (isNaN(n) || n < 1) n = 1;
      if (n > 20) n = 20;
      qtyInput.value = n;
      return n;
    };
    var up = form.querySelector("[data-qty-up]"), down = form.querySelector("[data-qty-down]");
    if (up) up.addEventListener("click", function () { qtyInput.value = clampQty() + 1; clampQty(); });
    if (down) down.addEventListener("click", function () { qtyInput.value = clampQty() - 1; clampQty(); });
    if (qtyInput) qtyInput.addEventListener("change", clampQty);

    var buildLine = function () {
      var v = currentVariant();
      if (!v) return null;
      return {
        id: v.value,
        name: v.getAttribute("data-name"),
        price: +v.getAttribute("data-price"),
        bars: +v.getAttribute("data-qty"),
        qty: clampQty()
      };
    };

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var line = buildLine();
      if (!line) return;
      addToCart(line);
      openCart();   // the drawer is the confirmation; a toast would cover its footer
    });

    var buyNow = form.querySelector("[data-buy-now]");
    if (buyNow) {
      buyNow.addEventListener("click", function () {
        var line = buildLine();
        if (!line) return;
        addToCart(line);
        checkout();
      });
    }

    /* ---- PIN code check ----
       No courier is connected yet, so this only validates the format and
       confirms that our team will confirm delivery for that PIN. */
    var pin = document.querySelector("[data-pin]");
    var pinBtn = document.querySelector("[data-pin-check]");
    var pinNote = document.querySelector("[data-pin-note]");
    var checkPin = function () {
      if (!pin || !pinNote) return;
      var v = pin.value.replace(/\s+/g, "");
      if (!/^[1-9][0-9]{5}$/.test(v)) {
        pinNote.textContent = "Please enter a valid 6-digit PIN code.";
        pinNote.className = "pin-note err";
        return;
      }
      pinNote.textContent = "Our team will confirm delivery time and charges for " + v + " before dispatch.";
      pinNote.className = "pin-note ok";
    };
    if (pinBtn) pinBtn.addEventListener("click", checkPin);
    if (pin) pin.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); checkPin(); } });
  }

  /* ---- product thumbnails ---- */
  var thumbs = document.querySelectorAll(".media-thumbs .thumb");
  var mainMedia = document.querySelector(".media-main");
  if (thumbs.length && mainMedia) {
    thumbs.forEach(function (t) {
      t.addEventListener("click", function () {
        thumbs.forEach(function (o) { o.classList.remove("is-active"); });
        t.classList.add("is-active");
        var pic = t.querySelector("picture");
        if (pic) mainMedia.innerHTML = pic.outerHTML;
      });
    });
  }

  /* ============================================================
     Checkout

     No payment provider is connected yet, so the order is handed to
     WhatsApp as an itemised message. Swapping in a real gateway
     later only replaces this handler.
     ============================================================ */
  var WHATSAPP = document.documentElement.getAttribute("data-whatsapp") ||
                 "https://wa.me/919655573574";
  var checkoutBtn = document.querySelector("[data-checkout]");
  var checkoutNote = document.querySelector("[data-checkout-note]");
  if (checkoutNote) {
    checkoutNote.textContent = "Online payment is coming soon. For now your order reaches us on " +
      "WhatsApp and we confirm it with you before dispatch.";
  }
  function checkout() {
    if (!cart.length) return;
    var lines = cart.map(function (l) {
      return "• " + l.name + " × " + l.qty + " — " + money(l.price * l.qty);
    });
    var msg = ["Hello Auravelle, I'd like to order Kojiba:", ""]
      .concat(lines, ["", "Total: " + money(cartTotal())]).join("\n");
    window.open(WHATSAPP + "?text=" + encodeURIComponent(msg), "_blank", "noopener");
  }
  if (checkoutBtn) checkoutBtn.addEventListener("click", checkout);

  /* ---- header search: no catalogue to search yet, so go to the product ---- */
  var searchForm = document.querySelector("[data-search]");
  if (searchForm) {
    searchForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = (searchForm.querySelector("input").value || "").trim().toLowerCase();
      var hit = ["kojiba", "soap", "kojic", "niacinamide", "jojoba", "licorice", "brightening"]
        .some(function (w) { return q.indexOf(w) !== -1 || w.indexOf(q) !== -1 && q.length > 2; });
      location.href = hit || !q ? "kojiba.html" : "faq.html";
    });
  }

  renderCart();

  /* ============================================================
     Contact form — no backend yet
     ============================================================ */
  var enquiry = document.querySelector("[data-form]");
  if (enquiry) {
    var note = enquiry.querySelector("[data-note]");
    enquiry.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = {};
      new FormData(enquiry).forEach(function (v, k) { data[k] = String(v).trim(); });
      if (!data.name || !data.phone) {
        note.textContent = "Please add your name and phone number.";
        note.className = "form-note err";
        return;
      }
      var text = ["Hello Auravelle,", "", "Name: " + data.name, "Phone: " + data.phone]
        .concat(data.email ? ["Email: " + data.email] : [], data.message ? ["", data.message] : [])
        .join("\n");
      window.open(WHATSAPP + "?text=" + encodeURIComponent(text), "_blank", "noopener");
      note.textContent = "Thank you — your message is ready to send in WhatsApp.";
      note.className = "form-note ok";
      enquiry.reset();
    });
  }

  /* ============================================================
     PWA — service worker and install prompt
     ============================================================ */
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {
        /* registration is an enhancement; the site works without it */
      });
    });
  }

  var deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    if (sessionStorage.getItem("auravelle.install.dismissed")) return;

    var bar = document.createElement("div");
    bar.className = "install-bar";
    bar.innerHTML = '<p>Add Auravelle to your home screen</p>' +
      '<span><button class="btn btn-primary" type="button" data-install>Install</button>' +
      '<button class="icon-button" type="button" data-install-close aria-label="Dismiss">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" ' +
      'stroke-width="1.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></span>';
    document.body.appendChild(bar);

    bar.querySelector("[data-install]").addEventListener("click", function () {
      bar.remove();
      deferredPrompt.prompt();
      deferredPrompt = null;
    });
    bar.querySelector("[data-install-close]").addEventListener("click", function () {
      bar.remove();
      try { sessionStorage.setItem("auravelle.install.dismissed", "1"); } catch (err) {}
    });
  });
})();
