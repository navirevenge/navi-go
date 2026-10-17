# Concepts

Plain-language definitions of the tools, libraries, and terms used in NAVI語. Each entry says what the thing is, why this project uses it, and where it shows up in the repo.

## Backend (Java)

**Java 21.** The programming language and runtime for the backend. Java code is compiled to bytecode and runs on a JVM (Java Virtual Machine). You need a JDK (development kit) to build and a JRE/JDK to run.

**Maven and `pom.xml`.** Maven is the build tool. `pom.xml` (Project Object Model) lists the project's dependencies, plugins, and build steps. `mvn package` compiles the code, runs tests, and produces a jar. See [backend/pom.xml](../backend/pom.xml).

**Jar.** A `.jar` is a zip archive of compiled Java classes. The Spring Boot Maven plugin turns this project into a self-contained "fat" jar that includes all dependencies, so it runs with `java -jar`.

**Spring Boot.** A framework that starts a web server and wires components together automatically. It reads configuration from `application*.yml` files and environment variables. Version 3.4.5 is used here. See [backend/pom.xml](../backend/pom.xml).

**Spring profiles.** Named sets of configuration. The `local` profile uses H2; the `prod` profile uses PostgreSQL. Profiles are chosen with `--spring.profiles.active=local` or `SPRING_PROFILES_ACTIVE`. The base file [application.yml](../backend/src/main/resources/application.yml) has no defaults, so startup fails if no profile supplies the values. See [docs/architecture.md](architecture.md).

**Controller, service, repository.** The usual layers of a Spring app:
- **Controller** handles HTTP requests and responses, for example [AuthController.java](../backend/src/main/java/app/navigo/auth/AuthController.java).
- **Service** holds the business logic, for example [AuthService.java](../backend/src/main/java/app/navigo/auth/AuthService.java).
- **Repository** reads and writes the database, for example `UserRepository`.

**DTO (Data Transfer Object).** A small object that defines the shape of request and response JSON, separate from database entities. Here they are Java `record`s, such as `RegisterRequest` in [AuthDtos.java](../backend/src/main/java/app/navigo/auth/AuthDtos.java). A `record` is a concise immutable class.

**Bean validation.** Annotations such as `@NotBlank`, `@Email`, and `@Size` on DTO fields. Spring checks them before the controller runs and returns `400` with field errors if they fail.

**JPA and Hibernate.** JPA (Java Persistence API) maps Java classes to database tables. Hibernate is the library that implements it. Entities such as `User` and `LearnerProfile` map to the `users` and `learner_profiles` tables. You write Java objects and Hibernate generates SQL.

**`ddl-auto: validate`.** A Hibernate setting that checks at startup that the entity classes match the database schema, and fails if they do not. It never changes the schema. The schema is changed only by Flyway migrations. This setting is in the base `application.yml`, so it applies to every profile.

**`open-in-view: false`.** Turns off a Spring behavior that keeps the database session open for the whole web request. Keeping it off means database access happens in the service layer, which avoids accidental queries while rendering responses.

**Flyway.** A database migration tool. It applies versioned SQL scripts to a database in order, and records each applied script in a table (`flyway_schema_history`). On the next start it applies only the scripts that are new. This project keeps all scripts in [backend/src/main/resources/db/migration](../backend/src/main/resources/db/migration).

How Flyway works here:
- **Naming.** `V1__core_schema.sql` means version 1, then a description. The double underscore is required. A later change is a new file such as `V2__add_xyz.sql`.
- **Runs at startup.** With `spring.flyway.enabled: true`, Flyway runs before the app accepts requests. A failed migration stops startup.
- **Checksums.** Flyway stores a checksum of each applied file. If an applied file is edited, startup fails with a checksum mismatch. To change the schema, add a new `V<n>` file instead of editing an old one.
- **Seed data.** [V1__core_schema.sql](../backend/src/main/resources/db/migration/V1__core_schema.sql) creates the tables and also inserts starter grammar, lessons, and so on, so a fresh database has content.
- **Why not `ddl-auto: update`.** Hibernate can guess schema changes, but that is unpredictable and can drop data. Flyway scripts are reviewed, versioned, and reproducible on every environment.

**H2.** An embedded database written in Java. It runs in a single file, so the `local` profile needs no separate database server. Files are at `backend/.data/navigo.mv.db`. Tests use an in-memory H2. The `MODE=PostgreSQL` setting makes H2 accept more PostgreSQL syntax. It is close to PostgreSQL but not identical, which is why the migrations are also checked against PostgreSQL 16 (see [README.md](../README.md)).

**PostgreSQL.** The production-style relational database, run in the Docker Compose `db` service. Version 16 is used.

**Actuator.** Spring's operational endpoints. Only `/actuator/health` is exposed here, for checking that the app is up.

**springdoc / OpenAPI / Swagger UI.** OpenAPI is a standard format describing an HTTP API. springdoc generates it from the code. Swagger UI is a web page that lets you read and try the endpoints. Available at `/swagger-ui.html` when the backend runs. The API summary is in [docs/api.md](api.md).

**CORS (Cross-Origin Resource Sharing).** Browsers block a web page at one origin (for example `localhost:3000`) from calling an API at another origin (`localhost:8080`) unless the API says it is allowed. `NAVIGO_CORS_ORIGINS` lists the allowed frontend origins.

## Security

**Authentication vs authorization.** Authentication answers "who are you?" (login). Authorization answers "what may you do?" Here, login is authentication and the token check on each request is authorization.

**Password hashing (BCrypt).** Passwords are never stored as typed. They are hashed with BCrypt, a slow one-way function. Login hashes the typed password and compares it to the stored hash. Details are in [docs/architecture.md](architecture.md).

