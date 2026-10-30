import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import '@aileron/tokens/css';
import './fonts.css';

const routes: Record<string, React.LazyExoticComponent<() => React.JSX.Element>> = {
  '/': lazy(() => import('./App')),
  '/interactions': lazy(() => import('./InteractionLab')),
  '/versions': lazy(() => import('./InteractionLab')),
  '/concepts': lazy(() => import('./concepts/Overview')),
  '/concepts/a': lazy(() => import('./concepts/ConceptA')),
  '/concepts/b': lazy(() => import('./concepts/ConceptB')),
  '/concepts/c': lazy(() => import('./concepts/ConceptC')),
};
const path = window.location.pathname.replace(/\/+$/, '') || '/';
const Page = routes[path] ?? routes['/'];

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><Suspense fallback={null}><Page /></Suspense></React.StrictMode>,
);
