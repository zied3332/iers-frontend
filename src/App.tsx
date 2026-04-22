import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { TranslateProvider } from './context/TranslateContext';

export default function App() {
  return (                          // ← return manquant !
    <TranslateProvider>
      <RouterProvider router={router} />
    </TranslateProvider>
  );
}