import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getActivity } from '../services/store';
import { Activity } from '../types';
import { Calendar, FileText, ArrowLeft, Loader2, Image as ImageIcon } from 'lucide-react';

const ActivityDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      if (!id) return;
      setIsLoading(true);
      const data = await getActivity(id);
      setActivity(data);
      setIsLoading(false);
    };
    fetchActivity();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <p className="text-slate-500 mb-4 text-lg">Activity not found.</p>
        <Link to="/" className="text-brand-600 hover:text-brand-800 font-medium hover:underline flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-brand-600 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Home
        </Link>
        
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
           {activity.imageUrl ? (
             <div className="w-full h-64 md:h-96 relative">
               <img src={activity.imageUrl} alt={activity.title} className="w-full h-full object-cover" />
               <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/50 to-transparent"></div>
               <div className="absolute bottom-6 left-6 text-white max-w-2xl">
                  <div className="flex items-center gap-2 mb-2 bg-brand-600/90 w-fit px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm shadow-sm">
                    <Calendar className="w-4 h-4" />
                    {activity.date}
                  </div>
                  <h1 className="text-3xl md:text-5xl font-bold drop-shadow-md leading-tight">{activity.title}</h1>
               </div>
             </div>
           ) : (
             <div className="p-8 md:p-12 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2 text-brand-600 font-medium mb-3">
                   <Calendar className="w-5 h-5" />
                   {activity.date}
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900">{activity.title}</h1>
             </div>
           )}

           <div className="p-6 md:p-10">
              <div className="prose prose-slate max-w-none">
                 <h3 className="text-lg font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2">Event Details</h3>
                 <p className="text-slate-600 whitespace-pre-line leading-relaxed text-lg">
                    {activity.description}
                 </p>
              </div>

              {activity.pdfUrl && (
                <div className="mt-10 pt-8 border-t border-slate-100">
                   <h3 className="text-sm font-semibold text-slate-500 mb-4 uppercase tracking-wider">Related Resources</h3>
                   <a 
                      href={activity.pdfUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="inline-flex items-center p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-brand-50 hover:border-brand-200 transition-all group w-full md:w-auto"
                   >
                      <div className="p-3 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform text-brand-600">
                        <FileText className="w-8 h-8" />
                      </div>
                      <div className="ml-4">
                        <p className="text-base font-bold text-slate-900 group-hover:text-brand-700">Download Event Document</p>
                        <p className="text-sm text-slate-500">PDF Format • Click to open</p>
                      </div>
                   </a>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityDetails;