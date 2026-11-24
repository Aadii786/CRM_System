# Response-time check

Run on 2026-11-24 against http://localhost:3000 (7 runs per screen after one warm-up; production build).

Data in the database during the check: 4296 contacts, 135 companies, 224 deals, 417 activities, 4 registrations (IKL expects about 2,000 contacts at the start). Machine: a normal office PC, database and application on the same computer, so a hosted setup adds network time.

| Screen | Median (ms) | Slowest (ms) | Target (ms) | Result |
|---|---:|---:|---:|---|
| Dashboard (IKL) | 29 | 33 | 2000 | pass |
| Dashboard with a date range | 28 | 29 | 2000 | pass |
| Contacts list | 35 | 36 | 2000 | pass |
| Contacts: search by name | 35 | 37 | 1000 | pass |
| Contacts: filter by status | 34 | 34 | 2000 | pass |
| Contacts: filter by source and date | 33 | 34 | 2000 | pass |
| Companies list | 25 | 26 | 2000 | pass |
| Deals board | 88 | 138 | 2000 | pass |
| Deals: filtered | 84 | 90 | 2000 | pass |
| Programs | 18 | 19 | 2000 | pass |
| Registrations | 23 | 24 | 2000 | pass |
| Tasks | 46 | 48 | 2000 | pass |
| Global search | 9 | 11 | 1000 | pass |
| Documents: search by words | 20 | 22 | 1000 | pass |
| Report: registrations | 18 | 19 | 2000 | pass |
| Report: by program | 18 | 19 | 2000 | pass |
| Report: by source | 67 | 72 | 2000 | pass |
| Report: by month | 24 | 25 | 2000 | pass |
| Report: team performance | 25 | 27 | 2000 | pass |
| Report: revenue | 18 | 19 | 2000 | pass |

20 of 20 screens within target.

How to repeat it on the live address: `npm run perf:check -- --url https://<address> --cookie "<crm_session value>"` (copy the value of the crm_session cookie from the browser after signing in as the Head of Department).
