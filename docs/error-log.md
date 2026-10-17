# Error log

Each entry records what happened, why, and how it was resolved.

## H2 console: `Database "/Users/<you>/test" not found` (error 90149)

**Area:** Local development, H2 web console (`http://localhost:8080/h2-console`)
**Profile:** `local`

### Symptom

After logging in to the H2 console with the Postgres-style settings, the page showed:

```
Database "/Users/xaymunyun/test" not found, either pre-create it or allow remote
database creation (not recommended in secure environments) [90149-232]
```

Error 90149 is H2's `DATABASE_NOT_FOUND_1` code. The message names a path under the home directory, not the app's database.

### Cause

The H2 console's login form pre-fills the JDBC URL with H2's default, `jdbc:h2:~/test`.

- `~` expands to the user's home directory, `/Users/xaymunyun`.
- So the console looked for `/Users/xaymunyun/test.mv.db`, which does not exist.
- That file is not the app's database. The app stores its data at `backend/.data/navigo.mv.db`, set by `spring.datasource.url` in [application-local.yml](../backend/src/main/resources/application-local.yml).
- The console refuses to create a database implicitly, so it reports 90149 instead of creating an empty one.

The console was reachable, so the security fix was working. The failure was only in the login form's URL.

### Resolution

1. Start the backend from `backend/` with the `local` profile, so the relative path resolves.
2. In the H2 console login form, replace the default URL. Keep the other fields as shown:

   | Field | Value |
   | --- | --- |
   | Driver class | `org.h2.Driver` |
   | JDBC URL | `jdbc:h2:file:./.data/navigo;MODE=PostgreSQL` |
   | User | `sa` |
   | Password | (empty) |

3. Click **Connect**.

The `;MODE=PostgreSQL` setting must match the datasource. H2 rejects a different mode on a database that is already open.

The step-by-step table is in [running-locally.md](./running-locally.md#5-open-the-h2-database).

### Verification status

- The failure was reported from the user's browser. Scripted `curl` checks during debugging did not reproduce the error text, so they are not evidence either way.
- Pending: the user has not yet confirmed a successful login with the app URL.
- Confirmed no stray database was created at `/Users/xaymunyun/test.mv.db` by the test requests.

### Prevention

- The docs now tell the user to replace the default URL, and the troubleshooting table has a row for error 90149.
