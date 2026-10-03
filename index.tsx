
import './wdyr';
import React, { Component, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';
import { ThemeProvider } from './contexts/ThemeContext';
import { MemoryProvider } from './contexts/MemoryContext';
import './index.css';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

// Componente de barreira de erro para evitar tela branca/preta total
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;
  public readonly props: Readonly<ErrorBoundaryProps>;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: '#f8fafc', backgroundColor: '#0f172a', height: '100vh', fontFamily: 'sans-serif' }}>
          <h1 style={{ color: '#ef4444', fontSize: '1.5rem', marginBottom: '1rem' }}>Algo deu errado (Bug)</h1>
          <p style={{ marginBottom: '1rem' }}>Ocorreu um erro que impediu o carregamento da aplicação.</p>
          <pre style={{ backgroundColor: '#1e293b', padding: '1rem', borderRadius: '0.5rem', overflow: 'auto', fontSize: '0.875rem' }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
          >
            Recarregar Página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <MemoryProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </MemoryProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
