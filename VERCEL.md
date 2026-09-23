# Vercel

A projekt Vite + React, nem Next.js. A Vercel alapbol Next.js-nek hiszi a repot,
ha nincs `vercel.json` — ezert kell a `framework: "vite"` bejegyzes, kulonben a
build ezzel all meg: `Error: No Next.js version detected`.

A build parancs `npm run build`, a kimenet `dist`.
