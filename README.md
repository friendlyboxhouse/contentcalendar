# contentcalendar

แอป **Content Planner** (Next.js 14) — Dashboard, Calendar, Briefs, Performance; state เก็บในเบราว์เซอร์ (`localStorage`) ผ่าน Zustand.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

หน้าหลักอยู่ที่ `app/(app)/page.tsx` (Dashboard). แก้แล้ว dev server จะรีเฟรชอัตโนมัติ.

## Cron jobs

Daily Telegram และ Discord digest ใช้ GitHub Actions เรียก API ทุก 15 นาที แทน Vercel Cron เพื่อไม่ชน limit ของ Vercel Hobby plan.

ตั้งค่า GitHub repository secrets:

- `CRON_BASE_URL`: โดเมนจริงของเว็บ เช่น `https://your-domain.com`
- `CRON_SECRET`: ค่าเดียวกับ env `CRON_SECRET` บน hosting

workflow อยู่ที่ `.github/workflows/cron-digests.yml` และสามารถกดรันเองได้จาก GitHub Actions ผ่าน `workflow_dispatch`.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
