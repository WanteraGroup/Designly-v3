# Vercel

## A build

A projekt Vite + React, nem Next.js. A `vercel.json` ezt ki is mondja:

```json
{ "framework": "vite", "buildCommand": "npm run build", "outputDirectory": "dist", "installCommand": "npm install" }
```

## Ket hiba, amibe a deploy belefutott

**`No Next.js version detected`** — a Vercel projekt beallitasaiban a Framework Preset
`Next.js` volt, es az felulirja a `vercel.json`-t. A Settings -> Build & Development
Settings alatt a Framework legyen `Vite`, a tobbi feluliro mezo pedig ures.

**`sh: line 1: vite: command not found` / `Skipping "install" command...`** — az
Install Command ki volt kapcsolva, ezert a `node_modules` nem epult fel, es a build
nem talalta a `vite` binarist. Az Install Command legyen `npm install`, vagy ures
(akkor a `vercel.json`-bol jon).

## Production Branch

`main`. Kulonben a Vercel egy korabbi commitot klonoz — ez tortent a `91e20d9`-cel
is, ami meg a `vercel.json` elotti allapot.
