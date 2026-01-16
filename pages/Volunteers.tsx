
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Role, User } from '../types';
import { validationService } from '../services/validationService';
import { loggerService } from '../services/loggerService';

interface VolunteersProps {
  volunteers?: User[];
  onUpdateStatus?: (userId: string, status: 'Available' | 'Busy' | 'OffDuty') => void;
  onAddVolunteer?: (newVolunteer: User) => void;
}

const Volunteers: React.FC<VolunteersProps> = ({ volunteers = [], onUpdateStatus, onAddVolunteer }) => {
  const [search, setSearch] = useState('');
  const [filterAvailability, setFilterAvailability] = useState<string>('All');
  const [selectedSkill, setSelectedSkill] = useState<string>('All');
  const [minTrustScore, setMinTrustScore] = useState<number>(0);
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  
  // Messaging State
  const [activeChatVolunteer, setActiveChatVolunteer] = useState<User | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<Record<string, {sender: string, text: string, time: string}[]>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Onboarding Form State
  const [newVolunteer, setNewVolunteer] = useState({
    name: '',
    email: '',
    walletAddress: '0x' + Math.random().toString(16).slice(2, 42),
    skills: [] as string[],
    location: '',
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChatVolunteer, messages]);

  const filteredVolunteers = useMemo(() => {
    return volunteers.filter(u => u.role === Role.VOLUNTEER || u.role === Role.OWNER || u.role === Role.COMMUNITY_LEADER);
  }, [volunteers]);

  const allSkillsList = ['Medical', 'Search & Rescue', 'Logistics', 'Security', 'First Aid', 'Coordination', 'Strategy', 'Medic', 'Communication', 'Heavy Equipment', 'Winter Survival'];
  
  const allSkills = useMemo(() => {
    const skills = new Set<string>();
    filteredVolunteers.forEach(v => v.skills.forEach(s => skills.add(s)));
    return Array.from(skills).sort();
  }, [filteredVolunteers]);

  const filtered = useMemo(() => {
    return filteredVolunteers.filter(v => {
      const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase()) || 
                          v.skills.some(s => s.toLowerCase().includes(search.toLowerCase())) ||
                          v.walletAddress.toLowerCase().includes(search.toLowerCase());
      const matchesAvailability = filterAvailability === 'All' || v.status === filterAvailability;
      const matchesSkill = selectedSkill === 'All' || v.skills.includes(selectedSkill);
      const matchesTrust = v.trustScore >= minTrustScore;
      const matchesVerified = !verifiedOnly || v.isVerified;
      
      return matchesSearch && matchesAvailability && matchesSkill && matchesTrust && matchesVerified;
    });
  }, [filteredVolunteers, search, filterAvailability, selectedSkill, minTrustScore, verifiedOnly]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeChatVolunteer) return;

    const vId = activeChatVolunteer.id;
    const newMsg = {
      sender: 'You',
      text: chatInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => ({
      ...prev,
      [vId]: [...(prev[vId] || []), newMsg]
    }));
    setChatInput('');

    // Mock reply
    setTimeout(() => {
      const reply = {
        sender: activeChatVolunteer.name,
        text: "Tactical data received. Awaiting command deployment orders.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(curr => ({
        ...curr,
        [vId]: [...(curr[vId] || []), reply]
      }));
    }, 1000);
  };

  const handleOnboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddVolunteer) return;

    // Validate input
    const nameValidation = validationService.validateName(newVolunteer.name);
    const emailValidation = validationService.validateEmail(newVolunteer.email);
    const locationValidation = validationService.validateDescription(newVolunteer.location);

    if (!nameValidation.isValid || !emailValidation.isValid || !locationValidation.isValid) {
      const errors = [...nameValidation.errors, ...emailValidation.errors, ...locationValidation.errors];
      loggerService.warn('Volunteers', 'Form validation failed', { errors });
      alert(errors.join('\n'));
      return;
    }

    // Validate wallet address
    const walletValidation = validationService.validateWalletAddress(newVolunteer.walletAddress);
    if (!walletValidation.isValid) {
      loggerService.warn('Volunteers', 'Invalid wallet address');
      alert(walletValidation.errors[0]);
      return;
    }

    // Validate skills
    if (newVolunteer.skills.length === 0) {
      loggerService.warn('Volunteers', 'No skills selected');
      alert('Please select at least one skill');
      return;
    }

    const volunteer: User = {
      id: `user-${Date.now()}`,
      name: newVolunteer.name,
      email: newVolunteer.email,
      role: Role.VOLUNTEER,
      trustScore: 80,
      walletAddress: newVolunteer.walletAddress,
      avatar: `https://picsum.photos/seed/${newVolunteer.name}/200/200`,
      location: newVolunteer.location,
      skills: newVolunteer.skills.length > 0 ? newVolunteer.skills : ['General Assistance'],
      isVerified: true,
      status: 'Available'
    };

    onAddVolunteer(volunteer);
    loggerService.info('Volunteers', `New volunteer added: ${volunteer.name}`, { id: volunteer.id });
    setShowOnboardModal(false);
    setNewVolunteer({
      name: '',
      email: '',
      walletAddress: '0x' + Math.random().toString(16).slice(2, 42),
      skills: [],
      location: '',
    });
  };

  const toggleSkill = (skill: string) => {
    setNewVolunteer(prev => ({
      ...prev,
      skills: prev.skills.includes(skill) 
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  return (
    <div className="p-6 md:p-10 flex flex-col gap-8 relative h-full">
      {/* Tactical Comm-Link Sidebar */}
      {activeChatVolunteer && (
        <>
          <div className="fixed inset-0 z-40 bg-background-dark/60 backdrop-blur-sm" onClick={() => setActiveChatVolunteer(null)}></div>
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-card-dark border-l border-border-dark z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
             <div className="p-6 border-b border-border-dark bg-[#111a22] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-xl bg-cover bg-center border border-primary/30" style={{ backgroundImage: `url(${activeChatVolunteer.avatar})` }}></div>
                  <div className="flex flex-col">
                    <h3 className="text-sm font-black text-white uppercase italic tracking-tighter">Secure Comm-Link</h3>
                    <div className="flex items-center gap-1.5">
                      <div className="size-1.5 rounded-full bg-accent-green animate-pulse"></div>
                      <span className="text-[10px] font-bold text-accent-green uppercase tracking-widest">{activeChatVolunteer.name}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setActiveChatVolunteer(null)} className="size-8 rounded-full hover:bg-white/5 flex items-center justify-center border border-border-dark">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
             </div>

             <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-background-dark/20">
                <div className="flex flex-col items-center gap-2 mb-8 opacity-40">
                  <span className="material-symbols-outlined text-3xl">enhanced_encryption</span>
                  <p className="text-[9px] font-black uppercase tracking-widest text-center">Protocol 4-Alpha Encrypted Channel Established<br/>Base Mainnet Auth Confirmed</p>
                </div>

                {(messages[activeChatVolunteer.id] || []).map((msg, i) => (
                  <div key={i} className={`flex flex-col ${msg.sender === 'You' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                      msg.sender === 'You' 
                        ? 'bg-primary text-white rounded-tr-none shadow-glow' 
                        : 'bg-slate-800 text-slate-200 rounded-tl-none border border-border-dark'
                    }`}>
                      {msg.text}
                    </div>
                    <span className="text-[9px] font-bold text-text-secondary mt-1 uppercase tracking-tighter">{msg.time}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
             </div>

             <form onSubmit={handleSendMessage} className="p-4 bg-[#111a22] border-t border-border-dark flex gap-2">
                <input 
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  className="flex-1 bg-background-dark border border-border-dark rounded-xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-primary outline-none"
                  placeholder="Transmit secure message..."
                />
                <button type="submit" className="bg-primary text-white size-11 rounded-xl flex items-center justify-center shadow-glow active:scale-95 transition-all">
                  <span className="material-symbols-outlined">send</span>
                </button>
             </form>
          </div>
        </>
      )}

      {/* Onboarding Modal */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-background-dark/90 backdrop-blur-md" onClick={() => setShowOnboardModal(false)}></div>
          <form 
            onSubmit={handleOnboardSubmit}
            className="bg-card-dark border border-border-dark w-full max-w-lg rounded-[3rem] p-8 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-300"
          >
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Responder Onboarding</h2>
                <p className="text-text-secondary text-[10px] font-bold uppercase tracking-widest mt-1">Register New Tactical Personnel</p>
              </div>
              <button type="button" onClick={() => setShowOnboardModal(false)} className="size-10 rounded-full hover:bg-white/5 flex items-center justify-center border border-border-dark">
                <span className="material-symbols-outlined text-white">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Full Identity Name</label>
                <input 
                  required
                  value={newVolunteer.name}
                  onChange={e => setNewVolunteer({...newVolunteer, name: e.target.value})}
                  className="w-full bg-background-dark border border-border-dark rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                  placeholder="e.g. Marcus Thorne"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Tactical Location</label>
                <input 
                  required
                  value={newVolunteer.location}
                  onChange={e => setNewVolunteer({...newVolunteer, location: e.target.value})}
                  className="w-full bg-background-dark border border-border-dark rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                  placeholder="e.g. Berlin, Germany"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Specializations</label>
                <div className="flex flex-wrap gap-2">
                  {allSkillsList.map(skill => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all ${
                        newVolunteer.skills.includes(skill) 
                          ? 'bg-primary border-primary text-white shadow-glow' 
                          : 'bg-background-dark border-border-dark text-text-secondary hover:border-slate-600'
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Assigned Base Wallet</label>
                <div className="bg-background-dark border border-border-dark rounded-xl px-4 py-3 text-[10px] font-mono text-white/40 flex justify-between items-center italic">
                  <span>{newVolunteer.walletAddress}</span>
                  <span className="material-symbols-outlined text-xs">lock</span>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full mt-4 py-4 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-glow active:scale-95 transition-all"
              >
                Initialize Profile
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black text-white leading-none italic uppercase tracking-tighter">Responder Tactical Network</h1>
          <p className="text-text-secondary text-base italic">Direct coordination with peer-verified volunteers and tactical professionals. v2.5.0</p>
        </div>
        <div className="flex gap-4">
           <div className="hidden lg:flex flex-col items-end justify-center px-4 border-r border-border-dark">
              <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Network Health</p>
              <p className="text-sm font-black text-accent-green uppercase tracking-widest italic">EXCELLENT</p>
           </div>
           <button 
            onClick={() => setShowOnboardModal(true)}
            className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl font-black uppercase italic text-sm transition-all shadow-glow flex items-center gap-2 active:scale-95"
           >
             <span className="material-symbols-outlined text-[20px]">person_add</span>
             Onboard Volunteer
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Advanced Search Panel */}
        <aside className="lg:col-span-3 bg-card-dark p-6 rounded-2xl border border-border-dark flex flex-col gap-8 shadow-xl h-fit sticky top-24">
           <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2 italic">
              <span className="material-symbols-outlined text-primary text-base">search_check</span> Search & Filters
           </h3>

           <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Keyword Search</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">search</span>
                  <input 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-background-dark border border-border-dark rounded-xl pl-10 p-2.5 text-xs text-white focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-text-secondary/30 font-bold" 
                    placeholder="Name, Skill, or Wallet..."
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Availability Status</label>
                <div className="grid grid-cols-2 gap-2">
                   {['All', 'Available', 'Busy', 'OffDuty'].map(status => (
                     <button 
                        key={status}
                        onClick={() => setFilterAvailability(status)}
                        className={`py-2 rounded-lg text-[9px] font-black uppercase border transition-all ${
                          filterAvailability === status ? 'bg-primary/20 text-white border-primary/50 shadow-glow' : 'bg-background-dark/50 text-text-secondary border-border-dark'
                        }`}
                     >
                       {status}
                     </button>
                   ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Tactical Skills</label>
                <select 
                  value={selectedSkill}
                  onChange={e => setSelectedSkill(e.target.value)}
                  className="bg-background-dark border border-border-dark rounded-xl text-xs text-white focus:ring-primary h-10 px-3 outline-none font-bold"
                >
                  <option value="All">All Disciplines</option>
                  {allSkills.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Min Trust Score</label>
                  <span className="text-xs font-mono text-primary font-bold">{minTrustScore}+</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="95" step="5"
                  value={minTrustScore}
                  onChange={e => setMinTrustScore(parseInt(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-background-dark rounded-lg cursor-pointer appearance-none"
                />
              </div>

              <div className="pt-4 border-t border-border-dark">
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">Verified Only</span>
                    <span className="text-[8px] text-text-secondary uppercase font-black">Require ID Validation</span>
                  </div>
                  <div 
                    onClick={() => setVerifiedOnly(!verifiedOnly)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${verifiedOnly ? 'bg-primary' : 'bg-slate-700'}`}
                  >
                    <div className={`absolute top-1 size-3 bg-white rounded-full transition-all ${verifiedOnly ? 'left-6' : 'left-1'}`}></div>
                  </div>
                </label>
              </div>

              <button 
                onClick={() => {
                  setSearch('');
                  setFilterAvailability('All');
                  setSelectedSkill('All');
                  setMinTrustScore(0);
                  setVerifiedOnly(false);
                }}
                className="w-full py-2.5 rounded-xl border border-border-dark text-[10px] font-black text-text-secondary uppercase tracking-widest hover:bg-white/5 transition-all italic"
              >
                Clear All Criteria
              </button>
           </div>
        </aside>

        {/* Results Grid */}
        <div className="lg:col-span-9 flex flex-col gap-6">
          <div className="flex items-center justify-between px-2">
            <p className="text-xs text-text-secondary italic">Discovered <strong>{filtered.length}</strong> active responders matching criteria</p>
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-1.5 text-[10px] text-accent-green font-black uppercase tracking-widest">
                  <span className="size-1.5 rounded-full bg-accent-green"></span>
                  Online: {filtered.filter(v => v.status === 'Available').length}
               </div>
               <div className="flex items-center gap-1.5 text-[10px] text-accent-orange font-black uppercase tracking-widest">
                  <span className="size-1.5 rounded-full bg-accent-orange"></span>
                  Active: {filtered.filter(v => v.status === 'Busy').length}
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map(v => (
              <div key={v.id} className="bg-card-dark border border-border-dark rounded-2xl overflow-hidden group hover:border-primary transition-all duration-500 flex flex-col shadow-lg relative animate-in fade-in zoom-in-95 duration-300">
                <div className="p-6 flex flex-col gap-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="size-14 rounded-2xl bg-cover bg-center border border-white/10 shadow-md group-hover:scale-105 transition-transform" style={{ backgroundImage: `url(${v.avatar})` }}></div>
                        {v.isVerified && (
                          <div className="absolute -bottom-1 -right-1 size-5 bg-primary rounded-full flex items-center justify-center border-2 border-card-dark shadow-glow">
                            <span className="material-symbols-outlined text-[10px] text-white filled">verified</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <h3 className="text-lg font-black text-white leading-tight group-hover:text-primary transition-colors uppercase italic tracking-tighter">{v.name}</h3>
                        <div className="flex items-center gap-1 mt-1 text-[10px] font-mono text-text-secondary">
                          <span className="truncate max-w-[100px] font-bold">{v.walletAddress}</span>
                          <span className="material-symbols-outlined text-xs opacity-40">content_copy</span>
                        </div>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-colors ${
                      v.status === 'Available' ? 'bg-accent-green/10 text-accent-green border-accent-green/30' : 
                      v.status === 'Busy' ? 'bg-accent-orange/10 text-accent-orange border-accent-orange/30 shadow-glow-orange' :
                      'bg-slate-700/30 text-slate-400 border-slate-700/50'
                    }`}>
                      {v.status}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Reputation Profile</span>
                        <span className="text-xs font-black text-white">{v.trustScore}% <span className="text-[10px] font-normal opacity-40 uppercase ml-1">Trust</span></span>
                      </div>
                      <div className="w-full bg-background-dark rounded-full h-1.5 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary to-accent-green rounded-full shadow-glow transition-all duration-700" style={{ width: `${v.trustScore}%` }}></div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {v.skills.map(s => (
                        <span key={s} className="px-2.5 py-1 rounded-lg bg-background-dark/80 border border-border-dark text-slate-300 text-[9px] font-black uppercase tracking-wider group-hover:border-primary/20 transition-colors italic">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-auto px-6 py-4 bg-background-dark/30 border-t border-border-dark flex items-center justify-between gap-4">
                  <button 
                    onClick={() => onUpdateStatus?.(v.id, v.status === 'Available' ? 'Busy' : 'Available')}
                    className={`flex-1 py-3 rounded-xl border transition-all active:scale-95 shadow-sm text-[10px] font-black uppercase tracking-widest italic ${
                      v.status === 'Available' ? 'bg-primary border-primary text-white hover:bg-primary-dark shadow-glow' : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {v.status === 'Available' ? 'Assign Deployment' : 'Complete Mission'}
                  </button>
                  <button 
                    onClick={() => setActiveChatVolunteer(v)}
                    className="size-11 rounded-xl bg-white/5 border border-border-dark text-text-secondary hover:text-white transition-all flex items-center justify-center group/chat hover:border-primary"
                  >
                    <span className="material-symbols-outlined text-[20px] group-hover/chat:scale-110 group-hover/chat:text-primary transition-all">chat_bubble</span>
                  </button>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="col-span-full py-20 bg-card-dark/30 border-2 border-dashed border-border-dark rounded-[3rem] flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-6xl text-text-secondary/20 mb-4">person_search</span>
                <p className="text-xl font-black text-white/50 uppercase tracking-widest italic">No Responders Found</p>
                <p className="text-sm text-text-secondary max-w-xs mt-2 italic opacity-60">Expand your tactical search parameters or clear filters.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Volunteers;
