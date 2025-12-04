import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getStudent, saveStudent, getClass } from '../services/store';
import { Student, ClassGroup } from '../types';
import { ArrowLeft, Loader2, Save, GraduationCap, User, BookOpen } from 'lucide-react';

interface StudentProfileProps {
  isTeacher?: boolean;
}

const StudentProfile: React.FC<StudentProfileProps> = ({ isTeacher = false }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [classGroup, setClassGroup] = useState<ClassGroup | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setIsLoading(true);
      const studentData = await getStudent(id);
      setStudent(studentData);
      
      if (studentData && studentData.classId) {
        const classData = await getClass(studentData.classId);
        setClassGroup(classData);
      }
      
      setIsLoading(false);
    };
    fetchData();
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    
    setIsSaving(true);
    const updated = await saveStudent(student);
    if (updated) {
      setStudent(updated);
      alert("Changes saved successfully!");
    } else {
      alert("Failed to save changes.");
    }
    setIsSaving(false);
  };

  const calculateAverage = (s: Student) => {
    const sum = (Number(s.note1) || 0) + (Number(s.note2) || 0) + (Number(s.note3) || 0);
    return (sum / 3).toFixed(2);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <p className="text-slate-500 mb-4 text-lg">Student not found.</p>
        <button onClick={() => navigate(isTeacher ? '/dashboard' : '/student')} className="text-brand-600 font-bold">Return to Previous Page</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-28 pb-12 px-4 sm:px-8">
      <div className="max-w-4xl mx-auto">
        
        <Link to={isTeacher ? "/dashboard" : "/student"} className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-brand-600 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to {isTeacher ? 'Dashboard' : 'Portal'}
        </Link>

        <div className="bg-white rounded-5xl shadow-card border border-slate-100 overflow-hidden">
           
           {/* Profile Header */}
           <div className="bg-slate-900 p-10 md:p-12 text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 p-12 opacity-10">
                   <GraduationCap className="w-64 h-64" />
               </div>
               <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center">
                   <div className="w-24 h-24 rounded-full bg-brand-500 flex items-center justify-center text-3xl font-bold shadow-lg shadow-brand-500/50 border-4 border-slate-800">
                        {student.name.charAt(0)}
                   </div>
                   <div>
                       <h1 className="text-4xl font-extrabold tracking-tight mb-2">{student.name}</h1>
                       <div className="flex items-center gap-2 text-brand-200 font-medium">
                           <BookOpen className="w-4 h-4" />
                           {classGroup?.name || 'Unassigned Class'}
                       </div>
                   </div>
                   <div className="md:ml-auto bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                        <span className="block text-xs font-bold text-brand-200 uppercase tracking-widest mb-1">Current GPA</span>
                        <span className="text-4xl font-extrabold text-white">{calculateAverage(student)}</span>
                   </div>
               </div>
           </div>

           {/* Edit Form */}
           <div className="p-10 md:p-12">
               <form onSubmit={handleSave} className="space-y-10">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                       <div className="col-span-full">
                           <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3 ml-1">Student Name</label>
                           <div className="relative">
                               <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                   <User className="h-5 w-5 text-slate-400" />
                               </div>
                               <input 
                                   type="text" 
                                   value={student.name}
                                   onChange={(e) => setStudent({...student, name: e.target.value})}
                                   disabled={!isTeacher}
                                   className={`w-full pl-12 rounded-2xl bg-slate-50 border-transparent p-4 font-bold text-slate-900 text-lg transition-all ${isTeacher ? 'focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10' : 'cursor-default'}`}
                               />
                           </div>
                       </div>

                       <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 col-span-full">
                           <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                               <GraduationCap className="w-5 h-5 text-brand-600" />
                               Academic Performance
                           </h3>
                           <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                               {['note1', 'note2', 'note3'].map((term, idx) => (
                                   <div key={term}>
                                       <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 text-center">Term {idx + 1}</label>
                                       <input 
                                           type="number" 
                                           value={student[term as keyof Student]}
                                           onChange={(e) => setStudent({...student, [term]: Number(e.target.value)})}
                                           disabled={!isTeacher}
                                           className={`w-full rounded-2xl bg-white border-slate-200 p-4 text-center font-extrabold text-2xl text-slate-900 shadow-sm ${isTeacher ? 'focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10' : 'cursor-default bg-slate-100'}`}
                                       />
                                   </div>
                               ))}
                           </div>
                       </div>
                   </div>

                   {isTeacher && (
                       <div className="flex justify-end pt-6 border-t border-slate-50">
                           <button 
                               type="submit" 
                               disabled={isSaving}
                               className="inline-flex items-center px-8 py-4 bg-brand-600 rounded-full text-sm font-bold text-white hover:bg-brand-700 shadow-lg shadow-brand-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-70"
                           >
                               {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                               Save Changes
                           </button>
                       </div>
                   )}
               </form>
           </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;