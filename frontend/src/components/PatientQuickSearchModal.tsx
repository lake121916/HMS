import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Phone, Calendar, ShieldAlert, ArrowRight, X, Loader2, Scan } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getRolePatientWorkflowUrl } from '../utils/roleWorkflowRouting';

interface PatientQuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenScanner?: () => void;
}

export const PatientQuickSearchModal: React.FC<PatientQuickSearchModalProps> = ({ isOpen, onClose, onOpenScanner }) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    } else {
      setQuery('');
      setPatients([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounced search query
  useEffect(() => {
    if (!isOpen) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setPatients([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/patients', {
          params: { search: trimmed, limit: 8 }
        });
        if (res.data?.success) {
          const list = res.data.data?.patients || [];
          setPatients(list);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error('Patient search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  // Navigate according to active role workbench
  const handleSelectPatient = (patient: any) => {
    onClose();
    navigate(getRolePatientWorkflowUrl(user?.role || '', patient.id));
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(idx => (idx < patients.length - 1 ? idx + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(idx => (idx > 0 ? idx - 1 : patients.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (patients[selectedIndex]) {
        handleSelectPatient(patients[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/60 backdrop-blur-sm transition-all"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 gap-3">
          <Search className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={
              language === 'am'
                ? 'ታካሚን በስም፣ በስልክ (09...)፣ ወይም በታካሚ ቁጥር (PAT-...) ፈልግ...'
                : 'Search patient by Name, Phone (09...), or MRN (PAT-...) [Ctrl + K]'
            }
            className="flex-1 bg-transparent text-sm font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />}
          {query && !loading && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {onOpenScanner && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenScanner();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-bold transition shrink-0"
              title="Switch to camera QR scanning"
            >
              <Scan className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Scan QR</span>
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {query.trim().length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30 text-blue-500" />
              <p className="font-semibold text-slate-600 dark:text-slate-400">
                {language === 'am' ? 'ፈጣን የታካሚ ፍለጋ' : 'Universal Patient Quick-Search'}
              </p>
              <p className="mt-1">
                {language === 'am'
                  ? 'የታካሚውን ስም፣ የኢትዮጵያ ስልክ ቁጥር ወይም መለያ ቁጥር ይተይቡ'
                  : 'Type patient name, Ethiopian phone number (09... / +2519...), or MRN'}
              </p>
            </div>
          )}

          {query.trim().length > 0 && !loading && patients.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-500">
              <p className="font-bold text-slate-700 dark:text-slate-300">
                {language === 'am' ? 'ምንም ታካሚ አልተገኘም' : 'No matching patients found'}
              </p>
              <p className="mt-1 text-slate-400">
                {language === 'am'
                  ? `ለ "${query}" ምንም መረጃ አልተገኘም`
                  : `No records found matching "${query}"`}
              </p>
            </div>
          )}

          {patients.map((pat, idx) => {
            const isSelected = idx === selectedIndex;
            const age = pat.date_of_birth
              ? Math.floor((new Date().getTime() - new Date(pat.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
              : null;

            return (
              <div
                key={pat.id}
                onClick={() => handleSelectPatient(pat)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <User className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                        {pat.first_name} {pat.last_name}
                      </span>
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md">
                        PAT-{String(pat.id).padStart(6, '0')}
                      </span>
                      {pat.blood_type && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded">
                          {pat.blood_type}
                        </span>
                      )}
                      {pat.allergies && (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900 rounded">
                          <ShieldAlert className="w-3 h-3 text-amber-600" /> Allergies
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {pat.phone && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3" /> {pat.phone}
                        </span>
                      )}
                      {age !== null && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {age} yrs ({pat.gender || 'N/A'})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1 text-blue-600 dark:text-blue-400 text-xs font-bold pl-2">
                  <span className="hidden sm:inline">Open</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
            <span>esc to dismiss</span>
          </div>
          <span className="font-semibold text-slate-500 dark:text-slate-400">
            Alem Ketema Enat Hospital
          </span>
        </div>
      </div>
    </div>
  );
};
export default PatientQuickSearchModal;
