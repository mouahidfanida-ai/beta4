
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Video, FileText, ClipboardList, Calendar, ArrowRight, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { getActivities, getSessions, getClasses } from '../services/store';
import { Activity, Session, ClassGroup } from '../types';

const Landing: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
        const [fetchedActivities, fetchedSessions, fetchedClasses] = await Promise.all([
            getActivities(),
            getSessions(),
            getClasses()
        ]);
        
        setActivities(fetchedActivities.slice(0, 3));
        setClasses(fetchedClasses);
        
        // 1. Try to get sessions marked as 'Highlight' that also have videos
        let videos = fetchedSessions.filter(s => 
            s.isHighlight && 
            ((s.videoUrl && s.videoUrl.length > 5) || (s.videoUrls && s.videoUrls.length > 0))
        );
        
        // 2. Fallback: If no highlights exist, show most recent sessions with videos (Backward compatibility)
        if (videos.length === 0) {
            videos = fetchedSessions
                .filter(s => (s.videoUrl && s.videoUrl.length > 5) || (s.videoUrls && s.videoUrls.length > 0))
                .slice(0, 5);
        }

        setRecentSessions(videos);
    };
    fetchData();
  }, []);

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    try {
        if (url.includes('dropbox.com')) {
            return url.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('?dl=0', '');
        }
        if (url.includes('drive.google.com')) {
            // Convert /view to /preview for Google Drive
            return url.replace('/view', '/preview');
        }
        return url;
    } catch (e) {
        return url;
    }
  };

  const nextVideo = () => {
    setCurrentVideoIndex((prev) => (prev + 1) % recentSessions.length);
  };

  const prevVideo = () => {
    setCurrentVideoIndex((prev) => (prev - 1 + recentSessions.length) % recentSessions.length);
  };

  const getClassName = (classId: string) => {
      return classes.find(c => c.id === classId)?.name || 'General';
  };

  const getCurrentVideoUrl = () => {
      const session = recentSessions[currentVideoIndex];
      if (!session) return '';
      if (session.videoUrls && session.videoUrls.length > 0) return session.videoUrls[0];
      return session.videoUrl;
  };

  const currentEmbedUrl = getEmbedUrl(getCurrentVideoUrl());
  const isDriveVideo = currentEmbedUrl.includes('drive.google.com');

  return (
    <div className="bg-slate-50 font-sans">
      {/* Modern Hero Section */}
      <div className="relative isolate overflow-hidden pt-24 pb-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.brand.100),white)] opacity-70" />
        <div className="absolute inset-y-0 right-1/2 -z-10 mr-16 w-[200%] origin-bottom-left skew-x-[-30deg] bg-white shadow-xl shadow-brand-600/10 ring-1 ring-brand-50 sm:mr-28 lg:mr-0 xl:mr-16 xl:origin-center" />
        
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            
            <div className="mb-8 flex justify-center animate-fade-in-up">
               <span className="inline-flex items-center rounded-full bg-white px-5 py-2 text-sm font-extrabold text-brand-600 shadow-soft border border-brand-100">
                  🚀 Public Beta Version 2.0
               </span>
            </div>

            <p className="text-sm font-bold text-brand-600 mb-6 uppercase tracking-[0.2em]">
              Created by Badr El Hamdaoui
            </p>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 leading-tight">
              Master Your Sport at <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-purple-600">Les Emeraudes</span>
            </h1>
            <p className="mt-6 text-xl leading-relaxed text-slate-600 font-medium max-w-2xl mx-auto">
              A cutting-edge digital platform connecting students with high-definition training, study resources, and real-time grades.
            </p>
            <div className="mt-12 flex items-center justify-center gap-x-6">
              <Link
                to="/student"
                className="rounded-full bg-slate-900 px-10 py-5 text-lg font-bold text-white shadow-xl hover:bg-slate-800 hover:scale-105 transition-all duration-300"
              >
                Access Student Portal
              </Link>
              <Link to="/login" className="text-lg font-bold leading-6 text-slate-900 hover:text-brand-600 transition-colors flex items-center group">
                Teacher Login <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Video Slider Section (Dark Mode) */}
      {recentSessions.length > 0 && (
        <div className="bg-slate-900 py-32 rounded-[4rem] mx-4 sm:mx-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800 to-slate-900 opacity-50"></div>
            <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
                <div className="mx-auto max-w-2xl text-center mb-16">
                    <h2 className="text-brand-400 font-bold uppercase tracking-widest text-sm mb-3">Featured Content</h2>
                    <p className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
                        Latest Training Highlights
                    </p>
                </div>

                <div className="relative max-w-5xl mx-auto">
                    <div className="bg-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-700/50">
                        <div className="aspect-video w-full bg-black relative group">
                            {isDriveVideo ? (
                                <iframe 
                                    key={recentSessions[currentVideoIndex].id}
                                    src={currentEmbedUrl}
                                    className="w-full h-full border-0" 
                                    allowFullScreen 
                                    title="Video Player"
                                />
                            ) : (
                                <video 
                                    key={recentSessions[currentVideoIndex].id}
                                    controls 
                                    className="w-full h-full object-cover"
                                    src={currentEmbedUrl}
                                >
                                    Your browser does not support the video tag.
                                </video>
                            )}
                        </div>
                        <div className="p-10 md:p-12">
                            <div className="flex items-center gap-3 text-brand-300 text-sm font-bold mb-4 uppercase tracking-wide">
                                <Play className="w-4 h-4 fill-current" />
                                <span>{getClassName(recentSessions[currentVideoIndex].classId)}</span>
                                <span className="text-slate-600">•</span>
                                <span>{recentSessions[currentVideoIndex].date}</span>
                            </div>
                            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                                {recentSessions[currentVideoIndex].title}
                            </h3>
                            <p className="text-slate-300 leading-relaxed text-lg line-clamp-2">
                                {recentSessions[currentVideoIndex].description}
                            </p>
                        </div>
                    </div>

                    {recentSessions.length > 1 && (
                        <>
                            <button 
                                onClick={prevVideo}
                                className="absolute top-1/2 -left-6 md:-left-20 -translate-y-1/2 p-5 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all hover:scale-110 border border-white/10"
                            >
                                <ChevronLeft className="w-8 h-8" />
                            </button>
                            <button 
                                onClick={nextVideo}
                                className="absolute top-1/2 -right-6 md:-right-20 -translate-y-1/2 p-5 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all hover:scale-110 border border-white/10"
                            >
                                <ChevronRight className="w-8 h-8" />
                            </button>
                        </>
                    )}
                    
                    <div className="flex justify-center gap-3 mt-10">
                        {recentSessions.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentVideoIndex(idx)}
                                className={`h-2.5 rounded-full transition-all duration-300 ${
                                    idx === currentVideoIndex ? 'bg-brand-500 w-16 shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-slate-700 w-2.5 hover:bg-slate-600'
                                }`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Upcoming Activities Section */}
      {activities.length > 0 && (
          <div className="mx-auto max-w-7xl px-6 lg:px-8 py-32">
             <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                <div>
                    <h2 className="text-brand-600 font-bold uppercase tracking-widest text-sm mb-3">Events</h2>
                    <p className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
                    Upcoming Activities
                    </p>
                </div>
                <div className="h-1 flex-1 bg-slate-100 rounded-full ml-12 hidden md:block"></div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {activities.map(activity => (
                    <Link 
                        key={activity.id} 
                        to={`/activity/${activity.id}`}
                        className="group bg-white rounded-5xl shadow-card overflow-hidden border border-slate-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col h-full"
                    >
                        <div className="h-72 w-full overflow-hidden relative">
                             {activity.imageUrl ? (
                                <img src={activity.imageUrl} alt={activity.title} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" />
                             ) : (
                                <div className="h-full w-full bg-slate-50 flex items-center justify-center text-slate-300">
                                   <Calendar className="w-20 h-20" />
                                </div>
                             )}
                             <div className="absolute top-6 left-6">
                                <span className="bg-white/95 px-5 py-2 rounded-full text-xs font-bold text-slate-900 shadow-sm flex items-center backdrop-blur-sm">
                                    <Calendar className="w-4 h-4 mr-2 text-brand-500" />
                                    {activity.date}
                                </span>
                             </div>
                        </div>
                        <div className="p-10 flex-1 flex flex-col">
                            <h3 className="text-2xl font-bold text-slate-900 mb-4 group-hover:text-brand-600 transition-colors">{activity.title}</h3>
                            <p className="text-slate-500 font-medium leading-relaxed line-clamp-3 mb-8 flex-1">
                                {activity.description}
                            </p>
                            <div className="flex items-center text-sm font-bold text-brand-600 mt-auto group/btn">
                                View Full Details
                                <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center ml-3 group-hover/btn:bg-brand-600 group-hover/btn:text-white transition-all shadow-sm">
                                    <ArrowRight className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
             </div>
          </div>
      )}

      {/* Features Grid */}
      <div className="mx-4 sm:mx-8 mb-16 rounded-[4rem] bg-white shadow-2xl border border-slate-100 overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-32">
            <div className="mx-auto max-w-2xl lg:text-center mb-20">
            <h2 className="text-brand-600 font-bold uppercase tracking-widest text-sm mb-3">Why Les Emeraudes?</h2>
            <p className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
                Everything you need to excel
            </p>
            </div>
            <div className="grid grid-cols-1 gap-16 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    { icon: Video, title: 'HD Video Sessions', desc: 'Stream high-quality training drills anytime.' },
                    { icon: FileText, title: 'Study Materials', desc: 'Access PDF guides and rule books instantly.' },
                    { icon: ClipboardList, title: 'Exam Prep', desc: 'AI-generated quizzes and detailed notes.' },
                    { icon: Calendar, title: 'Events', desc: 'Stay updated with school tournaments.' },
                ].map((feature, idx) => (
                    <div key={idx} className="relative flex flex-col items-center text-center group">
                        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-50 text-brand-600 mb-8 shadow-sm group-hover:bg-brand-600 group-hover:text-white transition-all duration-300">
                            <feature.icon className="h-9 w-9" aria-hidden="true" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                        <p className="text-slate-500 font-medium leading-relaxed">
                            {feature.desc}
                        </p>
                    </div>
                ))}
            </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200">
         <div className="mx-auto max-w-7xl overflow-hidden px-6 py-16 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-sm font-bold text-slate-400">
               &copy; 2024 Ecole Les Emeraudes. All rights reserved.
            </p>
            <div className="flex gap-8">
                <a href="#" className="text-sm font-bold text-slate-400 hover:text-brand-600 transition-colors">Privacy Policy</a>
                <a href="#" className="text-sm font-bold text-slate-400 hover:text-brand-600 transition-colors">Terms of Service</a>
                <a href="#" className="text-sm font-bold text-slate-400 hover:text-brand-600 transition-colors">Contact Support</a>
            </div>
         </div>
      </footer>
    </div>
  );
};

export default Landing;
