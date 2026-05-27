/**
 * Easy VAT product page — Supabase sign-in + backend checkout.
 * Requires js/config.js (copy from config.example.js).
 */
(function () {
  const configErr = document.getElementById("config-error");

  function showConfigError(message) {
    if (!configErr) return;
    configErr.textContent = message;
    configErr.classList.remove("hidden");
  }

  if (window.location.protocol === "file:") {
    showConfigError(
      "This page must be served over http:// or https:// (not opened as a file). From the madnik-website folder run: python3 -m http.server 8080 — then open http://localhost:8080/product/easy-vat/"
    );
    return;
  }

  const cfg = window.EASYVAT_CONFIG;
  if (!cfg?.SUPABASE_URL || !cfg?.SUPABASE_ANON_KEY || !cfg?.API_BASE_URL) {
    showConfigError(
      "Set SUPABASE_ANON_KEY (publishable) and API_BASE_URL in js/config.js."
    );
    return;
  }

  const { createClient } = supabase;
  const client = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: {
      detectSessionInUrl: true,
      persistSession: true,
    },
  });
  const apiBase = cfg.API_BASE_URL.replace(/\/$/, "");

  const el = {
    signedOut: document.getElementById("signed-out"),
    signedIn: document.getElementById("signed-in"),
    userEmail: document.getElementById("user-email"),
    plans: document.getElementById("plans"),
    status: document.getElementById("status"),
    signInGoogle: document.getElementById("sign-in-google"),
    signInApple: document.getElementById("sign-in-apple"),
    signOut: document.getElementById("sign-out"),
  };

  const TIERS = [
    { id: "silver", name: "Silver", price: "£1.99", period: "/month", limit: "10 invoices per month" },
    { id: "gold", name: "Gold", price: "£5.99", period: "/month", limit: "50 invoices per month" },
    { id: "platinum", name: "Platinum", price: "£9.99", period: "/month", limit: "Unlimited invoices" },
  ];

  const TIER_RANK = { demo: 0, silver: 1, gold: 2, platinum: 3, developer: 99 };

  function showStatus(msg, isError) {
    if (!el.status) return;
    el.status.textContent = msg;
    el.status.className = "status-msg" + (isError ? " error" : " ok");
    el.status.hidden = !msg;
  }

  function productBasePath() {
    const path = window.location.pathname.replace(/\/[^/]*$/, "");
    return window.location.origin + path.replace(/\/$/, "") || window.location.origin + "/product/easy-vat";
  }

  function redirectUri() {
    const configured = (cfg.PRODUCT_REDIRECT_URL || "").trim();
    if (configured) return configured;
    const path = window.location.pathname;
    if (path.endsWith(".html")) return window.location.origin + path;
    const dir = path.endsWith("/") ? path : path.replace(/\/?$/, "/");
    return window.location.origin + dir + (dir.endsWith("/") ? "index.html" : "");
  }

  function clearAuthHashFromUrl() {
    if (!window.location.hash || window.location.hash.indexOf("access_token") === -1) return;
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  async function signIn(provider) {
    showStatus("Redirecting to sign in…", false);
    const { error } = await client.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectUri() },
    });
    if (error) showStatus(error.message, true);
  }

  async function signOut() {
    renderSignedOut();
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) showStatus(error.message, true);
  }

  function renderSignedOut() {
    el.signedOut?.classList.remove("hidden");
    el.signedIn?.classList.add("hidden");
    el.plans.innerHTML = "";
    showStatus("", false);
  }

  function renderSignedIn(email) {
    el.signedOut?.classList.add("hidden");
    el.signedIn?.classList.remove("hidden");
    if (el.userEmail) el.userEmail.textContent = email || "";
  }

  async function apiGet(path, token) {
    const res = await fetch(apiBase + path, {
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + token,
      },
    });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (_) {}
    if (!res.ok) {
      const detail = data?.detail || res.statusText;
      throw new Error(typeof detail === "string" ? detail : "request_failed");
    }
    return data;
  }

  async function startCheckout(tier, token) {
    showStatus("Opening secure checkout…", false);
    const base = productBasePath();
    const body = {
      tier,
      success_url: base + "/success.html",
      cancel_url: base + "/cancel.html",
    };
    const res = await fetch(apiBase + "/billing/create-checkout-session", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || "checkout_failed");
    }
    if (!data.url) throw new Error("checkout_missing_url");
    window.location.href = data.url;
  }

  function baselineTier(sub) {
    const t = (sub.tier || "demo").toLowerCase();
    const status = (sub.status || "").toLowerCase();
    const paid = ["silver", "gold", "platinum"];
    if (paid.includes(t) && status !== "active" && status !== "trialing") return "demo";
    return t;
  }

  function shouldShowTier(current, tierId) {
    const cur = TIER_RANK[current] ?? 0;
    const next = TIER_RANK[tierId] ?? 0;
    if (current === "developer") return false;
    if (current === "demo") return true;
    return next > cur;
  }

  function renderPlans(sub, token) {
    const current = baselineTier(sub);
    el.plans.innerHTML = "";
    const any = TIERS.some((t) => shouldShowTier(current, t.id));
    if (!any) {
      el.plans.innerHTML =
        '<p class="plans-all-set">You are on our top plan. Open the Easy VAT app on your phone to manage invoices.</p>';
      return;
    }
    TIERS.forEach((tier) => {
      if (!shouldShowTier(current, tier.id)) return;
      const card = document.createElement("article");
      card.className = "plan-card";
      card.innerHTML =
        '<h3>' +
        tier.name +
        "</h3>" +
        '<p class="plan-price"><span class="amount">' +
        tier.price +
        '</span><span class="period">' +
        tier.period +
        "</span></p>" +
        '<p class="plan-limit">' +
        tier.limit +
        "</p>" +
        '<button type="button" class="btn-plan">Continue to checkout</button>';
      card.querySelector(".btn-plan").addEventListener("click", () => {
        startCheckout(tier.id, token).catch((e) => showStatus(e.message || "Checkout failed", true));
      });
      el.plans.appendChild(card);
    });
  }

  async function refreshSession() {
    const { data } = await client.auth.getSession();
    const session = data?.session;
    if (!session?.access_token) {
      renderSignedOut();
      return;
    }
    clearAuthHashFromUrl();
    const email = session.user?.email || "";
    renderSignedIn(email);
    try {
      const sub = await apiGet("/me/subscription", session.access_token);
      renderPlans(sub, session.access_token);
    } catch (e) {
      showStatus("Could not load subscription: " + (e.message || "error"), true);
    }
  }

  el.signInGoogle?.addEventListener("click", () => signIn("google"));
  el.signInApple?.addEventListener("click", () => signIn("apple"));
  el.signOut?.addEventListener("click", (e) => {
    e.preventDefault();
    signOut();
  });

  client.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session) {
      renderSignedOut();
      return;
    }
    refreshSession();
  });
  refreshSession();
})();
