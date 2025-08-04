# Quiz Portal - Client (Frontend)

React + TypeScript + Vite frontend application for the Comprehensive Quiz Portal.

## 🚀 Features

- **Modern React Stack**: React 18 + TypeScript + Vite
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Real-time Updates**: Socket.io integration for live notifications
- **Role-based UI**: Different interfaces for Admin and Student roles
- **Dark/Light Mode**: Theme switching support

## 🛠️ Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with PostCSS
- **Routing**: React Router DOM v7
- **Icons**: Lucide React
- **Real-time**: Socket.io Client
- **State Management**: React Context API
- **HTTP Client**: Custom API client with token management

## 📁 Project Structure

```
client/
├── src/
│   ├── components/           # React components
│   │   ├── Admin/           # Admin-specific components
│   │   ├── Auth/            # Authentication components
│   │   ├── Layout/          # Layout components
│   │   ├── Student/         # Student-specific components
│   │   └── User/            # User profile components
│   ├── contexts/            # React contexts
│   ├── hooks/               # Custom React hooks
│   ├── styles/              # CSS files
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions
│   ├── App.tsx              # Main App component
│   └── main.tsx             # Application entry point
├── public/                  # Static assets
├── index.html               # HTML template
├── vite.config.ts           # Vite configuration
└── package.json             # Dependencies and scripts
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. Update the `.env` file with your configuration:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

Build the application:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## 📱 Features by Role

### Admin Features
- **Dashboard**: Overview of system statistics
- **User Management**: Manage students and pending registrations
- **Module Management**: Create and manage learning modules
- **Test Management**: Create and manage quiz tests
- **Test Assignment**: Assign tests to students
- **Module Assignment**: Assign modules to students
- **Analytics**: View detailed test and student performance

### Student Features
- **Dashboard**: Personal overview and progress
- **Assigned Modules**: View and access learning materials
- **Assigned Tests**: Take assigned quizzes
- **Results**: View test results and detailed feedback
- **Profile**: Manage personal information

## 🎨 UI Components

- **Responsive Modals**: Mobile-optimized modal dialogs
- **Data Tables**: Sortable and filterable tables with mobile responsiveness
- **Form Components**: Validated forms with error handling
- **Notification System**: Toast notifications for user feedback
- **Theme System**: Dark/light mode with system preference detection

## 🔧 Configuration

### Environment Variables

- `VITE_API_URL`: Backend API URL
- `VITE_SOCKET_URL`: WebSocket server URL
- `VITE_NODE_ENV`: Environment (development/production)

### Vite Configuration

The Vite configuration includes:
- React plugin with TypeScript support
- PostCSS with Tailwind CSS
- Development server proxy for API calls

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🤝 Contributing

1. Follow the existing code style and structure
2. Write TypeScript with proper type definitions
3. Use Tailwind CSS for styling
4. Ensure mobile responsiveness
5. Add proper error handling

## 📄 License

This project is part of the Quiz Portal application and follows the same license as the main project.
