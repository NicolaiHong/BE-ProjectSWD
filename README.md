# AI Idea API

A production-ready backend API for managing users, ideas, and AI-generated artifacts (requests, responses, UI schemas, components, and source code). Built with Node.js, Express, and TypeScript, using PostgreSQL for persistence and fully Dockerized for development and deployment. The project follows a Repository → Service → Controller pattern with a clean separation of concerns to support maintainability and scalability.

## Features

- **User Management**: Secure user creation, authentication, and profile management.
- **Idea Management**: Full CRUD functionality for user-generated ideas.
- **AI Interaction Tracking**: Logs all AI requests and stores the corresponding responses.
- **Artifact Storage**: Persists AI-generated UI schemas, UI components, and source code.
- **PostgreSQL Database**: Utilizes a robust, relational database for data integrity.
- **Dockerized Environment**: Comes with `docker-compose` for a one-command development setup.
- **TypeScript**: Ensures type safety and better developer experience.

## Architecture

This project follows a classic **Repository – Service – Controller** layered architecture to ensure a clean separation of concerns.

- **Controllers**: Responsible for handling incoming HTTP requests, validating user input, and sending back formatted API responses. They delegate business logic to the service layer.
- **Services**: Contain the core business logic of the application. They orchestrate data flow between repositories and controllers, ensuring that business rules are enforced.
- **Repositories**: Abstract the data access layer. All communication with the PostgreSQL database is handled here, isolating SQL queries from the rest of the application.

This structure makes the application modular, easier to test, and scalable.

## Project Folder Structure

````
ai-idea-api/
├── docker-compose.yaml
├── Dockerfile
├── package.json
├── server.ts
├── tsconfig.json
├── database/
│   └── schema.sql
└── src/
    ├── config/
    │   ├── constants.ts
    │   └── database.ts
    ├── controllers/
    │   ├── aiRequestController.ts
    │   ├── aiResponseController.ts
    │   ├── generatedCodeController.ts
    │   ├── generatedUIController.ts
    │   ├── ideaController.ts
    │   ├── uiSchemaController.ts
    # AI Idea API — Development Setup

    This README provides a concise, developer-focused setup guide for the AI Idea API. Follow these steps after cloning the repository so you can start coding quickly.

    ## Quick links
    - Project: [README.md](README.md)
    - Database schema: [database/schema.sql](database/schema.sql)

    ## Included ERD diagrams
    Add or replace these images in the `images/` directory (placeholders have been added in the repo):

    - ERD Logical: `images/erd_logical.png`
    - ERD Conceptual: `images/erd_conceptual.png`
    - ERD Diagram: `images/erd_diagram.png`

    ## Requirements
    - Node.js 18+ and npm (or yarn)
    - Docker & Docker Compose (recommended)
    - (Optional) `psql` client if you prefer importing the SQL locally

    ## 1) Clone the repo

    ```bash
    git clone <your-repository-url>
    cd ai-idea-api
    ```

    ## 2) Environment variables
    Create a `.env` file in the project root. Example variables to include:

    ```env
    # Server
    PORT=3000
    NODE_ENV=development

    # Database (adjust when running locally)
    DB_HOST=postgres
    DB_PORT=5432
    DB_USER=postgres
    DB_PASSWORD=postgres
    DB_NAME=ai_idea_db

    # Authentication
    JWT_SECRET=replace-with-a-secret
    JWT_EXPIRES_IN=1d
    ```

    Note: the project does not include a `.env.example`. Use the variables above and adapt to your environment.

    ## 3) Start with Docker (recommended)
    This starts the API and a PostgreSQL database defined in `docker-compose.yml`.

    ```bash
    docker-compose up --build -d
    ```

    After the database container is up, import the schema into the database. One common way (runs from the host) is:

    ```bash
    # create database (if not created by compose)
    docker-compose exec -T postgres psql -U postgres -c "CREATE DATABASE ai_idea_db;"

    # import schema from the repository into the database container
    docker cp database/schema.sql $(docker-compose ps -q postgres):/schema.sql
    docker-compose exec -T postgres psql -U postgres -d ai_idea_db -f /schema.sql
    ```

    If you have `psql` locally you can also run:

    ```bash
    # psql -h <host> -p <port> -U <user> -d ai_idea_db -f database/schema.sql
    ```

    ## 4) Install dependencies and run locally (optional)
    If you prefer coding without Docker, install dependencies and run the dev server:

    ```bash
    npm install
    npm run dev
    ```

    The `dev` script uses `ts-node-dev` and watches for file changes. See `package.json` for scripts.

    ## 5) End-to-end basic checklist for a developer
    - Clone the repo and create `.env`.
    - Start `docker-compose up -d` and import `database/schema.sql`.
    - Run `npm install`.
    - Start the server with `npm run dev` and open `http://localhost:3000` (adjust if your server uses a different port).

    ## Notes and expectations for contributors
    - Code structure follows a Controller → Service → Repository pattern under `src/`.
    - Add new DB schema changes to `database/schema.sql` or adopt a migration tool (recommended before production deployments).
    - If you add images for ERD diagrams, place them under `images/` and reference them in docs as shown above.

    ---

    If you want, I can:
    - Replace the placeholder image files with the actual ERD images you attached (please upload them),
    - Or commit these README changes and the placeholders for you now.
````
