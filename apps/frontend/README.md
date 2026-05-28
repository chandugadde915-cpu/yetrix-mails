# Yetrix Frontend Architecture

The frontend is a Next.js App Router app deployed on Vercel. It never calls Mailcow directly.

```text
Browser UI
  -> Next.js route handler proxy (/api/backend/*)
  -> Yetrix Backend API
  -> Mailcow API / IMAP / SMTP
```

## Layers

- `src/app`: route-level pages and route handlers only.
- `src/components`: reusable UI and page clients.
- `src/lib`: shared configuration, API clients, data types, and server-side loaders.

## Data Loading

- Server pages use `requirePageSession()` for protected routes.
- Server pages use `apiGet` for required data and `apiGetSafe` for data that can fail without crashing the page.
- Dashboard and setup use `getWorkspaceSnapshot()` so domains, mailboxes, status, and load errors stay consistent.
- Client components use `client-api.ts`, which talks to the secure Next.js proxy so browser code never receives the backend token.

## Shared UI Primitives

- `AppShell` owns the workspace layout and sidebar.
- `navigation.ts` owns route groups and labels.
- `PageHeader` owns title/action layout for pages.
- `StatusNotice` owns safe degraded-state messaging.
- `MetricCard` owns simple dashboard metric cards.

## Route Pattern

Protected pages should follow this shape:

```tsx
export const dynamic = "force-dynamic";

export default async function Page() {
  await requirePageSession();
  const data = await apiGetSafe("/api/example", []);

  return (
    <AppShell>
      <PageHeader title="Page" description="What this page controls." />
      <StatusNotice errors={[data.error]} />
      {/* page content */}
    </AppShell>
  );
}
```

## Security Rules

- Use `API_URL` only from server code.
- Use `NEXT_PUBLIC_API_URL` only to validate client runtime configuration.
- Keep Mailcow API keys in the backend environment only.
- Public routes must remain safe without a workspace or session.

## Vercel Settings

```text
Root directory: repository root
Framework: Next.js
Build command: npm --workspace apps/frontend run build
Output directory: apps/frontend/.next
```

Required production environment:

```text
API_URL=https://api.yetrixtechnologies.com
NEXT_PUBLIC_API_URL=https://api.yetrixtechnologies.com
NEXT_PUBLIC_APP_URL=https://www.yetrixtechnologies.com
NEXT_PUBLIC_MAIL_DOMAIN=yetrixtechnologies.com
NEXT_PUBLIC_MAIL_CLIENT_HOST=mail.yetrixtechnologies.com
```
