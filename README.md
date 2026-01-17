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

```
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
    │   └── userController.ts
    ├── middlewares/
    │   ├── errorHandler.ts
    │   └── validation.ts
    ├── models/
    │   ├── AIRequest.ts
    │   ├── AIResponse.ts
    │   ├── GeneratedCode.ts
    │   ├── GeneratedUI.ts
    │   ├── Idea.ts
    │   ├── UISchema.ts
    │   └── User.ts
    ├── repositories/
    │   ├── aiRequestRepository.ts
    │   ├── aiResponseRepository.ts
    │   ├── generatedCodeRepository.ts
    │   ├── generatedUIRepository.ts
    │   ├── ideaRepository.ts
    │   ├── uiSchemaRepository.ts
    │   └── userRepository.ts
    ├── routes/
    │   ├── aiRequestRoutes.ts
    │   ├── aiResponseRoutes.ts
    │   ├── generatedCodeRoutes.ts
    │   ├── generatedUIRoutes.ts
    │   ├── ideaRoutes.ts
    │   ├── index.ts
    │   ├── uiSchemaRoutes.ts
    │   └── userRoutes.ts
    ├── services/
    │   ├── aiRequestService.ts
    │   ├── aiResponseService.ts
    │   ├── generatedCodeService.ts
    │   ├── generatedUIService.ts
    │   ├── ideaService.ts
    │   ├── uiSchemaService.ts
    │   └── userService.ts
    └── utils/
        ├── ApiResponse.ts
        └── logger.ts
```

## How to Run with Docker (Recommended)

Using Docker is the simplest way to get the project running, as it handles the database and application environment automatically.

1.  **Clone the repository**

    ```sh
    git clone <your-repository-url>
    cd ai-idea-api
    ```

2.  **Create Environment File**
    Create a `.env` file in the root of the project and populate it with the necessary environment variables. See the example below.

3.  **Build and Run with Docker Compose**
    ```sh
    docker-compose up --build
    ```
    The API will be available at `http://localhost:3000`.

## How to Run Locally (Without Docker)

If you prefer to run the application without Docker, you will need to set up Node.js and PostgreSQL on your machine.

1.  **Install Dependencies**

    ```sh
    npm install
    ```

2.  **Set up PostgreSQL**
    - Ensure you have a running PostgreSQL instance.
    - Create a database for this project.
    - Run the `schema.sql` script to set up the tables.

    ```sh
    psql -U your_username -d your_database_name -f database/schema.sql
    ```

3.  **Configure Environment Variables**
    Create a `.env` file and update the database connection details to point to your local PostgreSQL instance.

4.  **Run the Application**
    ```sh
    npm run dev
    ```
    This command uses `ts-node-dev` to run the application, which automatically restarts on file changes.

## Environment Variables

Create a `.env` file in the project root.

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# PostgreSQL Database Connection
DB_HOST=postgres         # Use 'localhost' if running locally
DB_PORT=5432
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=ai_idea_api

# JWT for Authentication
JWT_SECRET=a-very-strong-and-secret-key
JWT_EXPIRES_IN=1d
```

## Available NPM Scripts

- `start`: Runs the compiled JavaScript code (for production).
- `dev`: Starts the development server with hot-reloading using `ts-node-dev`.
- `build`: Compiles the TypeScript code to JavaScript.
- `lint`: Lints the codebase using ESLint.
- `test`: Runs tests (if configured).

## Future Improvements

- **API Documentation**: Integrate Swagger or OpenAPI for automated API documentation.
- **Testing**: Add a comprehensive suite of unit, integration, and end-to-end tests.
- **CI/CD**: Implement a CI/CD pipeline for automated testing and deployment.
- **Caching**: Introduce a caching layer (e.g., Redis) to improve performance for frequently accessed data.
- **Advanced Authentication**: Add support for OAuth 2.0 providers (e.g., Google, GitHub).
- **Database Migrations**: Use a migration tool like `node-pg-migrate` or TypeORM migrations to manage database schema changes.
