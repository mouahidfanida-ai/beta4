import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Dumbbell, LayoutDashboard, LogOut, GraduationCap } from 'lucide-react';

interface NavbarProps {
  isTeacher: boolean;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ isTeacher, onLogout }) => {
  const location = useLocation();

  const isActive = (path: string) => 
    location.pathname === path 
      ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' 
      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900';

  // Don't show navbar on login page to keep it clean
  if (location.pathname === '/login') return null;

  return (
    <nav className="fixed top-6 left-0 right-0 z-50 mx-4 sm:mx-8">
      <div className="max-w-7xl mx-auto">
        <div className="glass-panel rounded-full shadow-soft px-6 h-20 flex justify-between items-center transition-all duration-300">
          
          {/* Logo Section */}
          <div className="flex items-center gap-4">
             <div className="bg-brand-600 p-2.5 rounded-full shadow-glow">
                <Dumbbell className="h-5 w-5 text-white" />
             </div>
             <Link to="/" className="flex flex-col justify-center">
               <span className="text-xl font-logo font-bold text-slate-900 leading-none">
                 Ecole Les Emeraudes
               </span>
               <div className="flex items-center gap-2 mt-0.5">
                 <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                   Beta 2.0
                 </span>
               </div>
             </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            {!isTeacher ? (
              <>
                 <Link 
                  to="/student" 
                  className={`hidden sm:flex items-center px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-200 ${isActive('/student')}`}
                >
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Student Portal
                </Link>
                <Link 
                  to="/login" 
                  className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-bold rounded-full text-white bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/30 transition-all hover:-translate-y-0.5"
                >
                  Sign In
                </Link>
              </>
            ) : (
              <>
                 <Link 
                  to="/dashboard" 
                  className={`flex items-center px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-200 ${isActive('/dashboard')}`}
                >
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
                </Link>
                <button
                  onClick={onLogout}
                  className="flex items-center px-5 py-2.5 rounded-full text-sm font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;