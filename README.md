# Spotilark Site

This is a Next.js application that uses Genkit for AI-powered features and Firebase for backend services.

## Getting Started

### Prerequisites

- Node.js (v20 or later)
- npm

### Installation

1. Clone the repository:
   ```sh
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```sh
   cd spotilark-site
   ```
3. Install the dependencies:
   ```sh
   npm install
   ```

### Running the Application

To start the development server, run:

```sh
npm run dev
```

This will start the application on `http://localhost:9002`.

## Building for Production

To build the application for production, run:

```sh
npm run build
```

This will create a `.next` directory with the production build of the application.

## Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run start`: Starts the production server.
- `npm run lint`: Lints the code using Next.js's built-in ESLint configuration.
- `npm run typecheck`: Runs the TypeScript compiler to check for type errors.
- `npm run genkit:dev`: Starts the Genkit development server.
- `npm run genkit:watch`: Starts the Genkit development server in watch mode.
