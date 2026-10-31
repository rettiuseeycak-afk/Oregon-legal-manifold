import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Scale, 
  FolderOpen, 
  Plus, 
  Trash2, 
  ChevronRight, 
  Database, 
  Gavel, 
  FileText, 
  Zap,
  ShieldAlert,
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  Anchor,
  Building2,
  MessageSquare,
  Activity,
  Heart,
  Shield,
  Key,
  FolderPlus,
  Clock,
  Layers,
  FolderSearch,
  Book,
  Fingerprint,
  Mail,
  Compass,
  Download,
  FileDown,
  Sparkles
} from 'lucide-react';
import { Case, Evidence, LegalClaim, requirePlan, SubscriptionPlanId } from './types';
import { UpgradeModal } from './components/UpgradeModal';
import { EvidenceManifold } from './components/EvidenceManifold';
import { CourtRulesEditor } from './components/CourtRulesEditor';
import { ClaimsEditor } from './components/ClaimsEditor';
import { DiscoveryPlan } from './components/DiscoveryPlan';
import { DocumentGenerator } from './components/DocumentGenerator';
import { JudicialReview } from './components/JudicialReview';
import { CitationAudit } from './components/CitationAudit';
import { FilingChecklist } from './components/FilingChecklist';
import { AdversarialSimulation } from './components/AdversarialSimulation';
import { CorporateDisclosure } from './components/CorporateDisclosure';
import { InterrogatoryGenerator } from './components/InterrogatoryGenerator';
import { SmallClaimsEngine } from './components/SmallClaimsEngine';
import { FamilyLawEngine } from './components/FamilyLawEngine';
import { CivilRightsEngine } from './components/CivilRightsEngine';
import { EstatePropertyEngine } from './components/EstatePropertyEngine';
import { DurableGuardianshipEngine } from './components/DurableGuardianshipEngine';
import { CaseLoadProcessor } from './components/CaseLoadProcessor';
import { FindingsBinder } from './components/FindingsBinder';
import { IntelligenceCenter } from './components/IntelligenceCenter';
import { CoCounselChat } from './components/CoCounselChat';
import { LegalReference } from './components/LegalReference';
import { LegalResearch } from './components/LegalResearch';
import { GoogleKeepIntegration } from './components/GoogleKeepIntegration';
import { GoogleDocsIntegration } from './components/GoogleDocsIntegration';
import { GmailIntegration } from './components/GmailIntegration';
import { Dashboard } from './components/Dashboard';
import { LimitationsAudit } from './components/LimitationsAudit';
import { CaseBackupModal } from './components/CaseBackupModal';
import { downloadCaseBackupJson } from './utils/caseBackup';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Auth } from './components/Auth';
import { User } from 'firebase/auth';
import { initAuth, logout } from './lib/authHelper';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDoc,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { cn } from './lib/utils';
import LZString from 'lz-string';

import { CaseTimeline } from './components/CaseTimeline';

