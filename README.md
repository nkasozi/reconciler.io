# Reconcile

![Reconcile Logo](/static/images/reconcile.svg)

A modern, intuitive data reconciliation tool built with SvelteKit that allows users to upload and compare datasets, identify discrepancies, and analyze results.

## Features

### Core Features
- Upload and parse both CSV and Excel files
- Interactive column mapping with smart suggestions
- Visual reconciliation process with progress tracking
- Detailed reconciliation results with failure analysis
- Download reconciliation results as CSV
- Responsive design that works on desktop and mobile devices
- Dark mode support

### Premium Features
- Reverse reconciliation (comparison file as primary)
- Handle duplicate entries automatically
- Create reconciliation categories with custom alerts
- Continue reconciliation even after failures
- Perform multiple reconciliations simultaneously
- Access reconciliation history
- API access for integration with other systems
- Custom configuration options

## Getting Started

### Prerequisites

- Node.js 16.x or later
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/reconcile-svelte.git
   cd reconcile-svelte
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Usage

### Basic Workflow

1. **Upload Files**:
   - Upload a primary file (CSV or Excel)
   - Upload a comparison file (CSV or Excel)

2. **Map Columns**:
   - Select ID columns for primary and comparison files
   - Map matching columns between the two files
   - Choose additional columns to include in the comparison

3. **Reconciliation Process**:
   - The system will process the files and compare the data
   - A progress indicator will show the reconciliation status

4. **Review Results**:
   - View summary statistics (total records, matches, failures)
   - Examine detailed failure analysis for mismatched records
   - Navigate through failures to identify discrepancies
   - Download the reconciliation results as a CSV file

### Free Tier Limitations

- Maximum of 10,000 rows per file
- Basic reconciliation features only

## Development

### Project Structure

```
reconcile-svelte/
├── src/                  # Source code
│   ├── lib/              # Shared components and utilities
│   │   ├── components/   # Reusable components
│   │   ├── stores/       # Svelte stores for state management
│   │   └── utils/        # Utility functions
│   ├── routes/           # SvelteKit routes/pages
│   └── app.html          # HTML template
├── static/               # Static assets
├── tests/                # Test files
│   ├── unit/             # Unit tests
│   └── e2e/              # End-to-end tests
├── package.json          # Dependencies and scripts
└── svelte.config.js      # Svelte configuration
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run code linting
- `npm run format` - Format code with Prettier
- `npm run test:unit` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run test` - Run all tests

## Testing

### Unit Tests

Unit tests are written using Vitest and focus on testing individual components and utility functions:

```bash
npm run test:unit
```

### End-to-End Tests

End-to-end tests use Playwright to simulate user interactions and test the complete workflow:

```bash
npm run test:e2e
```

## Deployment

The application uses Vercel adapter for deployment. To deploy:

1. Build the project:
   ```bash
   npm run build
   ```

2. Deploy using the Vercel CLI or connect your repository to Vercel for automatic deployments.

## Technology Stack

- **Framework**: SvelteKit
- **Styling**: TailwindCSS
- **State Management**: Svelte stores
- **File Parsing**: SheetJS/xlsx for Excel files
- **Testing**: Vitest (unit), Playwright (e2e)
- **Deployment**: Vercel

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Built with ❤️ using SvelteKit