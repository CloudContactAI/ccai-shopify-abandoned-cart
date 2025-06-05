# CloudContactAI Abandoned Cart Recovery for Shopify

A Shopify app that automatically sends SMS reminders through CloudContactAI when customers abandon their shopping carts.

## Features

- **Automated SMS Reminders**: Send personalized SMS messages to customers who abandon their carts
- **Customizable Settings**: Configure when to consider a cart abandoned and customize message templates
- **Manual Triggers**: Manually send reminders for specific abandoned carts
- **SMS History**: Track all sent messages and their delivery status
- **Test Messaging**: Send test messages to verify your configuration

## Requirements

- Node.js 18.0.0 or higher
- MongoDB database
- Shopify Partner account
- CloudContactAI account with API credentials

## Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/ccai-shopify-abandoned-cart.git
cd ccai-shopify-abandoned-cart
```

2. Install dependencies:
```bash
npm install
cd frontend && npm install && cd ..
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Update the `.env` file with your credentials:
- Shopify API credentials
- MongoDB connection string
- CloudContactAI credentials (optional)

5. Start the development server:
```bash
npm run dev
```

## Deployment

1. Build the frontend:
```bash
cd frontend && npm run build && cd ..
```

2. Deploy to your hosting provider (Heroku, AWS, etc.)

3. Set up environment variables on your hosting provider

4. Register your app in the Shopify Partner Dashboard

## Usage

1. Install the app from the Shopify App Store (or development store)
2. Configure your CloudContactAI credentials in the app settings
3. Customize your abandoned cart reminder settings
4. Enable the reminders

The app will automatically track abandoned carts and send SMS reminders based on your settings.

## Development

### Project Structure

- `server/` - Backend server
  - `handlers/` - Request handlers
  - `services/` - Business logic
  - `models/` - MongoDB models
  - `jobs/` - Scheduled jobs
  - `__tests__/` - Backend tests
- `frontend/` - Shopify admin UI
  - `components/` - React components
  - `pages/` - App pages
  - `src/__tests__/` - Frontend tests

### Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server
- `npm test` - Run tests with coverage
- `npm run test:watch` - Run tests in watch mode
- `npm run build` - Build the frontend
- `npm run lint` - Check code with Biome
- `npm run lint:fix` - Fix linting issues with Biome
- `npm run format` - Check code formatting with Biome
- `npm run format:fix` - Fix formatting issues with Biome

### Code Quality

This project uses:
- **Biome**: For linting and formatting JavaScript/TypeScript code
- **Jest**: For unit and integration testing
- **Husky**: For Git hooks
- **lint-staged**: For running linters on staged files
- **Renovate**: For automated dependency updates

### Continuous Integration

This project uses GitHub Actions for CI/CD:
- Runs linting checks
- Runs tests for both backend and frontend
- Builds the frontend
- Uploads test coverage to Codecov

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Copyright

Copyright (c) 2025 CloudContactAI LLC
