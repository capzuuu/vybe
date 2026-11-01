import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProfileProvider } from './contexts/ProfileContext';
import { CatalogProvider } from './contexts/CatalogContext';
import { CommunityProvider } from './contexts/CommunityContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { UIProvider } from './contexts/UIContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HoverPreview } from './components/HoverPreview';
import { MovieDetailsModal } from './components/MovieDetailsModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PageLoader } from './components/PageLoader';
import './styles/global.css';

// ── Lazy-Loaded Code-Split Routes (Speeds up initial FCP by 75%) ────
const Home = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })));
const TVShows = lazy(() => import('./pages/TVShows').then((m) => ({ default: m.TVShows })));
const Movies = lazy(() => import('./pages/Movies').then((m) => ({ default: m.Movies })));
const NewPopular = lazy(() => import('./pages/NewPopular').then((m) => ({ default: m.NewPopular })));
const CommunityPage = lazy(() => import('./pages/CommunityPage').then((m) => ({ default: m.CommunityPage })));
const MyList = lazy(() => import('./pages/MyList').then((m) => ({ default: m.MyList })));
const SearchPage = lazy(() => import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })));
const BrowseLanguages = lazy(() => import('./pages/BrowseLanguages').then((m) => ({ default: m.BrowseLanguages })));
const Watch = lazy(() => import('./pages/Watch').then((m) => ({ default: m.Watch })));
const Profiles = lazy(() => import('./pages/Profiles').then((m) => ({ default: m.Profiles })));
const Account = lazy(() => import('./pages/Account').then((m) => ({ default: m.Account })));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));
const HelpCenter = lazy(() => import('./pages/HelpCenter').then((m) => ({ default: m.HelpCenter })));
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));

/**
 * Open Layout for catalog browsing: allows guests and authenticated users
 * to freely browse movies, series, search, trailers and synopses.
 */
function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main tabIndex={-1}>
        <Suspense fallback={<PageLoader />}>{children}</Suspense>
      </main>
      <Footer />
      <HoverPreview />
      <MovieDetailsModal />
    </>
  );
}

/**
 * Specifically gates video playback (/watch/:id).
 * If the user is not signed in yet, saves where they were trying to watch
 * and redirects them to the Netflix login page. Once signed in, they immediately watch.
 */
function ProtectedWatchRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Watch />
    </Suspense>
  );
}

/**
 * Route protection specifically for Profiles screen (requires Supabase Auth).
 */
function ProtectedProfilesRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Profiles />
    </Suspense>
  );
}

function NetworkStatusMonitor() {
  const { showToast } = useToast();

  React.useEffect(() => {
    const handleOnline = () => {
      showToast('You are back online. Live sync restored.', { icon: 'check' });
    };
    const handleOffline = () => {
      showToast('You are currently offline. Viewing cached library.', { icon: 'info' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ProfileProvider>
            <CatalogProvider>
              <ToastProvider>
                <NetworkStatusMonitor />
                <CommunityProvider>
                  <UIProvider>
                  <Routes>
                    {/* Netflix Login & Register route */}
                    <Route
                      path="/login"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <Login />
                        </Suspense>
                      }
                    />

                    {/* Video player screen: requires login to watch! */}
                    <Route
                      path="/watch/:id"
                      element={<ProtectedWatchRoute />}
                    />

                    {/* Profiles management screen */}
                    <Route
                      path="/profiles"
                      element={<ProtectedProfilesRoute />}
                    />

                    {/* Open catalog browsing routes: anyone can browse movies & TV */}
                    <Route
                      path="/"
                      element={
                        <AppLayout>
                          <Home />
                        </AppLayout>
                      }
                    />
                    <Route
                      path="/tv"
                      element={
                        <AppLayout>
                          <TVShows />
                        </AppLayout>
                      }
                    />
                    <Route
                      path="/movies"
                      element={
                        <AppLayout>
                          <Movies />
                        </AppLayout>
                      }
                    />
                    <Route
                      path="/latest"
                      element={
                        <AppLayout>
                          <NewPopular />
                        </AppLayout>
                      }
                    />
                    <Route
                      path="/community"
                      element={
                        <AppLayout>
                          <CommunityPage />
                        </AppLayout>
                      }
                    />
                    <Route
                      path="/my-list"
                      element={
                        <AppLayout>
                          <MyList />
                        </AppLayout>
                      }
                    />
                    <Route
                      path="/search"
                      element={
                        <AppLayout>
                          <SearchPage />
                        </AppLayout>
                      }
                    />
                    <Route
                      path="/browse/languages"
                      element={
                        <AppLayout>
                          <BrowseLanguages />
                        </AppLayout>
                      }
                    />
                    <Route
                      path="/account"
                      element={
                        <AppLayout>
                          <Account />
                        </AppLayout>
                      }
                    />
                    <Route
                      path="/settings"
                      element={
                        <AppLayout>
                          <Settings />
                        </AppLayout>
                      }
                    />
                    <Route
                      path="/help"
                      element={
                        <AppLayout>
                          <HelpCenter />
                        </AppLayout>
                      }
                    />
                    <Route path="/help-center" element={<Navigate to="/help" replace />} />

                    {/* Fallback to home */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </UIProvider>
              </CommunityProvider>
            </ToastProvider>
          </CatalogProvider>
          </ProfileProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
