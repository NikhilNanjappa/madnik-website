# madnik.co.uk static site

Deploy the contents of this folder to your madnik.co.uk web root (Cloudflare Pages, cPanel, etc.).

## Local testing (required for OAuth)

Do **not** open `index.html` by double-clicking (that uses `file://` and breaks links, scripts, and Google/Apple sign-in).

From this folder:

```bash
cp js/config.example.js js/config.js
# Edit js/config.js: set SUPABASE_ANON_KEY (and API_BASE_URL if not using Fly prod)

python3 -m http.server 8080
```

Then open:

- Home: http://localhost:8080/
- Easy VAT: http://localhost:8080/product/easy-vat/

Add `http://localhost:8080/product/easy-vat/` to Supabase **Authentication → URL configuration → Redirect URLs** (same as production).

## Easy VAT product page (production)

- URL: `https://madnik.co.uk/product/easy-vat/`
- Copy `js/config.example.js` → `js/config.js` and set `SUPABASE_ANON_KEY` (public anon key from Supabase → Project Settings → API).

## Supabase Auth redirect URLs

Add to **Authentication → URL configuration → Redirect URLs**:

- `https://madnik.co.uk/product/easy-vat/`
- `http://localhost:8080/product/easy-vat/` (local testing)

## Backend CORS

Add to Fly.io / `.env`:

```env
ALLOWED_ORIGIN=https://madnik.co.uk,https://easy-vat-backend.fly.dev
```

For local web testing also add:

```env
ALLOWED_ORIGIN=https://madnik.co.uk,http://localhost:8080
```

## Welcome email (Gmail SMTP)

The backend sends welcome mail via **Gmail SMTP** using `madnik.ltd@gmail.com`.

1. Google Account → Security → 2-Step Verification → **App passwords** → create one for “Easy VAT backend”.
2. On Fly.io / `.env`:

```env
SMTP_USER=madnik.ltd@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx
WELCOME_EMAIL_FROM=Easy VAT <madnik.ltd@gmail.com>
WELCOME_EMAIL_REPLY_TO=madnik.ltd@gmail.com
EASYVAT_PRODUCT_URL=https://madnik.co.uk/product/easy-vat/
```

3. Run Supabase migration `20260520_user_onboarding_email.sql`.

ImprovMX can stay as-is for **receiving** mail at `info@madnik.co.uk` → Gmail.

## Assets

- `assets/easyvat-logo.png` — used in email and product page.
