
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, FileText, Video, Sparkles, Loader2, Folder, ArrowLeft, Save, GraduationCap, Calculator, Calendar, Image as ImageIcon, Upload, Pencil, X, Link as LinkIcon, Film, MoreHorizontal, Search, Scan, User, Star } from 'lucide-react';
import { getClasses, saveClass, deleteClass, getSessions, saveSession, deleteSession, getStudents, saveStudent, deleteStudent, getActivities, saveActivity, deleteActivity, uploadSessionVideo } from '../services/store';
import { ClassGroup, Session, Student, Activity } from '../types';
import { generateSessionContent, extractGradesFromImage } from '../services/gemini';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'classes' | 'sessions' | 'grades' | 'activities'>('classes');
  
  // Navigation state for Sessions/Grades tab
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  
  // Students State
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // Modals state
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);

  // AI Scan State
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResults, setScannedResults] = useState<any[]>([]);

  // Form states
  const [newClass, setNewClass] = useState<Partial<ClassGroup>>({});
  const [newSession, setNewSession] = useState<Partial<Session>>({});
  const [newActivity, setNewActivity] = useState<Partial<Activity>>({});

  // MULTI-VIDEO UPLOAD STATE
  type PendingVideo = { id: string; type: 'link' | 'file'; value: string | File; display: string };
  const [pendingVideos, setPendingVideos] = useState<PendingVideo[]>([]);
  const [tempVideoInput, setTempVideoInput] = useState('');
  const [tempVideoType, setTempVideoType] = useState<'link' | 'upload'>('link');
  const [isSavingSession, setIsSavingSession] = useState(false);

  // File Upload State for Activity
  const [activityImageFile, setActivityImageFile] = useState<File | null>(null);
  const [activityImagePreview, setActivityImagePreview] = useState<string | null>(null);
  const [activityPdfFile, setActivityPdfFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // AI Loading State
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    const [fetchedClasses, fetchedSessions, fetchedActivities] = await Promise.all([
      getClasses(),
      getSessions(),
      getActivities()
    ]);
    setClasses(fetchedClasses);
    setSessions(fetchedSessions);
    setActivities(fetchedActivities);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setSelectedClassId(null);
    setStudents([]);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'grades' && selectedClassId) {
      const fetchStudentsData = async () => {
        setIsLoadingStudents(true);
        const data = await getStudents(selectedClassId);
        setStudents(data);
        setIsLoadingStudents(false);
      };
      fetchStudentsData();
    }
  }, [activeTab, selectedClassId]);

  // --- Handlers (CRUD) ---

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClass.name) return;
    
    const created = await saveClass({
      name: newClass.name,
      description: newClass.description || '',
    });

    if (created) {
      setClasses([...classes, created]);
      setIsClassModalOpen(false);
      setNewClass({});
    } else {
        alert('Failed to create class');
    }
  };

  const handleDeleteClass = async (id: string) => {
    const success = await deleteClass(id);
    if (success) {
        setClasses(classes.filter(c => c.id !== id));
        setSessions(sessions.filter(s => s.classId !== id));
    }
  };

  const handleOpenSessionModal = (sessionToEdit?: Session) => {
      if (sessionToEdit) {
          // Edit Mode
          setNewSession({
              id: sessionToEdit.id,
              classId: sessionToEdit.classId,
              title: sessionToEdit.title,
              description: sessionToEdit.description,
              date: sessionToEdit.date,
              pdfUrl: sessionToEdit.pdfUrl,
              aiNotes: sessionToEdit.aiNotes,
              isHighlight: sessionToEdit.isHighlight
          });

          // Convert existing URLs to pending format
          const existingVideos: PendingVideo[] = (sessionToEdit.videoUrls || []).map((url, idx) => ({
              id: `existing-${idx}`,
              type: 'link',
              value: url,
              display: url
          }));
          setPendingVideos(existingVideos);
      } else {
          // New Mode
          setNewSession({ 
              classId: selectedClassId || undefined,
              date: new Date().toISOString().split('T')[0],
              isHighlight: false
          });
          setPendingVideos([]);
      }
      
      setTempVideoInput('');
      setTempVideoType('link');
      setIsSessionModalOpen(true);
  };

  const handleAddVideoToPending = () => {
      if (tempVideoType === 'link') {
          if (!tempVideoInput) return alert("Please enter a URL");
          setPendingVideos([...pendingVideos, {
              id: Date.now().toString(),
              type: 'link',
              value: tempVideoInput,
              display: tempVideoInput
          }]);
          setTempVideoInput('');
      }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setPendingVideos([...pendingVideos, {
              id: Date.now().toString(),
              type: 'file',
              value: file,
              display: file.name
          }]);
          e.target.value = '';
      }
  };

  const handleRemovePendingVideo = (id: string) => {
      setPendingVideos(pendingVideos.filter(v => v.id !== id));
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSession.title || !newSession.classId || !newSession.date) {
        alert("Please fill in the title, date, and select a class.");
        return;
    }
    
    if (pendingVideos.length === 0) {
        alert("Please add at least one video (Link or Upload).");
        return;
    }

    setIsSavingSession(true);

    try {
        const finalVideoUrls: string[] = [];
        for (const video of pendingVideos) {
            if (video.type === 'link') {
                finalVideoUrls.push(video.value as string);
            } else {
                try {
                    const uploadedUrl = await uploadSessionVideo(video.value as File);
                    if (uploadedUrl) {
                        finalVideoUrls.push(uploadedUrl);
                    } else {
                        throw new Error("Upload returned null");
                    }
                } catch (err) {
                    alert(`Failed to upload video: ${video.display}. Session saving aborted.`);
                    setIsSavingSession(false);
                    return;
                }
            }
        }

        const payload: any = {
          classId: newSession.classId,
          title: newSession.title,
          description: newSession.description || '',
          videoUrls: finalVideoUrls,
          pdfUrl: newSession.pdfUrl || '',
          aiNotes: newSession.aiNotes || '',
          date: newSession.date,
          isHighlight: newSession.isHighlight || false
        };

        if (newSession.id) {
            payload.id = newSession.id;
        }

        const saved = await saveSession(payload);

        if (saved) {
            if (newSession.id) {
                // Update local list
                setSessions(sessions.map(s => s.id === saved.id ? saved : s));
            } else {
                setSessions([saved, ...sessions]);
            }
            setIsSessionModalOpen(false);
            setNewSession({});
            setPendingVideos([]);
        } else {
            alert('Failed to save session');
        }
    } catch (error) {
        alert("An error occurred while saving the session.");
    } finally {
        setIsSavingSession(false);
    }
  };

  const handleDeleteSession = async (id: string) => {
      const success = await deleteSession(id);
      if (success) {
          setSessions(sessions.filter(s => s.id !== id));
      }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800; 
                const scaleSize = MAX_WIDTH / img.width;
                const width = (img.width > MAX_WIDTH) ? MAX_WIDTH : img.width;
                const height = (img.width > MAX_WIDTH) ? img.height * scaleSize : img.height;

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setActivityImageFile(file);
          try {
              const preview = await compressImage(file);
              setActivityImagePreview(preview);
          } catch (error) {
              console.error("Preview generation failed", error);
          }
      }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivity.title || !newActivity.date) {
        alert("Please fill in the required fields.");
        return;
    }
    
    setIsUploading(true);
    try {
        let imageUrl = '';
        let pdfUrl = '';

        if (activityImageFile) {
            imageUrl = await compressImage(activityImageFile);
            if (imageUrl.length * 0.75 > 300 * 1024) {
                alert("Image too large. Please use a simpler image.");
                setIsUploading(false);
                return;
            }
        }
        if (activityPdfFile) {
             if (activityPdfFile.size > 300 * 1024) {
                alert("PDF file too large. Max 300KB.");
                setIsUploading(false);
                return;
            }
            pdfUrl = await fileToBase64(activityPdfFile);
        }
        
        const activityPayload: Partial<Activity> = {
            title: newActivity.title,
            date: newActivity.date,
            description: newActivity.description || '',
            imageUrl: imageUrl || newActivity.imageUrl || '', 
            pdfUrl: pdfUrl || newActivity.pdfUrl || ''
        };

        if (newActivity.id) activityPayload.id = newActivity.id;

        const saved = await saveActivity(activityPayload);
        if (saved) {
            if (newActivity.id) {
                setActivities(activities.map(a => a.id === saved.id ? saved : a));
            } else {
                setActivities([...activities, saved]);
            }
            setIsActivityModalOpen(false);
            setNewActivity({});
            setActivityImageFile(null);
            setActivityImagePreview(null);
            setActivityPdfFile(null);
        }
    } catch (error) {
        alert("Error processing files.");
    } finally {
        setIsUploading(false);
    }
  };

  const handleEditActivity = (activity: Activity) => {
      setNewActivity(activity);
      setActivityImageFile(null);
      setActivityImagePreview(null);
      setActivityPdfFile(null);
      setIsActivityModalOpen(true);
  };

  const handleDeleteActivity = async (id: string) => {
      const success = await deleteActivity(id);
      if (success) setActivities(activities.filter(a => a.id !== id));
  };

  const handleAIGenerate = async (field: 'description' | 'aiNotes', topic: string) => {
    if (!topic) return alert("Please enter a title/topic first.");
    setIsGenerating(true);
    const content = await generateSessionContent(topic, field === 'description' ? 'description' : 'quiz');
    setNewSession(prev => ({ ...prev, [field]: content }));
    setIsGenerating(false);
  };

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

  // Student Functions
  const handleAddStudentRow = () => {
    if (!selectedClassId) return;
    const tempId = `temp-${Date.now()}`;
    setStudents([...students, {
      id: tempId,
      classId: selectedClassId,
      name: '',
      note1: 0,
      note2: 0,
      note3: 0
    }]);
  };

  const handleUpdateStudentLocal = (id: string, field: keyof Student, value: string | number) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSaveStudent = async (student: Student) => {
    if (!student.name) return alert("Student name is required");
    const saved = await saveStudent(student);
    if (saved) setStudents(prev => prev.map(s => s.id === student.id ? saved : s));
  };

  const handleDeleteStudent = async (id: string) => {
    if (id.startsWith('temp-')) {
      setStudents(prev => prev.filter(s => s.id !== id));
      return;
    }
    const success = await deleteStudent(id);
    if (success) setStudents(prev => prev.filter(s => s.id !== id));
  };

  const calculateAverage = (s: Student) => {
    const sum = (Number(s.note1) || 0) + (Number(s.note2) || 0) + (Number(s.note3) || 0);
    return (sum / 3).toFixed(2);
  };

  // Scan & Merge Functionality
  const handleScanImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
        const results = await extractGradesFromImage(file);
        setScannedResults(results);
    } catch (error) {
        alert("Failed to scan image. Please try again.");
    } finally {
        setIsScanning(false);
    }
  };

  const handleMergeScannedData = async () => {
    if (!selectedClassId) return;
    
    setIsScanning(true); // Re-use spinner
    try {
        // Iterate over scanned results and merge/add
        for (const scan of scannedResults) {
            const existingStudent = students.find(s => s.name.toLowerCase().trim() === scan.name.toLowerCase().trim());
            
            const studentPayload: Partial<Student> = {
                classId: selectedClassId,
                name: scan.name,
                note1: scan.note1 > 0 ? scan.note1 : (existingStudent?.note1 || 0),
                note2: scan.note2 > 0 ? scan.note2 : (existingStudent?.note2 || 0),
                note3: scan.note3 > 0 ? scan.note3 : (existingStudent?.note3 || 0),
            };

            if (existingStudent) {
                studentPayload.id = existingStudent.id;
            }
            
            await saveStudent(studentPayload);
        }
        
        // Refresh local list
        const refreshedData = await getStudents(selectedClassId);
        setStudents(refreshedData);
        setIsScanModalOpen(false);
        setScannedResults([]);
    } catch (error) {
        alert("Error saving scanned data.");
    } finally {
        setIsScanning(false);
    }
  };

  const displayedSessions = selectedClassId 
    ? sessions.filter(s => s.classId === selectedClassId)
    : sessions;

  if (isLoading) {
      return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center">
              <div className="text-center">
                  <Loader2 className="w-10 h-10 animate-spin text-brand-600 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">Loading Dashboard...</p>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-28 pb-12 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Teacher Dashboard</h1>
            <p className="text-slate-500 font-medium text-lg">Manage your digital classroom efficiently.</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setIsClassModalOpen(true)}
              className="inline-flex items-center px-6 py-3 bg-white border border-slate-200 rounded-full text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Class
            </button>
            <button
              onClick={() => {
                  setIsActivityModalOpen(true);
                  setNewActivity({});
                  setActivityImageFile(null);
                  setActivityImagePreview(null);
                  setActivityPdfFile(null);
              }}
              className="inline-flex items-center px-6 py-3 bg-white border border-slate-200 rounded-full text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all hover:-translate-y-0.5"
            >
              <Calendar className="w-4 h-4 mr-2" />
              New Activity
            </button>
            <button
              onClick={() => handleOpenSessionModal()}
              className="inline-flex items-center px-6 py-3 bg-brand-600 rounded-full text-sm font-bold text-white hover:bg-brand-700 shadow-lg shadow-brand-500/30 transition-all hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Session
            </button>
          </div>
        </div>

        {/* Floating Tab Navigation (Pill Style) */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex bg-white p-1.5 rounded-full shadow-soft border border-slate-100">
            {[
              { id: 'classes', label: 'Classes', icon: Folder },
              { id: 'sessions', label: 'Sessions', icon: Video },
              { id: 'grades', label: 'Gradebook', icon: Calculator },
              { id: 'activities', label: 'CMS', icon: Calendar }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 ${
                  activeTab === tab.id 
                    ? 'bg-slate-900 text-white shadow-lg' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* --- CLASSES TAB --- */}
        {activeTab === 'classes' && (
          <div className="animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {classes.map(cls => {
                 const sessionCount = sessions.filter(s => s.classId === cls.id).length;
                 return (
                  <div key={cls.id} className="bg-white rounded-5xl shadow-card border border-slate-100 p-8 hover:shadow-xl transition-all duration-300 group">
                    <div className="flex justify-between items-start mb-8">
                      <div className="p-5 bg-brand-50 rounded-3xl group-hover:bg-brand-600 transition-colors duration-300">
                          <Folder className="h-8 w-8 text-brand-600 group-hover:text-white transition-colors" />
                      </div>
                      <button 
                          onClick={() => handleDeleteClass(cls.id)} 
                          className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      >
                          <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">{cls.name}</h3>
                    <p className="text-slate-500 text-sm mb-8 leading-relaxed font-medium">{cls.description || 'No description provided.'}</p>
                    
                    <div className="flex items-center gap-6 pt-6 border-t border-slate-50">
                        <div>
                            <span className="block text-2xl font-bold text-slate-900">{sessionCount}</span>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sessions</span>
                        </div>
                    </div>
                  </div>
                 );
              })}
              
              {/* Add New Class Card Button */}
              <button 
                onClick={() => setIsClassModalOpen(true)}
                className="rounded-5xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-8 text-slate-400 hover:text-brand-600 hover:border-brand-200 hover:bg-brand-50/30 transition-all duration-300 min-h-[340px] group"
              >
                  <div className="p-6 bg-slate-50 rounded-full mb-6 group-hover:bg-white group-hover:shadow-lg transition-all">
                      <Plus className="w-8 h-8" />
                  </div>
                  <span className="font-bold text-lg">Create New Class</span>
              </button>
            </div>
          </div>
        )}

        {/* --- SESSIONS TAB --- */}
        {activeTab === 'sessions' && (
          <div className="animate-fadeIn">
             {!selectedClassId ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                   {classes.map(cls => {
                      const count = sessions.filter(s => s.classId === cls.id).length;
                      return (
                        <div 
                          key={cls.id} 
                          onClick={() => setSelectedClassId(cls.id)}
                          className="bg-white rounded-5xl p-8 shadow-card border border-slate-100 cursor-pointer hover:border-brand-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
                        >
                          <div className="flex items-center gap-6">
                            <div className="p-5 bg-slate-50 rounded-3xl group-hover:bg-brand-600 transition-colors duration-300">
                              <Video className="w-8 h-8 text-slate-400 group-hover:text-white transition-colors" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-slate-900">{cls.name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                <p className="text-sm font-bold text-slate-500">{count} Sessions</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                   })}
                </div>
             ) : (
                <div className="space-y-8">
                   <div className="flex items-center gap-6 mb-8">
                      <button 
                        onClick={() => setSelectedClassId(null)}
                        className="p-4 bg-white rounded-full shadow-soft hover:bg-slate-50 transition-colors hover:scale-105"
                      >
                         <ArrowLeft className="w-5 h-5 text-slate-600" />
                      </button>
                      <div>
                          <h2 className="text-3xl font-bold text-slate-900">
                            {classes.find(c => c.id === selectedClassId)?.name}
                          </h2>
                          <p className="text-slate-500 font-medium">Managing sessions for this class</p>
                      </div>
                   </div>

                   {displayedSessions.map(session => {
                      const videoUrls = session.videoUrls && session.videoUrls.length > 0 ? session.videoUrls : [session.videoUrl];
                      return (
                          <div key={session.id} className="bg-white rounded-5xl shadow-card border border-slate-100 overflow-hidden hover:shadow-lg transition-shadow">
                              <div className="p-8 md:p-10">
                                  <div className="flex justify-between items-start mb-8">
                                      <div>
                                          <div className="flex items-center gap-3 mb-3">
                                              <span className="px-4 py-1.5 rounded-full bg-brand-50 text-brand-700 text-xs font-bold uppercase tracking-widest">
                                                  {session.date}
                                              </span>
                                              {session.isHighlight && (
                                                <span className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold uppercase tracking-widest flex items-center">
                                                    <Star className="w-3 h-3 mr-1 fill-current" /> Featured
                                                </span>
                                              )}
                                          </div>
                                          <h3 className="text-2xl md:text-3xl font-bold text-slate-900">{session.title}</h3>
                                      </div>
                                      <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleOpenSessionModal(session)}
                                            className="p-3 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-all"
                                            title="Edit Session"
                                        >
                                            <Pencil className="h-5 w-5" />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteSession(session.id)} 
                                            className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                            title="Delete Session"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                      </div>
                                  </div>

                                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                      {/* Video Section */}
                                      <div className="lg:col-span-1 space-y-6">
                                         {videoUrls.map((url, idx) => {
                                            const embedUrl = getEmbedUrl(url);
                                            const isDrive = embedUrl.includes('drive.google.com');
                                            return (
                                            <div key={idx} className="rounded-3xl overflow-hidden bg-slate-900 aspect-video shadow-2xl relative group ring-4 ring-slate-100">
                                                {isDrive ? (
                                                    <iframe 
                                                        src={embedUrl} 
                                                        className="w-full h-full border-0" 
                                                        allowFullScreen 
                                                        title="Video Player"
                                                    />
                                                ) : (
                                                    <video 
                                                        controls 
                                                        className="w-full h-full object-cover"
                                                        src={embedUrl}
                                                    />
                                                )}
                                            </div>
                                         )})}
                                      </div>

                                      {/* Content Section */}
                                      <div className="lg:col-span-2 space-y-6">
                                          <div>
                                              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-3">Description</h4>
                                              <p className="text-slate-600 leading-relaxed bg-slate-50 p-8 rounded-4xl font-medium">
                                                  {session.description}
                                              </p>
                                          </div>
                                          
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                              {session.aiNotes && (
                                                  <div className="bg-amber-50 p-8 rounded-4xl border border-amber-100/50">
                                                      <h4 className="text-sm font-bold text-amber-800 uppercase tracking-widest mb-3 flex items-center">
                                                          <Sparkles className="w-4 h-4 mr-2" /> AI Quiz / Notes
                                                      </h4>
                                                      <p className="text-amber-900/80 text-sm whitespace-pre-line font-medium leading-relaxed">{session.aiNotes}</p>
                                                  </div>
                                              )}
                                              {session.pdfUrl && (
                                                  <a href={session.pdfUrl} target="_blank" rel="noreferrer" className="bg-blue-50 p-8 rounded-4xl border border-blue-100/50 flex items-center justify-center flex-col text-center hover:bg-blue-100 transition-colors group">
                                                      <div className="p-4 bg-white rounded-2xl shadow-sm mb-3 group-hover:scale-110 transition-transform">
                                                          <FileText className="w-8 h-8 text-blue-500" />
                                                      </div>
                                                      <span className="font-bold text-blue-700">Download PDF Resource</span>
                                                  </a>
                                              )}
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      );
                   })}
                </div>
             )}
          </div>
        )}

        {/* --- GRADES TAB --- */}
        {activeTab === 'grades' && (
          <div className="animate-fadeIn">
            {!selectedClassId ? (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {classes.map(cls => (
                    <div 
                      key={cls.id} 
                      onClick={() => setSelectedClassId(cls.id)}
                      className="bg-white rounded-5xl p-8 shadow-card border border-slate-100 cursor-pointer hover:border-brand-200 hover:shadow-xl transition-all duration-300 group"
                    >
                      <div className="flex items-center gap-6">
                        <div className="p-5 bg-slate-50 rounded-3xl group-hover:bg-brand-600 transition-colors duration-300">
                          <GraduationCap className="w-8 h-8 text-slate-400 group-hover:text-white transition-colors" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-slate-900">{cls.name}</h3>
                          <p className="text-sm font-bold text-slate-500">Open Gradebook</p>
                        </div>
                      </div>
                    </div>
                  ))}
               </div>
            ) : (
               <div className="bg-white rounded-5xl shadow-card border border-slate-100 overflow-hidden">
                  <div className="px-10 py-10 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-6">
                     <div className="flex items-center gap-6">
                       <button 
                          onClick={() => setSelectedClassId(null)}
                          className="p-4 bg-slate-50 rounded-full shadow-sm hover:bg-slate-100 transition-colors"
                       >
                         <ArrowLeft className="w-5 h-5 text-slate-600" />
                       </button>
                       <div>
                           <h2 className="text-3xl font-bold text-slate-900">
                              {classes.find(c => c.id === selectedClassId)?.name}
                           </h2>
                           <p className="text-slate-500 font-medium">Grading Sheet</p>
                       </div>
                     </div>
                     <div className="flex gap-4">
                        <button
                            onClick={() => {
                                setIsScanModalOpen(true);
                                setScannedResults([]);
                            }}
                            className="inline-flex items-center px-6 py-4 bg-brand-600 rounded-full text-sm font-bold text-white hover:bg-brand-700 shadow-lg shadow-brand-500/30 transition-all hover:-translate-y-0.5"
                        >
                            <Scan className="w-4 h-4 mr-2" />
                            AI Scan
                        </button>
                        <button
                            onClick={handleAddStudentRow}
                            className="inline-flex items-center px-8 py-4 bg-slate-900 rounded-full text-sm font-bold text-white hover:bg-slate-800 shadow-lg transition-all hover:-translate-y-0.5"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Student
                        </button>
                     </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                       <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100">
                             <th className="px-10 py-6 text-left text-xs font-extrabold text-slate-400 uppercase tracking-widest">Student Name</th>
                             <th className="px-6 py-6 text-center text-xs font-extrabold text-slate-400 uppercase tracking-widest w-32">Term 1</th>
                             <th className="px-6 py-6 text-center text-xs font-extrabold text-slate-400 uppercase tracking-widest w-32">Term 2</th>
                             <th className="px-6 py-6 text-center text-xs font-extrabold text-slate-400 uppercase tracking-widest w-32">Term 3</th>
                             <th className="px-6 py-6 text-center text-xs font-extrabold text-slate-400 uppercase tracking-widest w-32">Average</th>
                             <th className="px-10 py-6 text-right text-xs font-extrabold text-slate-400 uppercase tracking-widest w-40">Actions</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {students.map((student) => (
                             <tr key={student.id} className="hover:bg-slate-50/30 transition-colors">
                                <td className="px-10 py-6 whitespace-nowrap">
                                   <input 
                                      type="text" 
                                      value={student.name}
                                      onChange={(e) => handleUpdateStudentLocal(student.id, 'name', e.target.value)}
                                      className="w-full bg-transparent border-none focus:ring-0 font-bold text-slate-900 placeholder-slate-300 text-lg"
                                      placeholder="Student Name"
                                   />
                                </td>
                                {['note1', 'note2', 'note3'].map((note) => (
                                    <td key={note} className="px-6 py-6 whitespace-nowrap">
                                        <div className="flex justify-center">
                                            <input 
                                                type="number" 
                                                value={student[note as keyof Student]}
                                                onChange={(e) => handleUpdateStudentLocal(student.id, note as keyof Student, Number(e.target.value))}
                                                className="w-20 bg-slate-50 rounded-2xl border-transparent focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 text-center font-bold text-slate-700 py-3 transition-all"
                                            />
                                        </div>
                                    </td>
                                ))}
                                <td className="px-6 py-6 whitespace-nowrap text-center">
                                   <span className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-brand-50 text-brand-700 font-bold text-sm">
                                      {calculateAverage(student)}
                                   </span>
                                </td>
                                <td className="px-10 py-6 whitespace-nowrap text-right">
                                   <div className="flex justify-end gap-3">
                                      {/* View Profile Button */}
                                      {!student.id.startsWith('temp-') && (
                                          <Link 
                                            to={`/student-profile/${student.id}`}
                                            className="p-3 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-colors"
                                            title="View Profile"
                                          >
                                            <User className="w-5 h-5" />
                                          </Link>
                                      )}
                                      <button 
                                        onClick={() => handleSaveStudent(student)}
                                        className="p-3 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-colors"
                                        title="Quick Save"
                                      >
                                         <Save className="w-5 h-5" />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteStudent(student.id)}
                                        className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                        title="Delete"
                                      >
                                         <Trash2 className="w-5 h-5" />
                                      </button>
                                   </div>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                  </div>
               </div>
            )}
          </div>
        )}

        {/* --- ACTIVITIES TAB --- */}
        {activeTab === 'activities' && (
            <div className="animate-fadeIn grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {activities.map(activity => (
                    <div key={activity.id} className="bg-white rounded-5xl shadow-card border border-slate-100 overflow-hidden flex flex-col hover:shadow-xl transition-all duration-300 group">
                        <div className="h-64 w-full relative overflow-hidden bg-slate-100">
                             {activity.imageUrl ? (
                                <img 
                                    src={activity.imageUrl} 
                                    alt={activity.title} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                />
                             ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                    <ImageIcon className="w-16 h-16" />
                                </div>
                             )}
                             <div className="absolute top-6 left-6">
                                <span className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold text-slate-900 shadow-sm flex items-center">
                                    <Calendar className="w-3 h-3 mr-2 text-brand-500" />
                                    {activity.date}
                                </span>
                             </div>
                        </div>
                        
                        <div className="p-8 flex-1 flex flex-col">
                            <h3 className="text-2xl font-bold text-slate-900 mb-3">{activity.title}</h3>
                            <p className="text-slate-500 text-sm leading-relaxed line-clamp-3 flex-1 mb-8 font-medium">
                                {activity.description}
                            </p>
                            
                            <div className="flex justify-between items-center pt-6 border-t border-slate-50">
                                {activity.pdfUrl ? (
                                    <span className="flex items-center text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-full">
                                        <FileText className="w-3 h-3 mr-1.5" /> PDF Attached
                                    </span>
                                ) : <span></span>}
                                <div className="flex gap-2">
                                    <button onClick={() => handleEditActivity(activity)} className="p-3 text-slate-400 hover:text-brand-600 hover:bg-slate-50 rounded-full transition-colors"><Pencil className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeleteActivity(activity.id)} className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* --- MODALS (Re-styled) --- */}
      {/* Create Class Modal */}
      {isClassModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsClassModalOpen(false)}></div>
            <div className="bg-white rounded-5xl p-10 w-full max-w-lg relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
                <h3 className="text-3xl font-extrabold text-slate-900 mb-8">Create New Class</h3>
                <form onSubmit={handleCreateClass} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2.5 ml-1">Class Name</label>
                        <input type="text" required className="w-full rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all p-4 font-bold text-slate-900" placeholder="e.g. 5th Grade Basketball" value={newClass.name || ''} onChange={e => setNewClass({...newClass, name: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2.5 ml-1">Description</label>
                        <textarea className="w-full rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all p-4 font-medium" rows={3} value={newClass.description || ''} onChange={e => setNewClass({...newClass, description: e.target.value})}></textarea>
                    </div>
                    <div className="flex gap-4 pt-6">
                        <button type="button" className="flex-1 py-4 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-colors" onClick={() => setIsClassModalOpen(false)}>Cancel</button>
                        <button type="submit" className="flex-1 py-4 rounded-2xl font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/30 transition-all">Create Class</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Create Session Modal */}
      {isSessionModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsSessionModalOpen(false)}></div>
            <div className="bg-white rounded-5xl p-10 w-full max-w-2xl relative z-10 shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-200">
                <h3 className="text-3xl font-extrabold text-slate-900 mb-8">{newSession.id ? 'Edit Session' : 'Create New Session'}</h3>
                <form onSubmit={handleCreateSession} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Assign to Class</label>
                            <select required className="w-full rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 p-4 font-bold text-slate-900 appearance-none" value={newSession.classId || ''} onChange={e => setNewSession({...newSession, classId: e.target.value})}>
                                <option value="">Select a class...</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Date</label>
                            <input type="date" required className="w-full rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 p-4 font-bold text-slate-900" value={newSession.date || ''} onChange={e => setNewSession({...newSession, date: e.target.value})} />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Session Title</label>
                            <input type="text" required className="w-full rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 p-4 font-bold text-slate-900" placeholder="e.g. Advanced Dribbling Techniques" value={newSession.title || ''} onChange={e => setNewSession({...newSession, title: e.target.value})} />
                        </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <label className="block text-sm font-bold text-slate-900 ml-1">Video Content</label>
                            {/* Highlight Feature Toggle */}
                            <label className="flex items-center cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    checked={newSession.isHighlight || false} 
                                    onChange={e => setNewSession({...newSession, isHighlight: e.target.checked})}
                                    className="hidden" 
                                />
                                <span className={`mr-2 text-xs font-bold transition-colors ${newSession.isHighlight ? 'text-amber-500' : 'text-slate-400 group-hover:text-slate-500'}`}>Feature on Home Page</span>
                                <div className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${newSession.isHighlight ? 'bg-amber-400' : 'bg-slate-200'}`}>
                                    <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ${newSession.isHighlight ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                </div>
                            </label>
                        </div>
                        
                        <div className="space-y-3 mb-4">
                            {pendingVideos.map((video) => (
                                <div key={video.id} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                                            {video.type === 'link' ? <LinkIcon className="w-4 h-4" /> : <Film className="w-4 h-4" />}
                                        </div>
                                        <span className="text-sm font-bold text-slate-700 truncate">{video.display}</span>
                                    </div>
                                    <button type="button" onClick={() => handleRemovePendingVideo(video.id)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors"><X className="w-4 h-4" /></button>
                                </div>
                            ))}
                        </div>
                        
                        <div className="flex gap-4 items-center">
                            <div className="flex bg-white rounded-full p-1 border border-slate-200 shadow-sm">
                                <button type="button" onClick={() => setTempVideoType('link')} className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${tempVideoType === 'link' ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>Link</button>
                                <button type="button" onClick={() => setTempVideoType('upload')} className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${tempVideoType === 'upload' ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>Upload</button>
                            </div>
                            <div className="flex-grow">
                                {tempVideoType === 'link' ? (
                                    <div className="flex gap-2">
                                        <input type="url" className="w-full rounded-2xl border-none bg-white shadow-sm text-sm p-3 font-medium placeholder-slate-400" placeholder="Paste URL (Dropbox, Google Drive)..." value={tempVideoInput} onChange={e => setTempVideoInput(e.target.value)} />
                                        <button type="button" onClick={handleAddVideoToPending} className="bg-brand-600 text-white px-5 rounded-2xl text-sm font-bold hover:bg-brand-700 shadow-lg shadow-brand-500/20">Add</button>
                                    </div>
                                ) : (
                                    <label className="cursor-pointer flex items-center justify-center w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm">
                                        <Upload className="w-4 h-4 mr-2" /> Choose File
                                        <input type="file" className="hidden" accept="video/*" onChange={handleFileSelect} />
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2 ml-1">
                            <label className="block text-sm font-bold text-slate-700">Description</label>
                            <button type="button" onClick={() => handleAIGenerate('description', newSession.title || '')} disabled={isGenerating} className="text-xs font-bold flex items-center text-brand-600 bg-brand-50 px-3 py-1.5 rounded-full hover:bg-brand-100 transition-colors">
                                {isGenerating ? <Loader2 className="w-3 h-3 animate-spin mr-1"/> : <Sparkles className="w-3 h-3 mr-1"/>} AI Assist
                            </button>
                        </div>
                        <textarea className="w-full rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 p-4 font-medium" rows={3} value={newSession.description || ''} onChange={e => setNewSession({...newSession, description: e.target.value})}></textarea>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2 ml-1">
                            <label className="block text-sm font-bold text-slate-700">Quiz / Notes</label>
                            <button type="button" onClick={() => handleAIGenerate('aiNotes', newSession.title || '')} disabled={isGenerating} className="text-xs font-bold flex items-center text-brand-600 bg-brand-50 px-3 py-1.5 rounded-full hover:bg-brand-100 transition-colors">
                                {isGenerating ? <Loader2 className="w-3 h-3 animate-spin mr-1"/> : <Sparkles className="w-3 h-3 mr-1"/>} Generate Quiz
                            </button>
                        </div>
                        <textarea className="w-full rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 p-4 font-medium" rows={3} value={newSession.aiNotes || ''} onChange={e => setNewSession({...newSession, aiNotes: e.target.value})}></textarea>
                    </div>

                    <div className="flex gap-4 pt-6">
                        <button type="button" className="flex-1 py-4 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-colors" onClick={() => setIsSessionModalOpen(false)}>Cancel</button>
                        <button type="submit" disabled={isSavingSession} className="flex-1 py-4 rounded-2xl font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/30 transition-all disabled:opacity-70 flex justify-center items-center">
                            {isSavingSession ? <Loader2 className="w-5 h-5 animate-spin" /> : (newSession.id ? 'Update Session' : 'Save Session')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

       {/* Activity Modal */}
       {isActivityModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsActivityModalOpen(false)}></div>
            <div className="bg-white rounded-5xl p-10 w-full max-w-lg relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
                <h3 className="text-3xl font-extrabold text-slate-900 mb-8">{newActivity.id ? 'Edit Activity' : 'New Activity'}</h3>
                <form onSubmit={handleCreateActivity} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2.5 ml-1">Title</label>
                        <input type="text" required className="w-full rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 p-4 font-bold text-slate-900" value={newActivity.title || ''} onChange={e => setNewActivity({...newActivity, title: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2.5 ml-1">Date</label>
                        <input type="date" required className="w-full rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 p-4 font-bold text-slate-900" value={newActivity.date || ''} onChange={e => setNewActivity({...newActivity, date: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2.5 ml-1">Description</label>
                        <textarea className="w-full rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 p-4 font-medium" rows={3} value={newActivity.description || ''} onChange={e => setNewActivity({...newActivity, description: e.target.value})}></textarea>
                    </div>
                    
                    {/* Image & PDF Uploads styling similar to above */}
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                        <label className="cursor-pointer flex items-center justify-between w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 hover:bg-slate-50 transition-colors shadow-sm">
                            <span className="text-sm font-bold text-slate-700 flex items-center"><ImageIcon className="w-5 h-5 mr-3 text-brand-500"/> Cover Image</span>
                            <span className="text-xs text-brand-600 font-bold bg-brand-50 px-3 py-1.5 rounded-lg">Select</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageSelect} />
                        </label>
                        {(activityImagePreview || newActivity.imageUrl) && (
                            <div className="h-32 w-full rounded-2xl overflow-hidden relative shadow-sm border border-slate-200">
                                <img src={activityImagePreview || newActivity.imageUrl} className="w-full h-full object-cover" />
                            </div>
                        )}
                        <label className="cursor-pointer flex items-center justify-between w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 hover:bg-slate-50 transition-colors shadow-sm">
                            <span className="text-sm font-bold text-slate-700 flex items-center"><FileText className="w-5 h-5 mr-3 text-brand-500"/> PDF Document</span>
                            <span className="text-xs text-brand-600 font-bold bg-brand-50 px-3 py-1.5 rounded-lg">Select</span>
                            <input type="file" className="hidden" accept="application/pdf" onChange={(e) => setActivityPdfFile(e.target.files?.[0] || null)} />
                        </label>
                    </div>

                    <div className="flex gap-4 pt-6">
                        <button type="button" className="flex-1 py-4 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-colors" onClick={() => setIsActivityModalOpen(false)}>Cancel</button>
                        <button type="submit" disabled={isUploading} className="flex-1 py-4 rounded-2xl font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/30 transition-all disabled:opacity-70 flex justify-center">{isUploading ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Save Activity'}</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* AI Scan Gradebook Modal */}
      {isScanModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsScanModalOpen(false)}></div>
              <div className="bg-white rounded-5xl p-10 w-full max-w-2xl relative z-10 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center gap-4 mb-6">
                      <div className="p-3 bg-brand-50 rounded-2xl">
                          <Scan className="w-8 h-8 text-brand-600" />
                      </div>
                      <div>
                        <h3 className="text-3xl font-extrabold text-slate-900">AI Gradebook Scanner</h3>
                        <p className="text-slate-500 font-medium">Upload a photo of your grade sheet to auto-fill scores.</p>
                      </div>
                  </div>

                  {!scannedResults.length ? (
                      <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center bg-slate-50 hover:bg-brand-50/30 hover:border-brand-200 transition-colors group">
                          {isScanning ? (
                              <div className="flex flex-col items-center">
                                  <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
                                  <p className="text-slate-700 font-bold text-lg">Analyzing Document...</p>
                                  <p className="text-slate-400 text-sm">Extracting names and scores.</p>
                              </div>
                          ) : (
                              <label className="cursor-pointer flex flex-col items-center">
                                  <div className="p-4 bg-white rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
                                      <Upload className="w-8 h-8 text-brand-600" />
                                  </div>
                                  <span className="text-lg font-bold text-slate-900 mb-1">Click to Upload Grade Sheet</span>
                                  <span className="text-slate-400 font-medium">Supports clear handwriting or printed text</span>
                                  <input type="file" className="hidden" accept="image/*" onChange={handleScanImage} />
                              </label>
                          )}
                      </div>
                  ) : (
                      <div className="space-y-6">
                          <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 overflow-hidden">
                              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Preview Extracted Data</h4>
                              <div className="overflow-x-auto">
                                  <table className="min-w-full scan-table">
                                      <thead>
                                          <tr className="border-b border-slate-200">
                                              <th className="py-2 text-left text-xs font-bold text-slate-400">Name</th>
                                              <th className="py-2 text-center text-xs font-bold text-slate-400">T1</th>
                                              <th className="py-2 text-center text-xs font-bold text-slate-400">T2</th>
                                              <th className="py-2 text-center text-xs font-bold text-slate-400">T3</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-200">
                                          {scannedResults.map((row, idx) => (
                                              <tr key={idx}>
                                                  <td className="py-3 text-sm font-bold text-slate-700">{row.name}</td>
                                                  <td className="py-3 text-center text-sm font-medium text-slate-600">{row.note1}</td>
                                                  <td className="py-3 text-center text-sm font-medium text-slate-600">{row.note2}</td>
                                                  <td className="py-3 text-center text-sm font-medium text-slate-600">{row.note3}</td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                          
                          <div className="flex gap-4">
                              <button 
                                  onClick={() => setScannedResults([])}
                                  className="flex-1 py-4 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                              >
                                  Retake Scan
                              </button>
                              <button 
                                  onClick={handleMergeScannedData}
                                  disabled={isScanning}
                                  className="flex-1 py-4 rounded-2xl font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/30 transition-all flex justify-center items-center"
                              >
                                  {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Merge & Save Data'}
                              </button>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default Dashboard;
