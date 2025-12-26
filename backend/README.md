# ClaimPilot Backend

Enhancement-only backend service for AI operations and license verification. Core budgeting features work client-side and don't require this backend.

## Architecture

This backend provides **optional enhancements**:
- AI-powered PDF parsing
- AI tag/category suggestions
- AI monthly narrative generation
- Gumroad license verification

**Core features remain client-side** and work offline:
- Auto-tagging (pattern matching)
- Recurring detection
- Category detection
- Goal calculations
- File parsing (CSV/Excel)

## Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`:
- `GEMINI_API_KEY` - Google Gemini API key for AI operations
- `GUMROAD_API_KEY` - Gumroad API key for license verification (optional)
- `GUMROAD_PRODUCT_PERMALINK` - Your Gumroad product permalink
- `PORT` - Server port (default: 3001)
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:3000)

4. Run development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
npm start
```

## API Endpoints

### Health Check
- `GET /health` - Server health check

### License Verification
- `POST /api/verify-license`
  - Body: `{ licenseKey: string }`
  - Returns: `{ valid: boolean, tier: string, expiresAt?: string }`

### AI Operations
- `POST /api/ai/parse-pdf`
  - Body: `{ text: string }` (PDF text extracted client-side)
  - Returns: `{ success: boolean, transactions: Transaction[], count: number }`

- `POST /api/ai/suggest-tags`
  - Body: `{ description: string, merchant: string, amount: number }`
  - Returns: `{ suggestedTag: string, suggestedCategory: string, confidence: number, reason: string }`

- `POST /api/ai/monthly-narrative`
  - Body: `{ summaryData: object }`
  - Returns: `{ narrative: string }`

## Error Handling

All endpoints include error handling with appropriate HTTP status codes:
- `400` - Bad request (missing required fields)
- `500` - Internal server error

## Graceful Degradation

The frontend is designed to work without this backend:
- If backend is unavailable, frontend falls back to client-side operations
- Network errors are caught and handled gracefully
- Core features never depend on backend availability

## Development

The backend uses:
- **Express** - Web framework
- **TypeScript** - Type safety
- **tsx** - TypeScript execution for development
- **Google Generative AI** - AI operations
- **CORS** - Cross-origin resource sharing

## Deployment

1. Set environment variables in your hosting platform
2. Build the project: `npm run build`
3. Start the server: `npm start`

The backend can be deployed separately from the frontend, allowing independent scaling.


