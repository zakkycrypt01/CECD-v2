import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import MobileResponderPanel from './components/MobileResponderPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import Incidents from './pages/Incidents';
import IncidentDetail from './pages/IncidentDetail';
import ReportIncident from './pages/ReportIncident';
import Volunteers from './pages/Volunteers';
import AdminGovernance from './pages/AdminGovernance';
import Profile from './pages/Profile';
import Login from './pages/Login';
import AiAssistant from './components/AiAssistant';
import Teams from './pages/Teams';
import Analytics from './pages/Analytics';
import Training from './pages/Training';
import AlertsManager from './pages/AlertsManager';
import { Incident, User, Role } from './types';
import { initialUsers, initialIncidents } from './mockData';
import { aiService } from './services/aiService';
import { offlineService } from './services/offlineService';
import { loggerService } from './services/loggerService';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [walletProvider, setWalletProvider] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<User>(initialUsers[0]); 
  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents);
  const [volunteers, setVolunteers] = useState<User[]>(initialUsers);
  const [globalWhisperMode, setGlobalWhisperMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const lastResolvedCoords = useRef<{lat: number, lng: number} | null>(null);
  const currentUserIdRef = useRef<string>(currentUser.id);

  // Sync ref with state
  useEffect(() => {
    currentUserIdRef.current = currentUser.id;
  }, [currentUser.id]);

  // Real-time location watching for current user
  useEffect(() => {
    if (!isAuthenticated) return;

    let watchId: number;

    const updateLocationName = async (lat: number, lng: number) => {
      // Threshold check: ~11 meters roughly
      if (lastResolvedCoords.current) {
        const dist = Math.sqrt(
          Math.pow(lat - lastResolvedCoords.current.lat, 2) + 
          Math.pow(lng - lastResolvedCoords.current.lng, 2)
        );
        if (dist < 0.0001) return; 
      }

      try {
        const result = await aiService.getAddressFromCoords(lat, lng);
        lastResolvedCoords.current = { lat, lng };

        setCurrentUser(prev => ({ ...prev, location: result.address, lat, lng }));
        setVolunteers(prev => prev.map(v => v.id === currentUserIdRef.current ? { ...v, location: result.address, lat, lng } : v));
      } catch (e) {
        console.error("Failed to update location via AI", e);
      }
    };

    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          updateLocationName(latitude, longitude);
        },
        (error) => {
          console.warn("[GEO-WATCH] Access Denied or Error:", error.message);
        }
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isAuthenticated]);

  // Initialize offline queue and set sync handler
  useEffect(() => {
    offlineService.init();
    offlineService.setSyncHandler(async (item) => {
      if (item.type === 'incident') {
        const synced = item.data as Incident;
        // If translation is missing, fetch it now that we're online
        if (!synced.translatedDescription && synced.description) {
          try {
            const result = await aiService.predictIncident(synced.description);
            synced.translatedDescription = result.translation;
            // Optionally update confidence
            synced.confidenceScore = result.confidence;
          } catch (e) {
            console.warn('[SYNC] Translation fetch failed, proceeding without it');
          }
        }
        setIncidents(prev => prev.map(i => i.id === synced.id ? { ...synced, pendingSync: false } : i));
      }
    });
    if (offlineService.isOnline) offlineService.syncQueue();
  }, []);

  const addIncident = (newIncident: Incident) => {
    setIncidents(prev => [newIncident, ...prev]);
  };

  const addVolunteer = (newVolunteer: User) => {
    setVolunteers(prev => [newVolunteer, ...prev]);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setWalletAddress('');
    setWalletProvider('');
  };

  const handleLogin = (address: string, provider: string) => {
    setWalletAddress(address);
    setWalletProvider(provider);
    setIsAuthenticated(true);
    // Link the mock user to the connected wallet address for consistency
    setCurrentUser(prev => ({ ...prev, walletAddress: address }));
  };

  const updateVolunteerStatus = (userId: string, newStatus: 'Available' | 'Busy' | 'OffDuty') => {
    setVolunteers(prev => prev.map(u => {
      if (u.id === userId) {
        const updated = { ...u, status: newStatus };
        
        // If we are deploying another user, we track them as "Busy"
        // If we are deploying ourselves, the watchPosition effect handles the coords
        if (userId === currentUser.id) {
          setCurrentUser(prevUser => ({ ...prevUser, status: newStatus }));
        }
        
        return updated;
      }
      return u;
    }));
  };

  if (!isAuthenticated) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    );
  }

  return (
    <ErrorBoundary
      onError={(error, info) => {
        loggerService.error('App', 'Unhandled component error', error, {
          componentStack: info.componentStack
        });
      }}
    >
      <Router>
        <div className="flex h-screen w-full bg-background-dark overflow-hidden">
          {/* Desktop Sidebar */}
          <Sidebar role={currentUser.role} onLogout={handleLogout} />
          
          {/* Mobile Sidebar Overlay */}
          {mobileMenuOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
          )}
          
          {/* Mobile Sidebar */}
          <div className={`fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-slate-900 to-slate-950 border-r border-white/5 z-50 md:hidden transform transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <Sidebar role={currentUser.role} onLogout={() => { handleLogout(); setMobileMenuOpen(false); }} />
          </div>
          
          <main className="flex-1 flex flex-col min-w-0 relative h-full">
            <Header user={currentUser} walletProvider={walletProvider} mobileMenuOpen={mobileMenuOpen} onMobileMenuToggle={setMobileMenuOpen} />
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <Routes>
                <Route path="/" element={<Dashboard incidents={incidents} volunteers={volunteers} currentUser={currentUser} />} />
                <Route path="/incidents" element={<Incidents incidents={incidents} />} />
                <Route path="/incidents/:id" element={<IncidentDetail incidents={incidents} setIncidents={setIncidents} currentUser={currentUser} volunteers={volunteers} />} />
                <Route path="/report" element={<ReportIncident onSubmit={addIncident} currentUser={currentUser} isWhisperMode={globalWhisperMode} setIsWhisperMode={setGlobalWhisperMode} />} />
                <Route path="/volunteers" element={<Volunteers volunteers={volunteers} onUpdateStatus={updateVolunteerStatus} onAddVolunteer={addVolunteer} />} />
                <Route path="/teams" element={<Teams currentUser={currentUser} />} />
                <Route path="/analytics" element={<Analytics incidents={incidents} />} />
                <Route path="/training" element={<Training currentUser={currentUser} />} />
                <Route path="/alerts" element={<AlertsManager />} />
                <Route path="/admin" element={<AdminGovernance />} />
                <Route path="/profile" element={<Profile user={currentUser} />} />
                <Route path="/login" element={<Navigate to="/" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
          
          {/* Mobile Responder Quick Panel */}
          <MobileResponderPanel 
            currentUser={currentUser}
            incidents={incidents}
            onStatusChange={(newStatus) => updateVolunteerStatus(currentUser.id, newStatus)}
            onNavigateToIncident={(id) => setMobileMenuOpen(false)}
          />
          
          <AiAssistant />
        </div>
      </Router>
    </ErrorBoundary>
  );
};

export default App;
