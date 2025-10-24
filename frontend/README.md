# BarcodeGen Pro Frontend

A modern React TypeScript frontend for the BarcodeGen Pro barcode generation system.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## 🛠️ Tech Stack

- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Modern UI component library
- **React Router** - Client-side routing
- **React Query** - Data fetching and caching
- **React Hook Form** - Form handling
- **Zod** - Schema validation

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   └── ...             # Custom components
├── pages/              # Page components
├── contexts/           # React contexts
├── hooks/              # Custom hooks
├── utils/              # Utility functions
├── lib/                # External library configurations
└── styles/             # Global styles
```

## 🎨 Key Features

- **Barcode Generation** - Generate various barcode types
- **Device Management** - Manage device types and models
- **Excel Integration** - Upload and process Excel files
- **Template System** - Customizable barcode templates
- **User Authentication** - Secure login/logout
- **Payment Integration** - Token-based payment system
- **Responsive Design** - Mobile-first responsive UI

## 🔧 Configuration

### Environment Variables

Create `.env` file:
```env
VITE_API_BASE_URL=http://localhost:8034
VITE_ENVIRONMENT=development
```

### API Integration

The frontend communicates with the backend API through:
- **Base URL**: Configured via `VITE_API_BASE_URL`
- **Authentication**: API key-based authentication
- **CORS**: Configured for development and production

## 🧪 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler

### Code Quality

- **ESLint** - Code linting
- **TypeScript** - Type checking
- **Prettier** - Code formatting (via ESLint)

## 🚀 Deployment

### Docker Deployment
The frontend is containerized and deployed via Docker:

```bash
# Build Docker image
docker build -t barcode-frontend .

# Run container
docker run -p 80:80 barcode-frontend
```

### Production Build
```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment.

## 🔗 Integration

This frontend is part of the BarcodeGen Pro monorepo and integrates with:

- **Backend API** (`/backend`) - FastAPI Python backend
- **Deployment** (`/deploy`) - Docker deployment scripts
- **Documentation** (`/docs`) - Project documentation

## 📚 Documentation

- [Main Project README](../README.md)
- [Backend Documentation](../backend/README.md)
- [Deployment Guide](../deploy/README.md)
- [API Documentation](../docs/)

## 🤝 Contributing

1. Follow the existing code style
2. Use TypeScript for all new code
3. Add proper error handling
4. Write meaningful commit messages
5. Test your changes thoroughly

## 📄 License

This project is proprietary software. All rights reserved.