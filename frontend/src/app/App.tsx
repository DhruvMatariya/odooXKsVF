import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { router } from './routes.tsx';
import { AuthProvider } from './lib/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#344C3D',
            color: '#FAFAF8',
            border: '1px solid rgba(115,138,110,0.4)',
            fontSize: '13px',
          },
        }}
      />
    </AuthProvider>
  );
}
