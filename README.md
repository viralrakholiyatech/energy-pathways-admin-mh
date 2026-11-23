# Maharashtra Energy Pathways Admin
React 18 + Tailwind CSS (Create React App). Login and file upload using BACKEND_URL. Set it to the Maharashtra API in .env.local for development and in Vercel for deployment.
## Run locally
npm install
npm start
Opens http://localhost:3000. Requests to /api go through src/setupProxy.js, which forwards them to the API without the browser's Origin header.
## Deploy on Vercel
Import the GitHub repo in Vercel with the Create React App preset. Requests to /api go through api/[...path].js, a Vercel function that does the same forwarding.
To point at a different API server, set the BACKEND_URL environment variable (locally and in Vercel project settings).
## Where things are
```text
src/utils/api.js       Login API call
src/utils/auth.js      Token storage and expiry
src/pages/auth/        Login page and its tests
src/pages/data/
  DataUpload.jsx      Upload screen and sheet selection
  DataUpdate.jsx      Chooses the page for the selected sheet
  pages/              Individual sheet pages, including GDP and Renewable
  components/         Shared tables, loading indicators, and error displays
  api/                Sheet API requests and response handling
  hooks/              Shared loading and retry logic
  config/             Field definitions, units, and API mappings
  schemas/            JSON table layouts and cell references
  utils/              Table arrangement and upload-error helpers
  __tests__/          Automated tests for the data feature
src/testFixtures/     Synthetic API responses used only in tests
```

For example, `DataUpdate.jsx` opens `pages/GdpUpdateForm.jsx`, which loads values through `api/gdpApi.js`, uses field definitions from `config/gdpDataConfig.js`, and renders `components/WorkbookInputTable.jsx`. Its tests live in `__tests__/GdpUpdateForm.test.jsx` and `__tests__/gdpApi.test.js`.

## Sheet data

All displayed input values are loaded from `/api/admin/sheets/:sheet`. Missing values stay blank; failed requests show an error and Retry. There is no workbook-value or demo-login fallback.

`src/pages/data/schemas/*WorkbookSchema.json` contains presentation metadata and API field/cell mappings only. `schemas/formulaWorkbookLayouts.json` and `schemas/workbookTableHeaders.json` define table layouts and headings; they contain no stored input values or calculated results. These definitions are still needed because the sheet API supplies values, not complete page layouts. They can be replaced only if the backend provides a matching layout/schema API.

The unused legacy forms, hardcoded baseline configs, workbook input snapshots and audit snapshots have been removed. Section XVII (including refineries) uses `pages/RemainingWorkbookPage.jsx`.

Run checks with `npx react-scripts test --watchAll=false --runInBand` and `npm run build`. Small synthetic API responses live under `src/testFixtures` for tests only.
