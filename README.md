# 75 Soft Challenge

A locally running, customizable 75-day challenge tracker and meal planner built with Next.js, React, TypeScript, and SQLite.

The application interface is currently in Hungarian. The repository documentation is in English so the implementation and portfolio context are easy to review.

## License

The original application source code and repository documentation are licensed under the MIT License. See [LICENSE](LICENSE).

Third-party packages, including Next.js, React, Lucide, TypeScript, Tailwind CSS, Vitest, and their transitive dependencies, retain their own licenses. The MIT License for this repository does not relicense those packages or any user-entered local data, images, exports, or generated SQLite files.

## Implemented features

| Area | Implementation status |
| --- | --- |
| Challenge setup | Custom start date/time, water target, active habits, rest day, skip rules, and progress-picture interval |
| Daily tracking | Movement, reading, water, mindful eating, self-care, alcohol notes, rest days, and free-form notes |
| Calendar | Interactive month calendar with challenge days, planned meals, and scheduled progress-picture events |
| Progress pictures | Scheduled dates plus local image upload stored in the application state |
| Recipes | 30 seeded recipes, search, category filtering, custom recipe creation, favorites, deletion, preparation metadata, and instructions |
| Meal planning | Weekly breakfast/lunch/dinner assignments backed by cooking batches and serving limits |
| Grocery lists | Automatic ingredient aggregation from meal-prep batches, pantry/purchased status, and manual items |
| Persistence | Server-side SQLite through a Next.js route with browser `localStorage` fallback and JSON export/import |

## Technology

- Next.js 15 App Router
- React 19
- TypeScript
- Node.js built-in `node:sqlite` API
- SQLite for local server-side state
- `localStorage` fallback for browser-only development
- Vitest for calculation tests
- Tailwind CSS v4 PostCSS integration and custom CSS styling

## Requirements

- Node.js 24 or newer
- npm

Node 24 is recommended because the app uses the built-in `node:sqlite` module for local persistence. No external database server is required.

## Run locally

```bash
npm ci
npm run dev
```

Open `http://localhost:3000` in a browser. The SQLite database is created automatically under `data/75-soft.sqlite` on first server start.

Useful commands:

```bash
npm run test
npm run lint
npm run build
```

Set `SOFT_DATA_DIR` to store the SQLite file outside the repository, for example:

```bash
SOFT_DATA_DIR="$PWD/.local-data" npm run dev
```

## Data and privacy

This repository intentionally excludes the original local database, progress pictures, exported JSON, and any personal logs. The app can store habit, wellness-adjacent, and image data locally, so treat the generated SQLite file and exports as private user data.

The local API has no authentication, encryption, multi-user separation, or remote synchronization. Run it on a trusted machine and do not expose it to an untrusted network without adding an appropriate access-control layer.

## Scope notes

- The public copy contains only the 75 Soft application; unrelated DSM, questionnaire, and saved-item pages from the original mixed workspace are not included.
- The application is a personal planning tool, not medical advice or a clinical assessment product.
- Imported JSON is accepted when it has the expected top-level state fields; validate backups before importing them.
- Progress images are embedded as data URLs in the saved state and can make the database or browser storage grow quickly.
