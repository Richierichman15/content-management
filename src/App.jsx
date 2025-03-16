import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import MainLayout from './layouts/MainLayout';
import LoadingSpinner from './components/common/LoadingSpinner';
import { AuthProvider } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Lazy load pages
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const ContentList = lazy(() => import('./pages/content/ContentList'));
const ContentEditor = lazy(() => import('./pages/content/ContentEditor'));
const MediaLibrary = lazy(() => import('./pages/media/MediaLibrary'));
const Profile = lazy(() => import('./pages/profile/Profile'));

function App() {
  return (
    <Router>
      <AuthProvider>
        <MainLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Content routes */}
              <Route path="/content" element={<ContentList />} />
              <Route path="/content/new" element={<ContentEditor />} />
              <Route path="/content/edit/:id" element={<ContentEditor />} />
              
              {/* Media routes */}
              <Route path="/media" element={<MediaLibrary />} />
              
              {/* Dashboard routes */}
              <Route path="/dashboard" element={<Dashboard />} />
              
              {/* Profile routes */}
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </Suspense>
        </MainLayout>
        <ToastContainer position="bottom-right" />
      </AuthProvider>
    </Router>
  );
}

export default App; 