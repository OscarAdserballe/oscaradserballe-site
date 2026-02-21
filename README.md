# oscaradserballe.com

Next.js + Convex

## Dev

```bash
npm run dev          # starts Next.js + Convex dev server
npx convex dev       # run Convex separately if needed
```

## Deploy

```bash
npx convex deploy    # deploy Convex to production
npm run build        # build Next.js
```

## Vercel Setup

```bash
vercel env ls                                    # list env vars
vercel env add NEXT_PUBLIC_CONVEX_URL            # add env var (prompts for value)
vercel env rm NEXT_PUBLIC_CONVEX_URL             # remove env var
vercel --prod                                    # deploy to production
```

Or use Dashboard: Settings → Environment Variables