**JWT (JSON Web Token).** A signed token that the server issues at login. It contains claims such as the user id (`sub`) and the expiry time. The client sends it in the header `Authorization: Bearer <token>`. The server verifies the signature and does not need to store sessions. Lifetime is set by `NAVIGO_JWT_TTL` (default 12h).

**HS256 and the JWT secret.** HS256 is a signing method that uses one shared secret. `NAVIGO_JWT_SECRET` is that secret. Anyone with it can forge tokens, so it must be long and private. The `local` profile has a dev-only default.

**Spring Security and OAuth2 resource server.** Spring Security protects the endpoints. The `oauth2-resource-server` dependency lets Spring validate the JWT on incoming requests. Everything except register, login, health, and the OpenAPI docs needs a valid token.

**Stateless.** The server keeps no session in memory or in the database. Every request carries its own proof (the JWT). This makes it easier to run several backend instances later.

## Frontend (Next.js and TypeScript)

**TypeScript.** JavaScript with static types. `npm run typecheck` runs the compiler without producing output, so type errors fail before the app runs.

**Node.js and npm.** Node runs JavaScript outside the browser. npm installs packages. `npm ci` installs exactly the versions in `package-lock.json`, which is what you want for reproducible installs.

**Next.js.** A React framework for building web apps. It handles routing, server rendering, and builds. Version 16 is used here. `npm run dev` starts a development server with hot reload. `npm run build` makes an optimized production build, and `npm run start` serves it.

**App Router.** The Next.js routing system, where folders under `frontend/src/app` become URLs. Folders in parentheses, such as `(app)` and `(auth)`, group routes without changing the URL.

**React.** The UI library. Components are functions that return markup. This project uses React 19.

**`NEXT_PUBLIC_` variables.** Environment variables with this prefix are copied into the browser bundle at build time. Changing `NEXT_PUBLIC_API_URL` requires a rebuild. Variables without the prefix stay on the server. See [frontend/src/lib/api.ts](../frontend/src/lib/api.ts).

**Tailwind CSS.** A utility-first CSS framework. Styles are written as class names in the markup, such as `text-sm`, instead of separate CSS rules.

**ESLint.** A linter. It flags code problems and style issues. `npm run lint` runs it.

**Vitest and Testing Library.** Vitest runs unit tests. Testing Library renders React components in tests and queries them the way a user would. `npm test` runs them.

**Client-side token storage.** The frontend stores the JWT in `localStorage` (see the risk table in [docs/architecture.md](architecture.md)). This is acceptable for the MVP and is planned to change.

**PWA (Progressive Web App).** A website that can be installed like an app. This project includes a manifest file, [manifest.ts](../frontend/src/app/manifest.ts).

## Containers and environment

**Docker and images.** Docker packages an app and its dependencies into an image. A container is a running instance of an image. The backend and frontend each have a `Dockerfile` with two stages: a build stage with the tools, and a smaller runtime stage that contains only what runs. See [backend/Dockerfile](../backend/Dockerfile).

**Docker Compose.** A tool for running several containers together from one file. [docker-compose.yml](../docker-compose.yml) defines three services: `db` (PostgreSQL), `backend`, and `frontend`. `depends_on` with `service_healthy` waits for the database health check before starting the backend.

**Environment variables.** Named values set outside the code. The backend reads them through placeholders such as `${NAVIGO_DB_URL}`. Docker Compose reads them from the `.env` file (template: [.env.example](../.env.example)). `.env` holds secrets and is never committed; `.gitignore` excludes it.

**Health check.** A command Docker runs to check that a service is working. For `db` it is `pg_isready`.

## Other project terms

**Migration vs seed data.** A migration changes the schema (tables, columns, indexes). Seed data is starter content inserted by a migration, here the grammar concepts and lessons.

**Learning content vs user progress.** Learning content (grammar concepts, vocabulary, lessons, example sentences) is shared by all users. User progress (study sessions, review cards, mistakes) belongs to one user. See [docs/data-model.md](data-model.md).

**Study session.** One sitting on a lesson. Starting a session records a start time. Completing it records the duration in minutes. Streaks and weekly minutes on the dashboard are built from these.

**Streak.** The number of consecutive days with study activity, ending today. A streak still counts if the learner last studied yesterday. Computed in [DashboardService.java](../backend/src/main/java/app/navigo/dashboard/DashboardService.java).

**Self-reported level.** The JLPT level the learner says they are at. It is shown on the dashboard labelled "self-reported" until assessments exist.

**JLPT (Japanese-Language Proficiency Test).** A standard test of Japanese. Levels run from N5 (beginner) to N1 (advanced). The app uses these levels for content.

**Furigana.** Small kana printed above kanji to show how they are read. The app renders it with the HTML `<ruby>` element. See [docs/architecture.md](architecture.md).

**Romaji.** Japanese written with Latin letters (for example "konnichiwa"). Off by default in learner profiles.

**Spaced repetition (SRS).** A method of reviewing items at growing intervals, timed so you review just before you would forget. The `review_cards` and `review_events` tables are the planned data for it. It is not implemented yet (see [docs/roadmap.md](roadmap.md)).

**Migration history and state.** Flyway tracks what it has applied in `flyway_schema_history`. Deleting the local H2 file resets this along with the data, as described in [docs/running-locally.md](running-locally.md).

**Git branch naming and commit tags.** Each change follows the project's rules: a GitHub issue, a branch named `navi-revenge-<issue>/<slug>`, and commit messages starting with `navi-revenge-<issue>:`. See [CONTRIBUTING.md](../CONTRIBUTING.md).
