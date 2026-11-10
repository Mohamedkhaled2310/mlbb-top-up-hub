# MLBB Diamond Store

Build a responsive Arabic-first storefront for Mobile Legends: Bang Bang with three requested views: customer shop at `/`, merchant portal at `/merchant`, and admin pricing at `/admin`.

## Scope
- Replace the blank home page with a dark gaming storefront using cyan and purple neon accents, Arabic RTL layout, and the supplied poster's exact product groups and prices. The poster is not attached yet; final price matching depends on receiving it.
- Add category browsing and a checkout dialog that collects User ID and Zone ID, shows the amount in EGP and USDT, and presents payment status and order success states.
- Add a merchant view that only presents wholesale prices and supports the same recharge order flow.
- Add an admin view for provider costs, public/wholesale pricing, global percentage margin, per-product overrides, and custom bundles linked to provider product codes.
- Configure protected runtime credentials for FazerCards and Binance Pay outside the admin interface. Keep provider calls, payment verification, and recharge execution on the server; never expose keys in browser code.

## Technical approach
- Preserve this project's TanStack Start and Tailwind stack instead of converting it to Next.js, which is not supported by this project. Use TanStack server functions for app-internal provider calls and storage operations; use server routes only when a raw HTTP response is needed.
- Enable Lovable Cloud for persistent catalog, pricing, orders, and account access; protect admin and merchant capabilities. Use server-side environment secrets for provider credentials.
- Inspect FazerCards and Binance Pay documentation before implementing their request/signature flows. Add a safe configuration example only if it matches the deployed runtime; do not commit credentials.
- Verify shop-to-payment-to-recharge states with mocked provider responses until valid provider credentials and poster prices are available; never claim a real payment or recharge was verified without a live provider flow.

## Acceptance
- All three routes render in Arabic RTL on mobile and desktop; the home page is a usable store, not a placeholder.
- Admin pricing changes are reflected in customer and merchant views, with public/wholesale prices kept distinct.
- Payment and recharge requests stay server-side, validate player identifiers and product codes, and expose clear pending, failed, and successful states.
- Every content route has unique page and social metadata; project checks complete without errors.
