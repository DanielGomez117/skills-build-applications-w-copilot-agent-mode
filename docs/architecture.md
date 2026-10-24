# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Record your plan here before editing code.

- Presentation tier decision: Keep API requests in the shared frontend API client and keep each route component responsible for rendering its capability. Every view handles loading, meaningful empty, and accessible error states; it does not calculate domain results.
- Logic tier decision: Keep HTTP parsing, validation, status codes, and response shaping in Express routes, with calculations and recommendation rules in the backend service. Preserve the documented `/api/*` response contracts and return deliberate 4xx responses for invalid input or missing resources.
- Data tier decision: Define required fields, types, references, and safe defaults in the Mongoose models. Keep seeding representative and idempotent, and do not delete or overwrite unrelated records.
- Activity tracking approach: Validate the activity fields and both ObjectId formats before querying; verify that the referenced user and team exist before writing. Persist the references, type, minutes, server-computed points, and occurrence time, and return the created record in the same shape used by the list endpoint.
- Team management approach: Require a non-empty name, preserve the submitted name and mascot, default members to an empty array, and validate member references before creating a team. Return created and listed teams with their members.
- Leaderboard approach: Aggregate activity points by team in the data/service layer, sort teams by total points descending, and assign 1-based ranks in that order. Keep the response fields `teamName`, `totalPoints`, and `rank` stable.
- Workout suggestions approach: Find the user by email, use recent activities together with the user's goal to select matching seeded workouts, and include a concise reason for the leading suggestion. Return a deliberate 4xx response when no user matches.

## Test plan

Run the data contract first, then the API contract, then the frontend contract; this follows the data-to-logic-to-presentation dependency order. Run both builds after the contracts pass.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`. Failures indicate missing schema requirements, defaults, references, or seed behavior.
- API command: `npm run test:api --prefix octofit-tracker/backend`. Failures indicate incorrect route validation/status codes, persistence or response shapes, leaderboard aggregation/ranking, or recommendation behavior.
- Frontend command: `npm test --prefix octofit-tracker/frontend`. Failures indicate route rendering, API integration, or missing/inaccessible loading, empty, or error states.
- Backend build command: `npm run build --prefix octofit-tracker/backend`. Failures indicate TypeScript errors in the backend.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`. Failures indicate frontend TypeScript or Vite production-build errors.

Baseline observed before implementation: the combined backend suite reports 8 failed tests and 1 passed (the seed contract); the frontend suite reports 15 failed tests. The backend failures cover all four model contracts and all four API capabilities. The frontend failures cover the still-pending capability views and their data and state handling. Re-run the focused commands above after each tier is implemented, then run both builds as final checks.