const STORAGE_KEY = 'legal_manifold_cases';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [cases, setCases] = useState<Case[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'timeline' | 'evidence' | 'rules' | 'claims' | 'generator' | 'rectification' | 'judicial' | 'audit' | 'checklist' | 'adversarial' | 'evidence_audit' | 'disclosure' | 'interrogatories' | 'system' | 'small_claims' | 'family' | 'civil_rights' | 'estate' | 'durable_guardianship' | 'caseload' | 'findings' | 'violation_audit' | 'limitations_audit' | 'legal_reference' | 'legal_research' | 'intelligence' | 'google_keep' | 'google_docs' | 'gmail' | 'co_counsel' | 'discovery_plan'>('dashboard');
  const [highlightedEvidenceId, setHighlightedEvidenceId] = useState<string | null>(null);
  const [isAppBackupModalOpen, setIsAppBackupModalOpen] = useState(false);
  const [userPlan, setUserPlan] = useState<SubscriptionPlanId>(() => {
    return (localStorage.getItem('legal_manifold_user_plan') as SubscriptionPlanId) || 'free';
  });
  const [upgradeModalState, setUpgradeModalState] = useState<{
    isOpen: boolean;
    message: string;
  }>({
    isOpen: false,
    message: 'Elite plan required for litigation strategy engine.',
  });

  const showUpgradeModal = (message: string = 'Elite plan required for litigation strategy engine.') => {
    setUpgradeModalState({
      isOpen: true,
      message,
    });
  };

  const userProfile = {
    id: user?.uid || 'sandbox-user',
    email: user?.email || 'counsel@manifold.local',
    plan: userPlan,
    usage: {
      cases: cases.length,
      evidence: cases.find(c => c.id === activeCaseId)?.evidence.length || 0,
      exports: 0,
      ai_summaries: 0,
    }
  };

  useEffect(() => {
    const unsubscribe = initAuth((currentUser, token) => {
      setUser(currentUser);
      setIsAuthReady(true);
    }, () => {
      setUser(null);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Load cases from Firestore
  useEffect(() => {
    if (!user) {
      setCases([]);
      setActiveCaseId(null);
      return;
    }

    if (user.uid === 'sandbox-user') {
      const localData = localStorage.getItem('legal_manifold_sandbox_cases');
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          if (Array.isArray(parsed)) {
            setCases(parsed);
            if (parsed.length > 0 && !activeCaseId) {
              setActiveCaseId(parsed[0].id);
            }
          }
        } catch (e) {
          console.error("Failed to load local sandbox cases", e);
        }
      } else {
        setCases([]);
      }
      return;
    }

    const q = query(collection(db, 'cases'), where('uid', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedCases: Case[] = [];
      snapshot.forEach((doc) => {
        loadedCases.push(doc.data() as Case);
      });
      
      // Sort by updatedAt or id
      loadedCases.sort((a, b) => (b.id > a.id ? 1 : -1));
      
      setCases(loadedCases);
      if (loadedCases.length > 0 && !activeCaseId) {
        setActiveCaseId(loadedCases[0].id);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'cases');
    });

    // One-time migration from localStorage to Firestore
    const migrateFromLocalStorage = async () => {
      const userStorageKey = `${STORAGE_KEY}_${user.uid}`;
      const saved = localStorage.getItem(userStorageKey);
      if (saved) {
        try {
          const decompressed = LZString.decompress(saved);
          if (decompressed) {
            const parsed = JSON.parse(decompressed);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log(`Migrating ${parsed.length} cases from localStorage to Firestore...`);
              for (let c of parsed) {
                // Truncate evidence content to prevent exceeding Firestore limits
                if (c.evidence && Array.isArray(c.evidence)) {
                  c.evidence = c.evidence.map((e: any) => ({
                    ...e,
                    content: e.content ? e.content.substring(0, 15000) : e.content
                  }));
                }
                const caseDoc = doc(db, 'cases', c.id);
                await setDoc(caseDoc, { ...c, uid: user.uid, updatedAt: new Date().toISOString() });
              }
              // Clear localStorage after successful migration
              localStorage.removeItem(userStorageKey);
              console.log("Migration complete.");
            }
          }
        } catch (e) {
          console.error("Failed to migrate cases from localStorage", e);
        }
      }
    };

    migrateFromLocalStorage();
    
    return () => unsubscribe();
  }, [user]);

  // Test connection to Firestore
  useEffect(() => {
    async function testConnection(retries = 3) {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (retries > 0) {
          console.log(`Retrying Firestore connection... (${retries} retries left)`);
          setTimeout(() => testConnection(retries - 1), 2000);
          return;
        }
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();
  }, []);

  const activeCase = cases.find(c => c.id === activeCaseId);

  const createCase = async () => {
    if (!user) return;
    const newCase: Case = {
      id: `CASE-${Date.now()}`,
      name: `New Case ${cases.length + 1}`,
      jurisdiction: '',
      courtRules: '',
      evidence: [],
      claims: [],
      generatedDocs: {}
    };
    
    if (user.uid === 'sandbox-user') {
      const updatedCases = [newCase, ...cases];
      setCases(updatedCases);
      setActiveCaseId(newCase.id);
      localStorage.setItem('legal_manifold_sandbox_cases', JSON.stringify(updatedCases));
      return;
    }

    try {
      const caseDoc = doc(db, 'cases', newCase.id);
      await setDoc(caseDoc, { ...newCase, uid: user.uid, updatedAt: new Date().toISOString() });
      setActiveCaseId(newCase.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `cases/${newCase.id}`);
    }
  };

  const createSpecificCase = async (newCase: Case) => {
    if (!user) return;
    
    if (user.uid === 'sandbox-user') {
      const updatedCases = [newCase, ...cases.filter(c => c.id !== newCase.id)];
      setCases(updatedCases);
      setActiveCaseId(newCase.id);
      localStorage.setItem('legal_manifold_sandbox_cases', JSON.stringify(updatedCases));
      return;
    }

    try {
      const caseDoc = doc(db, 'cases', newCase.id);
      await setDoc(caseDoc, { ...newCase, uid: user.uid, updatedAt: new Date().toISOString() });
      setActiveCaseId(newCase.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `cases/${newCase.id}`);
    }
  };

  const deleteCase = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (user && user.uid === 'sandbox-user') {
      const remaining = cases.filter(c => c.id !== id);
      setCases(remaining);
      if (activeCaseId === id) {
        setActiveCaseId(remaining.length > 0 ? remaining[0].id : null);
      }
      localStorage.setItem('legal_manifold_sandbox_cases', JSON.stringify(remaining));
      return;
    }

    try {
      await deleteDoc(doc(db, 'cases', id));
      if (activeCaseId === id) {
        const remaining = cases.filter(c => c.id !== id);
        setActiveCaseId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `cases/${id}`);
    }
  };

  const updateActiveCase = async (updated: Case) => {
    if (!user) return;
    
    const truncatedCase = {
      ...updated,
      evidence: updated.evidence.map(e => ({
        ...e,
        content: e.content ? e.content.substring(0, 15000) : e.content
      }))
    };

    if (user.uid === 'sandbox-user') {
      const updatedCases = cases.map(c => c.id === truncatedCase.id ? { ...truncatedCase, updatedAt: new Date().toISOString() } : c);
      setCases(updatedCases);
      localStorage.setItem('legal_manifold_sandbox_cases', JSON.stringify(updatedCases));
      return;
    }

    try {
      const caseDoc = doc(db, 'cases', truncatedCase.id);
      await setDoc(caseDoc, { ...truncatedCase, uid: user.uid, updatedAt: new Date().toISOString() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `cases/${updated.id}`);
    }
  };

  // Auto-merge duplicate cases
  const hasAutoMerged = useRef(false);

  useEffect(() => {
    if (!user || cases.length === 0 || hasAutoMerged.current) return;

    const mergeDuplicates = async () => {
      hasAutoMerged.current = true;
      const groups = new Map<string, Case[]>();
      
      // Group by normalized name
      for (const c of cases) {
        const name = c.name.trim().toLowerCase();
        if (!groups.has(name)) groups.set(name, []);
        groups.get(name)!.push(c);
      }

      for (const [name, group] of groups.entries()) {
        if (group.length > 1) {
          console.log(`Merging ${group.length} duplicate cases for "${name}"`);
          
          // Sort by ID to make the oldest the primary
          group.sort((a, b) => a.id.localeCompare(b.id));
          const primary = group[0];
          const duplicates = group.slice(1);

          let mergedEvidence = [...primary.evidence];
          let mergedClaims = [...primary.claims];
          let mergedDocs = { ...primary.generatedDocs };

          for (const dup of duplicates) {
            // Merge evidence
            for (const ev of dup.evidence) {
              if (!mergedEvidence.some(e => e.id === ev.id || e.title === ev.title)) {
                mergedEvidence.push(ev);
              }
            }
            // Merge claims
            for (const cl of dup.claims) {
              if (!mergedClaims.some(c => c.id === cl.id || c.title === cl.title)) {
                mergedClaims.push(cl);
              }
            }
            // Merge docs
            mergedDocs = { ...dup.generatedDocs, ...mergedDocs };
          }

          const updatedPrimary = {
            ...primary,
            evidence: mergedEvidence,
            claims: mergedClaims,
            generatedDocs: mergedDocs,
            updatedAt: new Date().toISOString()
          };

          try {
            // Update primary
            await updateActiveCase(updatedPrimary);
            
            // Delete duplicates
            for (const dup of duplicates) {
              await deleteDoc(doc(db, 'cases', dup.id));
            }
            
            if (duplicates.some(d => d.id === activeCaseId)) {
              setActiveCaseId(primary.id);
            }
          } catch (error) {
            console.error("Error merging cases:", error);
          }
        }
      }
    };

    const timer = setTimeout(() => {
      mergeDuplicates();
    }, 2000);

    return () => clearTimeout(timer);
  }, [cases, user, activeCaseId]);

  const tabGroups = [
    {
      label: 'Core Case',
      tabs: [
        { id: 'dashboard', label: 'Case Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'timeline', label: 'Case Timeline', icon: <Clock className="w-4 h-4" /> },
        { id: 'evidence', label: 'Evidence Manifold', icon: <Database className="w-4 h-4" /> },
        { id: 'rules', label: 'Court Rules', icon: <Gavel className="w-4 h-4" /> },
        { id: 'legal_reference', label: 'Legal Reference', icon: <BookOpen className="w-4 h-4" /> },
        { id: 'legal_research', label: 'Legal Research', icon: <FolderSearch className="w-4 h-4" /> },
        { id: 'claims', label: 'Legal Claims', icon: <Zap className="w-4 h-4" /> },
        { id: 'limitations_audit', label: 'Statute of Limitations', icon: <Clock className="w-4 h-4 text-amber-500" /> },
        { id: 'generator', label: 'Document Generator', icon: <FileText className="w-4 h-4" /> },
        { id: 'discovery_plan', label: 'Discovery Plan', icon: <Compass className="w-4 h-4" /> },
        { id: 'checklist', label: 'Filing Checklist', icon: <ClipboardCheck className="w-4 h-4" /> },
        { id: 'disclosure', label: 'Corporate Disclosure', icon: <Building2 className="w-4 h-4" /> },
      ]
    },
    {
      label: 'Intelligence Suite',
      tabs: [
        { id: 'co_counsel', label: 'Co-Counsel Chatbot', icon: <MessageSquare className="w-4 h-4" /> },
        { id: 'intelligence', label: 'Intelligence Center', icon: <Fingerprint className="w-4 h-4" /> },
        { id: 'findings', label: 'Findings Binder', icon: <FolderSearch className="w-4 h-4" /> },
        { id: 'judicial', label: 'Judicial Review', icon: <Gavel className="w-4 h-4" /> },
        { id: 'audit', label: 'Citation Audit', icon: <BookOpen className="w-4 h-4" /> },
        { id: 'adversarial', label: 'Adversarial Simulation', icon: <ShieldAlert className="w-4 h-4" /> },
        { id: 'interrogatories', label: 'RA3 Interrogatories', icon: <MessageSquare className="w-4 h-4" /> },
      ]
    },
    {
      label: 'Specialized Engines',
      tabs: [
        { id: 'small_claims', label: 'Small Claims Engine', icon: <Scale className="w-4 h-4" /> },
        { id: 'family', label: 'Family Law', icon: <Heart className="w-4 h-4" /> },
        { id: 'civil_rights', label: 'Civil Rights', icon: <Shield className="w-4 h-4" /> },
        { id: 'estate', label: 'Estate & Property', icon: <Key className="w-4 h-4" /> },
        { id: 'durable_guardianship', label: 'Durable Guardianship', icon: <ShieldAlert className="w-4 h-4" /> },
      ]
    },
    {
      label: 'Workspace Integrations',
      tabs: [
        { id: 'google_docs', label: 'Google Docs', icon: <FileText className="w-4 h-4" /> },
        { id: 'google_keep', label: 'Google Keep Notes', icon: <Book className="w-4 h-4" /> },
        { id: 'gmail', label: 'Gmail Comms & Sync', icon: <Mail className="w-4 h-4" /> }
      ]
    },
    {
      label: 'Bulk Tools',
      tabs: [
        { id: 'caseload', label: 'Case Load Processor', icon: <FolderPlus className="w-4 h-4" /> },
      ]
    }
  ] as const;

  if (!isAuthReady) {
    return (
      <div className="flex h-screen bg-zinc-950 items-center justify-center">
        <div className="w-12 h-12 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <Auth 
        onEnterSandbox={() => {
          setUser({
            uid: 'sandbox-user',
            email: 'sandbox@case.manifold',
            displayName: 'Sandbox Counsel',
            emailVerified: true,
            isAnonymous: true,
            providerData: []
          } as any);
        }} 
      />
    );
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-orange-500/30 selection:text-orange-200 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 border-r border-zinc-900 flex flex-col bg-zinc-950/50 backdrop-blur-xl">
        <div className="p-6 border-b border-zinc-900 flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-600 flex items-center justify-center rounded-sm">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-mono font-bold text-zinc-100 uppercase tracking-widest">Legal Manifold</h1>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-tighter">Precision Reasoning Engine</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          <div className="flex items-center justify-between px-3 py-2 mb-2 bg-zinc-900/40 border-y border-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] backdrop-blur-sm sticky top-0 z-10 font-mono">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse" />
              Active Manifolds
            </span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => {
                  // Trigger the same logic manually
                  const mergeDuplicates = async () => {
                    const groups = new Map<string, Case[]>();
                    for (const c of cases) {
                      const name = c.name.trim().toLowerCase();
                      if (!groups.has(name)) groups.set(name, []);
                      groups.get(name)!.push(c);
                    }
                    for (const [name, group] of groups.entries()) {
                      if (group.length > 1) {
                        group.sort((a, b) => a.id.localeCompare(b.id));
                        const primary = group[0];
                        const duplicates = group.slice(1);
                        let mergedEvidence = [...primary.evidence];
                        let mergedClaims = [...primary.claims];
                        let mergedDocs = { ...primary.generatedDocs };
                        for (const dup of duplicates) {
                          for (const ev of dup.evidence) {
                            if (!mergedEvidence.some(e => e.id === ev.id || e.title === ev.title)) mergedEvidence.push(ev);
                          }
                          for (const cl of dup.claims) {
                            if (!mergedClaims.some(c => c.id === cl.id || c.title === cl.title)) mergedClaims.push(cl);
                          }
                          mergedDocs = { ...dup.generatedDocs, ...mergedDocs };
                        }
                        const updatedPrimary = {
                          ...primary,
                          evidence: mergedEvidence,
                          claims: mergedClaims,
                          generatedDocs: mergedDocs,
                          updatedAt: new Date().toISOString()
                        };
                        try {
                          await updateActiveCase(updatedPrimary);
                          for (const dup of duplicates) {
                            await deleteDoc(doc(db, 'cases', dup.id));
                          }
                          if (duplicates.some(d => d.id === activeCaseId)) {
                            setActiveCaseId(primary.id);
                          }
                        } catch (error) {
                          console.error("Error merging cases:", error);
                        }
                      }
                    }
                  };
                  mergeDuplicates();
                }}
                className="p-1 hover:bg-zinc-900 text-zinc-500 hover:text-zinc-100 transition-colors"
                title="Merge Duplicate Cases"
              >
                <Layers className="w-4 h-4" />
              </button>
              <button 
                onClick={createCase}
                className="p-1 hover:bg-zinc-900 text-zinc-500 hover:text-zinc-100 transition-colors"
                title="New Case"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {cases.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCaseId(c.id)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 rounded-sm transition-all group",
                activeCaseId === c.id 
                  ? "bg-zinc-900 text-zinc-100 border border-zinc-800" 
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"
              )}
            >
              <div className="flex items-center gap-3 truncate">
                <FolderOpen className={cn("w-4 h-4", activeCaseId === c.id ? "text-orange-500" : "text-zinc-700")} />
                <span className="text-xs font-mono truncate">{c.name}</span>
              </div>
              <Trash2 
                onClick={(e) => deleteCase(c.id, e)}
                className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all" 
              />
            </button>
          ))}

          {cases.length === 0 && (
            <div className="py-12 text-center space-y-4">
              <LayoutDashboard className="w-8 h-8 text-zinc-800 mx-auto opacity-20" />
              <p className="text-[10px] font-mono text-zinc-700 uppercase">No cases initialized</p>
              <button 
                onClick={createCase}
                className="px-4 py-2 border border-zinc-800 text-[10px] font-mono text-zinc-500 hover:text-zinc-200 hover:border-zinc-600 transition-all uppercase"
              >
                Create First Case
              </button>
            </div>
          )}
        </div>

        {activeCase && (
          <nav className="flex-1 overflow-y-auto p-4 space-y-8 scrollbar-hide border-t border-zinc-900 pt-6">
            {tabGroups.map((group) => (
              <div key={group.label} className="space-y-2">
                <h3 className="px-3 text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-widest">
                  {group.label}
                </h3>
                <div className="space-y-1">
                  {group.tabs.map((tab) => {
                    const isGated = tab.id === 'adversarial' && !requirePlan(userProfile, "elite");
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          if (tab.id === 'adversarial') {
                            if (!requirePlan(userProfile, "elite")) {
                              return showUpgradeModal("Elite plan required for litigation strategy engine.");
                            }
                          }
                          setActiveTab(tab.id as any);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 text-xs font-mono transition-all duration-200",
                          activeTab === tab.id 
                            ? "bg-orange-600/10 text-orange-500 border-r-2 border-orange-600" 
                            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {tab.icon}
                          <span className="uppercase tracking-tighter">{tab.label}</span>
                        </div>
                        {isGated && (
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-bold tracking-wider">
                            ELITE
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        )}

        <div className="p-4 border-t border-zinc-900 bg-zinc-950">
          <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-sm space-y-2 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-mono text-zinc-400 uppercase">Plan: {userPlan.toUpperCase()}</span>
              </div>
              <button
                onClick={() => showUpgradeModal("Upgrade your subscription to access premium litigation features.")}
                className="text-[9px] font-mono text-orange-400 hover:text-orange-300 font-bold uppercase tracking-wider underline cursor-pointer"
              >
                {userPlan === 'elite' || userPlan === 'enterprise' ? 'Manage' : 'Upgrade'}
              </button>
            </div>
            <p className="text-[9px] font-mono text-zinc-600 leading-tight">
              Manifold reasoning active. Statute of limitations verification enabled.
            </p>
          </div>
          
          <button
            onClick={async () => {
              await logout();
              setUser(null);
            }}
            className="w-full py-2 text-[10px] font-mono text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-700 rounded-sm transition-all uppercase tracking-widest"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {activeCase ? (
          <>
            <header className="h-16 border-b border-zinc-900 flex items-center justify-between px-8 bg-zinc-950/50 backdrop-blur-xl z-10">
              <div className="flex items-center gap-4">
                <label htmlFor="case-name" className="sr-only">Case Name</label>
                <input
                  key={`name-${activeCase.id}`}
                  id="case-name"
                  type="text"
                  defaultValue={activeCase.name}
                  onBlur={(e) => {
                    if (e.target.value !== activeCase.name) {
                      updateActiveCase({ ...activeCase, name: e.target.value });
                    }
                  }}
                  className="bg-transparent border-none text-zinc-100 font-serif italic text-lg focus:outline-none focus:ring-0 w-64"
                />
                <div className="h-4 w-px bg-zinc-800" />
                <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                  <ChevronRight className="w-3 h-3" />
                  <input
                    key={`jurisdiction-${activeCase.id}`}
                    type="text"
                    list="jurisdictions"
                    defaultValue={activeCase.jurisdiction}
                    onBlur={(e) => {
                      if (e.target.value !== activeCase.jurisdiction) {
                        updateActiveCase({ ...activeCase, jurisdiction: e.target.value });
                      }
                    }}
                    placeholder="Set Jurisdiction..."
                    className="bg-transparent border-none text-zinc-500 hover:text-zinc-300 focus:text-zinc-300 focus:outline-none focus:ring-0 w-48 p-0"
                  />
                  <datalist id="jurisdictions">
                    <option value="Multnomah County Circuit Court" />
                    <option value="Washington County Circuit Court" />
                    <option value="Clackamas County Circuit Court" />
                    <option value="Lane County Circuit Court" />
                    <option value="Marion County Circuit Court" />
                    <option value="Jackson County Circuit Court" />
                    <option value="Deschutes County Circuit Court" />
                    <option value="Baker County Circuit Court" />
                    <option value="Federal District Court of Oregon" />
                    <option value="Oregon Court of Appeals" />
                    <option value="Oregon Supreme Court" />
                  </datalist>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4 px-4 py-1.5 bg-zinc-900 border border-zinc-800 rounded-sm">
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-mono text-zinc-600 uppercase">Evidence</span>
                    <span className="text-xs font-mono text-zinc-300">{activeCase.evidence.length}</span>
                  </div>
                  <div className="w-px h-6 bg-zinc-800" />
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-mono text-zinc-600 uppercase">Claims</span>
                    <span className="text-xs font-mono text-zinc-300">{activeCase.claims.length}</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsAppBackupModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 rounded-sm transition-all shadow-sm cursor-pointer"
                  title="Export complete case data (evidence, claims, and timeline) as a structured JSON backup"
                >
                  <FileDown className="w-3.5 h-3.5 text-orange-500" />
                  <span>Backup (JSON)</span>
                </button>

                <button
                  onClick={(e) => {
                    if (window.confirm("Are you sure you want to PERMANENTLY delete this entire reasoning manifold? This action cannot be undone.")) {
                      deleteCase(activeCase.id, e as any);
                    }
                  }}
                  className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 rounded-sm transition-all"
                  title="Delete Manifold"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </header>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 bg-zinc-950">
              <ErrorBoundary>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="max-w-5xl mx-auto"
                  >
                    {activeTab === 'dashboard' && (
                      <Dashboard 
                        activeCase={activeCase} 
                        onTabChange={(tab) => setActiveTab(tab as any)} 
                        onUpdateCase={updateActiveCase}
                        userPlan={userPlan}
                        onPlanChanged={(plan) => {
                          setUserPlan(plan);
                          localStorage.setItem('legal_manifold_user_plan', plan);
                        }}
                        userId={user?.uid || 'sandbox-user'}
                        user={userProfile}
                      />
                    )}
                    {activeTab === 'timeline' && (
                      <CaseTimeline activeCase={activeCase} onUpdateCase={updateActiveCase} />
                    )}
                    {activeTab === 'evidence' && (
                      <EvidenceManifold 
                        evidence={activeCase.evidence} 
                        onUpdate={(evidence) => updateActiveCase({ ...activeCase, evidence })} 
                        highlightedEvidenceId={highlightedEvidenceId}
                        onClearHighlight={() => setHighlightedEvidenceId(null)}
                      />
                    )}
                  {activeTab === 'rules' && (
                    <CourtRulesEditor 
                      rules={activeCase.courtRules} 
                      onUpdate={(courtRules) => updateActiveCase({ ...activeCase, courtRules })}
                      jurisdiction={activeCase.jurisdiction}
                      onUpdateJurisdiction={(jurisdiction) => updateActiveCase({ ...activeCase, jurisdiction })}
                    />
                  )}
                  {activeTab === 'legal_reference' && (
                    <LegalReference />
                  )}
                  {activeTab === 'legal_research' && (
                    <LegalResearch activeCase={activeCase} onUpdateCase={updateActiveCase} />
                  )}
                  {activeTab === 'claims' && (
                    <ClaimsEditor 
                      claims={activeCase.claims} 
                      evidence={activeCase.evidence}
                      onUpdate={(claims) => updateActiveCase({ ...activeCase, claims })}
                      onNavigateToEvidence={(id) => {
                        setActiveTab('evidence');
                        setHighlightedEvidenceId(id);
                      }}
                    />
                  )}
                  {activeTab === 'generator' && (
                    <DocumentGenerator 
                      activeCase={activeCase} 
                      onUpdateCase={updateActiveCase}
                    />
                  )}
                  {activeTab === 'judicial' && (
                    <JudicialReview 
                      activeCase={activeCase} 
                      onUpdateCase={updateActiveCase}
                    />
                  )}
                  {activeTab === 'audit' && (
                    <CitationAudit 
                      activeCase={activeCase} 
                      onUpdateCase={updateActiveCase}
                    />
                  )}
                  {activeTab === 'checklist' && (
                    <FilingChecklist 
                      activeCase={activeCase} 
                      onUpdateCase={updateActiveCase}
                    />
                  )}
                  {activeTab === 'adversarial' && (
                    !requirePlan(userProfile, "elite") ? (
                      <div className="flex-1 p-12 flex flex-col items-center justify-center text-center my-auto">
                        <div className="w-16 h-16 rounded-2xl bg-orange-950/40 border border-orange-500/30 flex items-center justify-center mb-4 text-orange-400 shadow-xl">
                          <ShieldAlert className="w-8 h-8" />
                        </div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-orange-400 font-bold mb-1">
                          Elite Plan Required
                        </span>
                        <h2 className="text-xl font-bold text-zinc-100 mb-2">Litigation Strategy Engine</h2>
                        <p className="text-xs text-zinc-400 max-w-md mb-6 font-mono leading-relaxed">
                          Elite plan required for litigation strategy engine.
                        </p>
                        <button
                          onClick={() => showUpgradeModal("Elite plan required for litigation strategy engine.")}
                          className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white text-xs font-mono uppercase tracking-wider font-bold rounded-lg shadow-lg hover:shadow-orange-600/20 transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          Upgrade to Elite Plan
                        </button>
                      </div>
                    ) : (
                      <AdversarialSimulation 
                        activeCase={activeCase} 
                        onUpdateCase={updateActiveCase}
                        user={userProfile}
                        showUpgradeModal={showUpgradeModal}
                      />
                    )
                  )}
                  {activeTab === 'disclosure' && (
                    <CorporateDisclosure activeCase={activeCase} onUpdateCase={updateActiveCase} />
                  )}
                  {activeTab === 'limitations_audit' && (
                    <LimitationsAudit activeCase={activeCase} onUpdateCase={updateActiveCase} onNavigateToTab={(tab: string) => setActiveTab(tab as any)} />
                  )}
            {activeTab === 'interrogatories' && (
              <InterrogatoryGenerator activeCase={activeCase} onUpdateCase={updateActiveCase} />
            )}
            {activeTab === 'findings' && (
              <FindingsBinder activeCase={activeCase} onUpdateCase={updateActiveCase} />
            )}
            {activeTab === 'co_counsel' && (
              <CoCounselChat activeCase={activeCase} onUpdateCase={updateActiveCase} />
            )}
            {activeTab === 'intelligence' && (
              <IntelligenceCenter activeCase={activeCase} onUpdateCase={updateActiveCase} />
            )}
            {activeTab === 'small_claims' && (
              <SmallClaimsEngine activeCase={activeCase} onUpdateCase={updateActiveCase} />
            )}
            {activeTab === 'family' && (
              <FamilyLawEngine activeCase={activeCase} onUpdateCase={updateActiveCase} />
            )}
            {activeTab === 'civil_rights' && (
              <CivilRightsEngine activeCase={activeCase} onUpdateCase={updateActiveCase} />
            )}
            {activeTab === 'estate' && (
              <EstatePropertyEngine activeCase={activeCase} onUpdateCase={updateActiveCase} />
            )}
            {activeTab === 'durable_guardianship' && (
              <DurableGuardianshipEngine activeCase={activeCase} onUpdateCase={updateActiveCase} />
            )}
            {activeTab === 'caseload' && (
              <CaseLoadProcessor 
                cases={cases} 
                onUpdateCase={updateActiveCase} 
                onCaseCreated={createSpecificCase} 
              />
            )}
            {activeTab === 'discovery_plan' && (
              <DiscoveryPlan activeCase={activeCase} onUpdateCase={updateActiveCase} />
            )}
            {activeTab === 'google_keep' && (
              <GoogleKeepIntegration activeCase={activeCase} />
            )}
            {activeTab === 'google_docs' && (
              <GoogleDocsIntegration activeCase={activeCase} />
            )}
            {activeTab === 'gmail' && (
              <GmailIntegration activeCase={activeCase} onUpdateCase={updateActiveCase} />
            )}
          </motion.div>
                </AnimatePresence>
              </ErrorBoundary>
            </div>
            {/* Case Backup Modal */}
            <CaseBackupModal 
              isOpen={isAppBackupModalOpen} 
              onClose={() => setIsAppBackupModalOpen(false)} 
              activeCase={activeCase} 
            />
            {/* Upgrade Subscription Modal */}
            <UpgradeModal
              isOpen={upgradeModalState.isOpen}
              onClose={() => setUpgradeModalState(prev => ({ ...prev, isOpen: false }))}
              message={upgradeModalState.message}
              currentPlan={userPlan}
              userId={user?.uid || 'sandbox-user'}
              onPlanChanged={(newPlan) => {
                setUserPlan(newPlan);
                localStorage.setItem('legal_manifold_user_plan', newPlan);
              }}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-700 space-y-6">
            <div className="w-24 h-24 border border-zinc-900 rounded-full flex items-center justify-center animate-pulse">
              <Scale className="w-12 h-12 opacity-20" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-500">No Active Case Selected</h2>
              <p className="text-[10px] font-mono text-zinc-700 uppercase">Initialize a new manifold to begin reasoning</p>
            </div>
            <button 
              onClick={createCase}
              className="px-8 py-3 bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-all uppercase tracking-widest"
            >
              Initialize New Case
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
