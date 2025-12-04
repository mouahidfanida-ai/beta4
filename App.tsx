import React, { useState, PropsWithChildren } from 'react';
import { MemoryRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import StudentPortal from './pages/StudentPortal';
import ActivityDetails from './pages/ActivityDetails';
import StudentProfile from './pages/StudentProfile';
import { UserRole } from './types';
import { ArrowLeft, Lock, Dumbbell, User } from 'lucide-react';

// Enhanced Login Component
const Login: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin') {
      onLogin();
    } else {
      setError('Incorrect password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Side - Visual */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-brand-600/20 mix-blend-overlay z-10"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-brand-900 via-slate-900 to-slate-900 z-0"></div>
        
        {/* Abstract shapes */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>

        <div className="relative z-20 text-center px-12">
           <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 mb-8 shadow-2xl">
              <Dumbbell className="w-10 h-10 text-white" />
           </div>
           <h2 className="text-4xl font-extrabold text-white mb-6 tracking-tight">
             Empowering Physical Education
           </h2>
           <p className="text-slate-300 text-lg leading-relaxed max-w-md mx-auto">
             Manage classes, schedule sessions, and track student performance all in one beautiful platform.
           </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-4 sm:px-12 xl:px-24 bg-white relative">
        <Link to="/" className="absolute top-8 left-8 flex items-center text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </Link>

        <div className="max-w-md w-full mx-auto">
            <div className="mb-10">
                <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Welcome Back</h1>
                <p className="text-slate-500">Please enter your credentials to access the dashboard.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Username</label>
                   <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                         <User className="h-5 w-5 text-slate-400" />
                      </div>
                      <input 
                         type="text" 
                         value="admin" 
                         disabled
                         className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 font-medium focus:ring-0 cursor-not-allowed"
                      />
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Password</label>
                   <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                         <Lock className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-medium"
                        placeholder="••••••••"
                      />
                   </div>
                   <div className="mt-2 flex justify-end">
                      <span className="text-xs font-medium text-slate-400">Hint: admin</span>
                   </div>
                </div>

                {error && (
                   <div className="p-4 rounded-2xl bg-red-50 text-red-600 text-sm font-medium flex items-center animate-shake">
                       {error}
                   </div>
                )}

                <button
                    type="submit"
                    className="w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-lg shadow-brand-500/30 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    Sign In
                </button>
            </form>

            <div className="mt-8 text-center">
                <p className="text-sm text-slate-400 font-medium">
                    Need help? <a href="#" className="text-brand-600 hover:text-brand-700">Contact Support</a>
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

// Protected Route Wrapper
const ProtectedRoute = ({ isAllowed, children }: PropsWithChildren<{ isAllowed: boolean }>) => {
  if (!isAllowed) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const AppContent: React.FC = () => {
    const [userRole, setUserRole] = useState<UserRole>(UserRole.GUEST);

    const handleLogin = () => {
        setUserRole(UserRole.TEACHER);
    };

    const handleLogout = () => {
        setUserRole(UserRole.GUEST);
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-brand-100 selection:text-brand-900">
            <Navbar isTeacher={userRole === UserRole.TEACHER} onLogout={handleLogout} />
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/student" element={<StudentPortal />} />
                <Route path="/activity/:id" element={<ActivityDetails />} />
                <Route 
                    path="/login" 
                    element={userRole === UserRole.TEACHER ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} 
                />
                <Route 
                    path="/dashboard" 
                    element={
                        <ProtectedRoute isAllowed={userRole === UserRole.TEACHER}>
                            <Dashboard />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/student-profile/:id" 
                    element={<StudentProfile isTeacher={userRole === UserRole.TEACHER} />} 
                />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </div>
    );
}

const App: React.FC = () => {
  return (
    <Router>
        <AppContent />
    </Router>
  );
};

export default App;