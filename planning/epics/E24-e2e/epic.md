# E24 · E2E test suite (Playwright)

Priority: 5
Blocked by: E15-E22
Status: todo

## Tasks

| Task | ชื่อ | Status |
|------|------|--------|
| T01 | E2E setup — global-setup + helpers | todo |
| T02 | Auth specs — login/logout/lockout | todo |
| T03 | Pole module specs (CRUD ครบ) | todo |
| T04 | User module specs | todo |
| T05 | Role module specs | todo |
| T06 | Dashboard live spec (mock MQTT push) | todo |
| T07 | Camera archive specs | todo |
| T08 | Sensor archive specs | todo |
| T09 | Profile specs | todo |
| T10 | Log viewer specs | todo |

## Notes
- 1 module = 1 folder, 1 action = 1 spec
- Standard cases CRUD: 3 create + 2 edit + delete + toggle + search
- screenshots ทุก step ภาษาไทย
- backend test endpoint `/test/seed`, `/test/cleanup` (NODE_ENV=test only)
