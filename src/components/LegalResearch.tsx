import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Loader2, 
  Book, 
  ExternalLink, 
  Scale, 
  Shield, 
  Database, 
  Settings,
  ChevronRight,
  Bookmark,
  History,
  FileText,
  AlertCircle,
  Plus,
  Trash2,
  Calendar,
  Tag,
  Check,
  Filter,
  Layers,
  Sparkles,
  BookOpen,
  Info
} from 'lucide-react';
import { cn } from '../lib/utils';
import manifoldData from '../data/oregonLegalManifold.json';
import { OregonLegalManifold, Precedent, Case } from '../types';
import { 
  Pin,
  Clock,
  Zap,
  CheckCircle2,
  ListFilter
} from 'lucide-react';
import { 
  collection, 
  query as fsQuery, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  addDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase';

const manifold = manifoldData as OregonLegalManifold;

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
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
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
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 8 High-fidelity default real-world precedents to seed if DB is empty
const SEED_PRECEDENTS = [
  {
    id: "state-v-maciel-2008",
    title: "State v. Maciel",
    citation: "345 Or 231",
    jurisdiction: "Oregon Supreme Court",
    caseType: "Criminal / Constitutional",
    decisionDate: "2008-05-15",
    summary: "Addressed voluntary search and seizure consent, clarifying guidelines for procedural due process under Article I, Section 9 of the Oregon Constitution.",
    holdings: [
      "Consent to a search must be voluntary under the totality of the circumstances and not coerced.",
      "Article I, Section 9 of the Oregon Constitution provides independent, often broader protections than the Federal Fourth Amendment.",
      "The state bears the burden of proving that a consent to search was untainted by prior illegal police conduct."
    ],
    keywords: ["search", "seizure", "consent", "due process", "Article I Sec 9"],
    addedBy: "system"
  },
  {
    id: "hoffman-v-city-of-portland-1982",
    title: "Hoffman v. City of Portland",
    citation: "294 Or 150",
    jurisdiction: "Oregon Supreme Court",
    caseType: "Tort / Municipal Liability",
    decisionDate: "1982-11-20",
    summary: "Established precise interpretations of notice requirements and the scope of discretionary function immunity under the Oregon Tort Claims Act (OTCA).",
    holdings: [
      "Written notice of claim to a public body is a mandatory jurisdictional prerequisite under ORS 30.275.",
      "Discretionary function immunity shields ministerial policy-making but never operational negligence.",
      "Public entities can be held civilly liable for negligent maintenance of public rights-of-way."
    ],
    keywords: ["sovereign immunity", "tort claims", "discretionary action", "notice"],
    addedBy: "system"
  },
  {
    id: "goddard-v-farmers-ins-2008",
    title: "Goddard v. Farmers Insurance Co.",
    citation: "344 Or 232",
    jurisdiction: "Oregon Supreme Court",
    caseType: "Civil - Contract / Bad Faith",
    decisionDate: "2008-02-14",
    summary: "Comprehensive review of bad faith claims, insurance company duties of good faith, and the calculation of punitive damages under federal due process standards.",
    holdings: [
      "Punitive damages awards must satisfy substantive federal and state constitutional due process constraints.",
      "An insurer owes a fiduciary-like duty of good faith and fair dealing to defend claims responsibly.",
      "Repetitive bad faith conduct justifies a higher ratio of punitive to compensatory damages."
    ],
    keywords: ["bad faith", "insurance", "punitive damages", "good faith"],
    addedBy: "system"
  },
  {
    id: "copeland-sand-v-myrtle-creek-2016",
    title: "Copeland Sand & Gravel v. Town of Myrtle Creek",
    citation: "360 Or 1",
    jurisdiction: "Oregon Supreme Court",
    caseType: "Civil - Contract",
    decisionDate: "2016-08-11",
    summary: "Interpreted ORS Chapter 279B public contracting protocols, bidding integrity, and the legal remedies available to disappointed public bidders.",
    holdings: [
      "Municipalities and public bodies must adhere stringently to the procurement parameters defined in their RFPs.",
      "Bidding protests require showing a material variance in the awarded bid which prejudiced other candidates.",
      "Equity demands fair play and transparency in municipal contracting operations."
    ],
    keywords: ["contract", "public procurement", "bidding protest", "remedies"],
    addedBy: "system"
  },
  {
    id: "brown-v-board-1954",
    title: "Brown v. Board of Education",
    citation: "347 U.S. 483",
    jurisdiction: "U.S. Supreme Court",
    caseType: "Civil Rights / Constitutional",
    decisionDate: "1954-05-17",
    summary: "Unanimous landmark decision declaring state-imposed racial segregation in public schools a direct violation of the 14th Amendment's Equal Protection Clause.",
    holdings: [
      "State-sanctioned segregation of public school children based on race is inherently unequal.",
      "The 'separate but equal' doctrine of Plessy v. Ferguson is officially declared unconstitutional.",
      "Segregated educational facilities inflict a permanent sense of inferiority that impairs student development."
    ],
    keywords: ["civil rights", "equal protection", "segregation", "schools", "14th amendment"],
    addedBy: "system"
  },
  {
    id: "erie-railroad-v-tompkins-1938",
    title: "Erie Railroad Co. v. Tompkins",
    citation: "304 U.S. 64",
    jurisdiction: "U.S. Supreme Court",
    caseType: "Civil Procedure",
    decisionDate: "1938-04-25",
    summary: "Cornerstone federal civil procedure decision holding that fed courts in diversity cases must apply state substantive law and federal procedural codes.",
    holdings: [
      "There is no federal general common law regulating private relations.",
      "Under the Rules of Decision Act, federal courts hearing state-law claims must enforce state statutes and state high court decisions.",
      "Federal courts must limit common law adjudication to preserve states' constitutional sovereignty."
    ],
    keywords: ["diversity jurisdiction", "civil procedure", "substantive law", "federalism"],
    addedBy: "system"
  },
  {
    id: "shelby-county-v-holder-2013",
    title: "Shelby County v. Holder",
    citation: "570 U.S. 529",
    jurisdiction: "U.S. Supreme Court",
    caseType: "Civil Rights / Constitutional",
    decisionDate: "2013-06-25",
    summary: "Declared Section 4(b) of the Voting Rights Act of 1965 unconstitutional, terminating preclearance formulas based on outdated conditions.",
    holdings: [
      "The Voting Rights Act's preclearance formula under Section 4(b) is unconstitutional.",
      "Congress must utilize current empirical conditions to justify federal intrusion on state electoral sovereignty.",
      "The rule of equal sovereignty among states restricts disproportionate federal oversight."
    ],
    keywords: ["voting rights", "sovereignty", "federal oversight", "constitutional limits"],
    addedBy: "system"
  },
  {
    id: "sherwood-v-walker-1887",
    title: "Sherwood v. Walker",
    citation: "66 Mich. 568",
    jurisdiction: "Out-of-State / Common Law Landmark",
    caseType: "Civil - Contract",
    decisionDate: "1887-07-21",
    summary: "Famous common law contracts case establishing the doctrine of mutual mistake of fact regarding the fundamental nature of the subject matter.",
    holdings: [
      "A contracting party may rescinds on the ground of mutual mistake of fact if the mistake goes to the whole substance of the agreement.",
      "A barren cow (Rose 2d of Aberlone) vs. a breeding cow represents a fundamental variance in the subject matter's identity, making the contract voidable."
    ],
    keywords: ["contract", "mutual mistake", "voidable", "rescission"],
    addedBy: "system"
  }
];

interface ResearchResult {
  title: string;
  snippet: string;
  url: string;
  sourceType: 'STATUTE' | 'CASE_LAW' | 'RULE' | 'OTHER';
  jurisdiction?: string;
  relevance: number;
}

export interface LegalResearchProps {
  activeCase?: Case;
  onUpdateCase?: (updatedCase: Case) => void;
}

export const LegalResearch: React.FC<LegalResearchProps> = ({ activeCase, onUpdateCase }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<ResearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAutoCaseSearching, setIsAutoCaseSearching] = useState(false);
  const [pinnedTitleMap, setPinnedTitleMap] = useState<Record<string, boolean>>({});

  // Handler to pin a research finding or precedent to active case
  const handlePinToCase = (item: ResearchResult, claimId?: string) => {
    if (!activeCase || !onUpdateCase) return;

    const existingFindings = activeCase.researchFindings || [];
    const isAlreadyPinned = existingFindings.some(f => f.title === item.title);

    let updatedFindings = [...existingFindings];
    if (isAlreadyPinned) {
      updatedFindings = updatedFindings.filter(f => f.title !== item.title);
      setPinnedTitleMap(prev => ({ ...prev, [item.title]: false }));
    } else {
      updatedFindings.push({
        title: item.title,
        snippet: item.snippet,
        url: item.url,
        sourceType: item.sourceType,
        jurisdiction: item.jurisdiction || 'Oregon',
        relevance: item.relevance,
        savedAt: new Date().toISOString(),
        associatedClaimId: claimId
      });
      setPinnedTitleMap(prev => ({ ...prev, [item.title]: true }));
    }

    // Also update claim validated precedents if claimId is provided
    let updatedClaims = activeCase.claims;
    if (claimId) {
      updatedClaims = activeCase.claims.map(c => {
        if (c.id === claimId) {
          const currentPrecedents = c.validatedPrecedents || [];
          const exists = currentPrecedents.some(p => p.title === item.title);
          return {
            ...c,
            validatedPrecedents: exists
              ? currentPrecedents.filter(p => p.title !== item.title)
              : [...currentPrecedents, {
                  title: item.title,
                  snippet: item.snippet,
                  url: item.url,
                  sourceType: item.sourceType,
                  relevance: item.relevance,
                  validatedAt: new Date().toISOString()
                }]
          };
        }
        return c;
      });
    }

    onUpdateCase({
      ...activeCase,
      claims: updatedClaims,
      researchFindings: updatedFindings
    });
  };

  // Handler to auto-research case claims & facts in evidence manifold
  const handleAutoCaseResearch = async () => {
    if (!activeCase) return;
    setIsAutoCaseSearching(true);
    setError(null);
    setActiveTab('Search');

    try {
      const res = await fetch('/api/research/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeCase })
      });

      if (!res.ok) {
        throw new Error(`Auto research failed with code ${res.status}`);
      }

      const data = await res.json();
      const findings: ResearchResult[] = data.findings || [];
      setResults(findings);

      if (findings.length === 0) {
        setError("No precedent matches returned. Try refining claims or evidence notes.");
      }
    } catch (err: any) {
      console.error("Auto case research error:", err);
      setError(`Auto Case Research failed: ${err.message}`);
    } finally {
      setIsAutoCaseSearching(false);
    }
  };
  
  // Tabs: Search Terminal, Precedents Directory, Contribute Precedent, saved, settings
  const [activeTab, setActiveTab] = useState<'Search' | 'Directory' | 'Contribute' | 'Saved' | 'Settings'>('Directory');
  
  // Precedent Directory states
  const [precedents, setPrecedents] = useState<Precedent[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);
  const [dirSearch, setDirSearch] = useState('');
  const [filterJurisdiction, setFilterJurisdiction] = useState<string>('all');
  const [filterCaseType, setFilterCaseType] = useState<string>('all');
  const [filterKeyTag, setFilterKeyTag] = useState<string>('all');
  const [expandedPrecedentId, setExpandedPrecedentId] = useState<string | null>(null);

  // Contribute form states
  const [formTitle, setFormTitle] = useState('');
  const [formCitation, setFormCitation] = useState('');
  const [formJurisdiction, setFormJurisdiction] = useState('Oregon Supreme Court');
  const [formCaseType, setFormCaseType] = useState('Civil - Contract');
  const [formDate, setFormDate] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [holdingsList, setHoldingsList] = useState<string[]>([]);
  const [currentHoldingInput, setCurrentHoldingInput] = useState('');
  const [keywordsList, setKeywordsList] = useState<string[]>([]);
  const [currentKeywordInput, setCurrentKeywordInput] = useState('');
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // original bookmark / settings states
  const [researchKey, setResearchKey] = useState<string>(() => localStorage.getItem('legal_research_api_key') || '');
  const [customEndpoint, setCustomEndpoint] = useState<string>(() => localStorage.getItem('legal_research_endpoint') || '');
  const [savedRecords, setSavedRecords] = useState<ResearchResult[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('legal_research_saved') || '[]');
    } catch {
      return [];
    }
  });

  // Unique elements IDs tracking counter
  const componentIdPrefix = "legal_res_terminal_";

  useEffect(() => {
    localStorage.setItem('legal_research_api_key', researchKey);
  }, [researchKey]);

  useEffect(() => {
    localStorage.setItem('legal_research_endpoint', customEndpoint);
  }, [customEndpoint]);

  useEffect(() => {
    localStorage.setItem('legal_research_saved', JSON.stringify(savedRecords));
  }, [savedRecords]);

  // Firestore Sync & Auto-Seeder
  useEffect(() => {
    const isSandbox = !auth.currentUser || auth.currentUser.uid === 'sandbox-user';
    if (isSandbox) {
      const savedLocalPrecedents = localStorage.getItem('legal_manifold_sandbox_precedents');
      if (savedLocalPrecedents) {
        try {
          const parsed = JSON.parse(savedLocalPrecedents);
          if (Array.isArray(parsed)) {
            setPrecedents(parsed);
            return;
          }
        } catch (e) {
          console.error("Failed to parse sandbox precedents", e);
        }
      }
      setPrecedents(SEED_PRECEDENTS);
      return;
    }

    const q = fsQuery(collection(db, 'precedents'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Precedent[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Precedent);
      });
      // Sort precedents
      list.sort((a, b) => (b.decisionDate || '').localeCompare(a.decisionDate || ''));
      setPrecedents(list);

      // If database is empty, seed it!
      if (list.length === 0 && !isSeeding) {
        triggeredAutoSeeding();
      }
    }, (error) => {
      console.warn("Firestore collection precedents failed to load. Falling back to local datasets.", error);
      setPrecedents(SEED_PRECEDENTS);
    });

    return () => unsubscribe();
  }, []);

  const triggeredAutoSeeding = async () => {
    setIsSeeding(true);
    console.log("[SYSTEM] Seeding foundational precedents empty database in Firestore.");
    try {
      for (const item of SEED_PRECEDENTS) {
        const docRef = doc(db, 'precedents', item.id);
        await setDoc(docRef, {
          id: item.id,
          title: item.title,
          citation: item.citation,
          jurisdiction: item.jurisdiction,
          caseType: item.caseType,
          decisionDate: item.decisionDate,
          summary: item.summary,
          holdings: item.holdings,
          keywords: item.keywords,
          addedBy: "system",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error("[SYSTEM] Autoseeding precedents failed. Non-blocking fallback activated.", err);
    } finally {
      setIsSeeding(false);
    }
  };

  // Re-seed manually
  const handleReloadDefaultPrecedents = async () => {
    setIsSeeding(true);
    setFormSuccess(null);
    try {
      for (const item of SEED_PRECEDENTS) {
        const docRef = doc(db, 'precedents', item.id);
        await setDoc(docRef, {
          id: item.id,
          title: item.title,
          citation: item.citation,
          jurisdiction: item.jurisdiction,
          caseType: item.caseType,
          decisionDate: item.decisionDate,
          summary: item.summary,
          holdings: item.holdings,
          keywords: item.keywords,
          addedBy: "system",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      setFormSuccess("Precedent Database has been loaded with legal precedents.");
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.WRITE, 'precedents');
      } catch (fErr: any) {
        setFormError("Failed to seed: " + fErr.message);
      }
    } finally {
      setIsSeeding(false);
    }
  };

  // AI-powered research via our server endpoint
  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setError(null);
    setResults([]);
    
    // 1. Gather matching local manifold data first
    const localMatches: ResearchResult[] = manifold.rules
      .filter(rule => 
        rule.title.toLowerCase().includes(query.toLowerCase()) || 
        rule.citation.toLowerCase().includes(query.toLowerCase()) ||
        (rule.notes?.toLowerCase().includes(query.toLowerCase()) ?? false)
      )
      .map(rule => ({
        title: `${rule.citation} - ${rule.title}`,
        snippet: rule.notes || `${rule.source_layer} Rule • Category: ${rule.category}`,
        url: '#',
        sourceType: rule.source_layer === 'ORS' ? 'STATUTE' : 'RULE',
        jurisdiction: 'Oregon',
        relevance: 100
      }));

    // 2. Query our Firestore Precedents Directory to provide specialized context to Gemini
    const databaseMatches = precedents.filter(p => 
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      p.citation.toLowerCase().includes(query.toLowerCase()) ||
      p.summary.toLowerCase().includes(query.toLowerCase()) ||
      p.keywords.some(k => k.toLowerCase().includes(query.toLowerCase()))
    ).slice(0, 5);

    try {
      // Call server side API proxy /api/research instead of client-side SDK!
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query,
          precedentsContext: databaseMatches.map(p => ({
            title: p.title,
            citation: p.citation,
            jurisdiction: p.jurisdiction,
            summary: p.summary,
            holdings: p.holdings
          }))
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned code ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      
      // Merge results
      const serverFindings: ResearchResult[] = responseData.findings || [];
      
      // Eliminate exact title duplicate collisions
      const seenTitles = new Set(localMatches.map(m => m.title.toLowerCase()));
      const filteredServer = serverFindings.filter(sf => {
        if (seenTitles.has(sf.title.toLowerCase())) return false;
        seenTitles.add(sf.title.toLowerCase());
        return true;
      });

      setResults([...localMatches, ...filteredServer]);
      
      // Save query parameter to history
      const history = JSON.parse(localStorage.getItem('legal_research_history') || '[]');
      localStorage.setItem('legal_research_history', JSON.stringify([{ query, timestamp: Date.now() }, ...history].slice(0, 20)));

    } catch (err: any) {
      console.error("[CLIENT] AI Legal Research failed:", err);
      if (localMatches.length > 0) {
        setResults(localMatches);
        setError("AI Research returned offline fallback. Displaying local rules matches.");
      } else {
        setError(`AI Research service failed to connect: ${err.message || "Endpoint error"}. Using offline database.`);
        
        // Offline database local search mock
        const dbMatches: ResearchResult[] = databaseMatches.map(p => ({
          title: `${p.citation} - ${p.title}`,
          snippet: `${p.summary} Holdings: ${p.holdings.join("; ")}`,
          url: "#",
          sourceType: 'CASE_LAW',
          jurisdiction: p.jurisdiction,
          relevance: 90
        }));
        setResults(dbMatches);
      }
    } finally {
      setIsSearching(false);
    }
  };

  // Precedents filtering
  const filterOptions = useMemo(() => {
    const jurisdictions = new Set<string>();
    const caseTypes = new Set<string>();
    const keywords = new Set<string>();
    
    precedents.forEach(p => {
      if (p.jurisdiction) jurisdictions.add(p.jurisdiction);
      if (p.caseType) caseTypes.add(p.caseType);
      if (p.keywords) p.keywords.forEach(k => keywords.add(k));
    });

    return {
      jurisdictions: Array.from(jurisdictions),
      caseTypes: Array.from(caseTypes),
      keywords: Array.from(keywords)
    };
  }, [precedents]);

  const filteredPrecedents = useMemo(() => {
    return precedents.filter(p => {
      const matchSearch = dirSearch.trim() === '' || 
        p.title.toLowerCase().includes(dirSearch.toLowerCase()) ||
        p.citation.toLowerCase().includes(dirSearch.toLowerCase()) ||
        p.summary.toLowerCase().includes(dirSearch.toLowerCase()) ||
        p.keywords.some(k => k.toLowerCase().includes(dirSearch.toLowerCase())) ||
        p.holdings.some(h => h.toLowerCase().includes(dirSearch.toLowerCase()));

      const matchJurisdiction = filterJurisdiction === 'all' || p.jurisdiction === filterJurisdiction;
      const matchCaseType = filterCaseType === 'all' || p.caseType === filterCaseType;
      const matchTag = filterKeyTag === 'all' || p.keywords.includes(filterKeyTag);

      return matchSearch && matchJurisdiction && matchCaseType && matchTag;
    });
  }, [precedents, dirSearch, filterJurisdiction, filterCaseType, filterKeyTag]);

  // Form helpers
  const handleAddHolding = () => {
    if (currentHoldingInput.trim()) {
      setHoldingsList([...holdingsList, currentHoldingInput.trim()]);
      setCurrentHoldingInput('');
    }
  };

  const handleAddKeyword = () => {
    if (currentKeywordInput.trim()) {
      const tag = currentKeywordInput.trim().toLowerCase();
      if (!keywordsList.includes(tag)) {
        setKeywordsList([...keywordsList, tag]);
      }
      setCurrentKeywordInput('');
    }
  };

  // Manual submission to Firestore
  const handlePrecedentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formTitle.trim() || !formCitation.trim() || !formSummary.trim()) {
      setFormError("Title, Citation, and Case Summary/Syllabus are required fields.");
      return;
    }

    setIsSubmitting(true);
    const docId = `user-added-${Date.now()}`;
    const cleanAddBy = auth.currentUser?.uid || "unregistered";

    const newPrecedentPayload: Precedent = {
      id: docId,
      title: formTitle.trim(),
      citation: formCitation.trim(),
      jurisdiction: formJurisdiction,
      caseType: formCaseType,
      decisionDate: formDate || new Date().toISOString().split('T')[0],
      summary: formSummary.trim(),
      holdings: holdingsList.length > 0 ? holdingsList : ["Holding general principle established by court."],
      keywords: keywordsList.length > 0 ? keywordsList : ["general"],
      addedBy: cleanAddBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const isSandbox = !auth.currentUser || auth.currentUser.uid === 'sandbox-user';
    if (isSandbox) {
      const updatedPrecedents = [newPrecedentPayload, ...precedents];
      setPrecedents(updatedPrecedents);
      localStorage.setItem('legal_manifold_sandbox_precedents', JSON.stringify(updatedPrecedents));
      setFormSuccess(`Case precedent successfully registered! "${formCitation} - ${formTitle}" is now fully integrated into the local intelligence manifold.`);
      
      // Reset form fields
      setFormTitle('');
      setFormCitation('');
      setFormDate('');
      setFormSummary('');
      setHoldingsList([]);
      setKeywordsList([]);
      
      // Direct user back to directory
      setTimeout(() => {
        setActiveTab('Directory');
        setFormSuccess(null);
      }, 3000);
      setIsSubmitting(false);
      return;
    }

    try {
      await setDoc(doc(db, 'precedents', docId), newPrecedentPayload);
      setFormSuccess(`Case precedent successfully registered! "${formCitation} - ${formTitle}" is now fully integrated into the intelligence manifold.`);
      
      // Reset form fields
      setFormTitle('');
      setFormCitation('');
      setFormDate('');
      setFormSummary('');
      setHoldingsList([]);
      setKeywordsList([]);
      
      // Direct user back to directory
      setTimeout(() => {
        setActiveTab('Directory');
        setFormSuccess(null);
      }, 3005);

    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, `precedents/${docId}`);
      } catch (fErr: any) {
        console.error("Submission failed: ", fErr);
        setFormError("Database Permission Violation: Your submission was rejected by our ABAC rules. Please verify fields and login state.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // AI discovery saving directly to database!
  const handleSaveAISearchToDB = async (res: ResearchResult) => {
    setFormError(null);
    setFormSuccess(null);
    
    // Normalize citation/details
    const generatedId = `ai-discovered-${Date.now()}`;
    const cleanAddBy = auth.currentUser?.uid || "system";
    
    // Split standard title if citation is part of it
    let citation = "Precedent Citation";
    let title = res.title;
    if (res.title.includes(" - ")) {
      const parts = res.title.split(" - ");
      citation = parts[0];
      title = parts[1];
    } else if (res.title.match(/\d+\s+[A-Za-z\.]+\s+\d+/)) {
      const match = res.title.match(/\d+\s+[A-Za-z\.]+\s+\d+/);
      if (match) {
        citation = match[0];
      }
    }

    const payload: Precedent = {
      id: generatedId,
      title: title,
      citation: citation,
      jurisdiction: res.jurisdiction || "Oregon State Courts",
      caseType: res.sourceType === 'STATUTE' ? 'Statutory Reference' : 'Case Law / Judicial Precedent',
      decisionDate: new Date().toISOString().split('T')[0],
      summary: res.snippet,
      holdings: ["AI Discovered precedent during active user research terminal consult."],
      keywords: ["ai-discovered", res.sourceType.toLowerCase()],
      addedBy: cleanAddBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const isSandbox = !auth.currentUser || auth.currentUser.uid === 'sandbox-user';
    if (isSandbox) {
      const updatedPrecedents = [payload, ...precedents];
      setPrecedents(updatedPrecedents);
      localStorage.setItem('legal_manifold_sandbox_precedents', JSON.stringify(updatedPrecedents));
      setFormSuccess(`Case discovery successfully integrated! Added "${citation} - ${title}" to local precedents directory.`);
      setTimeout(() => setFormSuccess(null), 3000);
      return;
    }

    try {
      await setDoc(doc(db, 'precedents', generatedId), payload);
      setFormSuccess(`Case discovery successfully integrated! Added "${citation} - ${title}" to precedents directory.`);
      setTimeout(() => setFormSuccess(null), 3000);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, `precedents/${generatedId}`);
      } catch (e: any) {
        setError("Missing permission to store precedent. Please authenticate.");
      }
    }
  };

  // Manual Delete of precedents
  const handleDeletePrecedent = async (id: string, addedBy: string | undefined) => {
    setError(null);
    setFormSuccess(null);
    
    const isSandbox = !auth.currentUser || auth.currentUser.uid === 'sandbox-user';
    if (isSandbox) {
      const remaining = precedents.filter(p => p.id !== id);
      setPrecedents(remaining);
      localStorage.setItem('legal_manifold_sandbox_precedents', JSON.stringify(remaining));
      setFormSuccess("Precedent deleted successfully.");
      setTimeout(() => setFormSuccess(null), 2500);
      return;
    }

    try {
      await deleteDoc(doc(db, 'precedents', id));
      setFormSuccess("Precedent deleted successfully.");
      setTimeout(() => setFormSuccess(null), 2500);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.DELETE, `precedents/${id}`);
      } catch (fErr: any) {
        setError(`Security Violation: You are not authorized to delete system-managed precedents. Only user-added cases are editable.`);
      }
    }
  };

  // Toggle bookmark on research results
  const handleToggleBookmark = (res: ResearchResult) => {
    const isSaved = savedRecords.some(r => r.title === res.title);
    if (isSaved) {
      setSavedRecords(savedRecords.filter(r => r.title !== res.title));
    } else {
      setSavedRecords([...savedRecords, res]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-x border-zinc-900" id={`${componentIdPrefix}root`}>
      {/* Header */}
      <div className="p-6 border-b border-zinc-900 bg-zinc-900/40 relative">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-950/30 rounded-lg border border-orange-500/20" id={`${componentIdPrefix}icon_container`}>
              <Scale className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-xl font-serif italic text-zinc-100" id={`${componentIdPrefix}title`}>Precedents & AI Research</h2>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">
                Hardened Attribute-Based Legal Precedents Directory & AI Grounded Terminal
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap bg-zinc-900/80 p-0.5 rounded-sm border border-zinc-800" id={`${componentIdPrefix}tab_bar`}>
            {([
              { id: 'Directory', label: 'Precedents DB', icon: <Database className="w-3 h-3" /> },
              { id: 'Search', label: 'Research Terminal', icon: <Sparkles className="w-3 h-3" /> },
              { id: 'Contribute', label: 'Contribute Case', icon: <Plus className="w-3 h-3" /> },
              { id: 'Saved', label: 'Bookmarks', icon: <Bookmark className="w-3 h-3" /> },
              { id: 'Settings', label: 'Config', icon: <Settings className="w-3 h-3" /> }
            ] as const).map(tab => (
              <button
                id={`${componentIdPrefix}tab_btn_${tab.id.toLowerCase()}`}
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setError(null);
                  setFormSuccess(null);
                  setFormError(null);
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-tighter transition-all cursor-pointer",
                  activeTab === tab.id 
                    ? "bg-orange-600 text-white font-bold shadow-md shadow-orange-950/20" 
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'Directory' && (
          <div className="flex flex-col gap-3" id={`${componentIdPrefix}dir_filters`}>
            {/* Direct Search in Directory */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                id={`${componentIdPrefix}dir_search_input`}
                type="text"
                placeholder="Query database of precedents by title, citation, core holdings, or keywords..."
                value={dirSearch}
                onChange={(e) => setDirSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-orange-500/50 rounded-sm font-sans"
              />
            </div>
            
            {/* Filter Pill rows */}
            <div className="flex flex-wrap items-center gap-4 text-xs mt-1" id={`${componentIdPrefix}filters_row`}>
              <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] uppercase tracking-wider font-mono">
                <Filter className="w-3 h-3" />
                <span>Filters:</span>
              </div>
              
              {/* Jurisdiction dropdown */}
              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-sm px-2 py-1">
                <span className="text-[10px] font-mono text-zinc-500">Court:</span>
                <select
                  id={`${componentIdPrefix}filter_jurisdiction`}
                  value={filterJurisdiction}
                  onChange={(e) => setFilterJurisdiction(e.target.value)}
                  className="bg-transparent text-zinc-300 font-mono text-[10px] focus:outline-none"
                >
                  <option value="all">All Jurisdictions</option>
                  {filterOptions.jurisdictions.map(jur => (
                    <option key={jur} value={jur}>{jur}</option>
                  ))}
                </select>
              </div>

              {/* Case Type dropdown */}
              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-sm px-2 py-1">
                <span className="text-[10px] font-mono text-zinc-500">Type:</span>
                <select
                  id={`${componentIdPrefix}filter_case_type`}
                  value={filterCaseType}
                  onChange={(e) => setFilterCaseType(e.target.value)}
                  className="bg-transparent text-zinc-300 font-mono text-[10px] focus:outline-none"
                >
                  <option value="all">All Types</option>
                  {filterOptions.caseTypes.map(ct => (
                    <option key={ct} value={ct}>{ct}</option>
                  ))}
                </select>
              </div>

              {/* Keyword tags dropdown */}
              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-sm px-2 py-1">
                <span className="text-[10px] font-mono text-zinc-500">Pin Tag:</span>
                <select
                  id={`${componentIdPrefix}filter_key_tag`}
                  value={filterKeyTag}
                  onChange={(e) => setFilterKeyTag(e.target.value)}
                  className="bg-transparent text-zinc-300 font-mono text-[10px] focus:outline-none"
                >
                  <option value="all">All Tags</option>
                  {filterOptions.keywords.map(kw => (
                    <option key={kw} value={kw}>{kw}</option>
                  ))}
                </select>
              </div>

              {/* Clear filters button */}
              {(filterJurisdiction !== 'all' || filterCaseType !== 'all' || filterKeyTag !== 'all' || dirSearch !== '') && (
                <button
                  id={`${componentIdPrefix}btn_clear_filters`}
                  onClick={() => {
                    setFilterJurisdiction('all');
                    setFilterCaseType('all');
                    setFilterKeyTag('all');
                    setDirSearch('');
                  }}
                  className="text-[10px] text-orange-500 hover:text-orange-400 font-mono underline cursor-pointer"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'Search' && (
          <div className="space-y-3" id={`${componentIdPrefix}active_ai_search`}>
            {activeCase && (
              <div className="p-3 bg-gradient-to-r from-orange-950/40 via-amber-950/20 to-zinc-950 border border-orange-500/30 rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Zap className="w-4 h-4 text-orange-400 animate-pulse shrink-0" />
                  <div>
                    <h4 className="text-xs font-mono font-bold text-orange-300 uppercase">
                      Auto-Research Active Case Claims & Evidence Manifold
                    </h4>
                    <p className="text-[10px] text-zinc-400 font-sans">
                      Automatically queries legal databases for precedents matching <span className="text-zinc-200 font-bold">{activeCase.claims?.length || 0} Claims</span> and <span className="text-zinc-200 font-bold">{activeCase.evidence?.length || 0} Evidence Facts</span> in <span className="text-orange-400 italic font-serif">"{activeCase.name}"</span>.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleAutoCaseResearch}
                  disabled={isAutoCaseSearching || !activeCase.claims || activeCase.claims.length === 0}
                  className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-800 text-white font-mono text-[10px] font-bold uppercase rounded transition-all shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isAutoCaseSearching ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Searching Precedent Databases...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Run Auto Case Research</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="relative group">
              <input
                id={`${componentIdPrefix}search_input`}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Query statutes, rules, or precedents (e.g., ORS 12.110 discovery rule accrual, summary judgment standards)..."
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 px-12 py-3.5 text-sm rounded-sm focus:outline-none focus:border-orange-500/50 transition-all font-serif"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-orange-500 transition-colors" />
              <button
                id={`${componentIdPrefix}btn_execute_search`}
                onClick={handleSearch}
                disabled={isSearching || !query.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-800 text-white transition-all rounded-sm shadow-lg shadow-orange-900/20 cursor-pointer"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>

            {/* Presets Bar */}
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-zinc-400">
              <span className="text-zinc-500 font-bold uppercase">Preset Queries:</span>
              <button
                onClick={() => {
                  setQuery("Oregon Statute of Limitations accrual discovery rule ORS 12.110 ORS 12.080 tolling precedents");
                }}
                className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-orange-400 rounded cursor-pointer"
              >
                Statute of Limitations & Accrual Rules
              </button>
              <button
                onClick={() => {
                  setQuery("Oregon Motion for Summary Judgment ORCP 47 C genuine issue material fact burden of proof precedents");
                }}
                className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-orange-400 rounded cursor-pointer"
              >
                Motion for Summary Judgment Case Law
              </button>
              <button
                onClick={() => {
                  setQuery("Oregon Breach of contract warranty economic loss rule evidence requirements");
                }}
                className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-orange-400 rounded cursor-pointer"
              >
                Evidence Manifold Fact Matcher
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6" id={`${componentIdPrefix}content_container`}>
        {/* Notifications and Alerts */}
        {error && (
          <div className="p-4 bg-red-950/20 border border-red-900/30 text-red-400 text-xs font-mono flex items-center gap-3 mb-4 rounded-sm" id={`${componentIdPrefix}g_error`}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {formSuccess && (
          <div className="p-4 bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 text-xs font-mono flex items-center gap-3 mb-4 rounded-sm" id={`${componentIdPrefix}g_success`}>
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{formSuccess}</span>
          </div>
        )}

        {/* Tab 1: Precedents Directory */}
        {activeTab === 'Directory' && (
          <div className="space-y-4" id={`${componentIdPrefix}dir_tab`}>
            <div className="flex justify-between items-center text-xs font-mono text-zinc-500 border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-orange-500" />
                <span>ACTIVE PRECEDENTS SYNCED: <strong className="text-zinc-300 font-bold">{filteredPrecedents.length}</strong> of {precedents.length}</span>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Cloud Sync Active</span>
                
                {precedents.length < SEED_PRECEDENTS.length && (
                  <button
                    id={`${componentIdPrefix}btn_seed_database`}
                    onClick={handleReloadDefaultPrecedents}
                    disabled={isSeeding}
                    className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-[10px] text-zinc-300 px-2 py-1 rounded-sm cursor-pointer disabled:opacity-50"
                  >
                    {isSeeding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Layers className="w-3 h-3" />}
                    Seeds Core DB
                  </button>
                )}
              </div>
            </div>

            {isSeeding ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
                <p className="text-xs font-mono uppercase text-orange-500 animate-pulse">Syncing foundational precedents database...</p>
              </div>
            ) : filteredPrecedents.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center border border-dashed border-zinc-900 rounded-sm">
                <Info className="w-10 h-10 text-zinc-700 mb-3" />
                <p className="text-xs font-mono uppercase text-zinc-400">No Precedents Found</p>
                <p className="text-[11px] text-zinc-600 font-sans italic mt-1 max-w-sm text-center">
                  Try clearing search filters or hit "Seeds Core DB" to initialize the database with foundational case law.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4" id={`${componentIdPrefix}dir_list`}>
                {filteredPrecedents.map((precedent) => {
                  const isExpanded = expandedPrecedentId === precedent.id;
                  const canDelete = precedent.addedBy && precedent.addedBy !== 'system';
                  
                  return (
                    <div 
                      key={precedent.id} 
                      id={`${componentIdPrefix}card_${precedent.id}`}
                      className={cn(
                        "bg-zinc-900/60 border rounded-sm transition-all shadow-sm overflow-hidden",
                        isExpanded ? "border-orange-500/40 bg-zinc-900/90" : "border-zinc-900 hover:border-zinc-800"
                      )}
                    >
                      {/* Card Header row */}
                      <div 
                        onClick={() => setExpandedPrecedentId(isExpanded ? null : precedent.id)}
                        className="p-5 flex items-start justify-between gap-4 cursor-pointer selection:bg-transparent"
                      >
                        <div className="space-y-1 bg-transparent">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-1.5 py-0.5 text-[8px] font-bold rounded uppercase tracking-wider bg-orange-600/10 border border-orange-500/20 text-orange-400">
                              {precedent.citation}
                            </span>
                            <span className="text-[9px] font-mono text-zinc-500">
                              {precedent.jurisdiction}
                            </span>
                            <span className="text-[9px] font-mono text-zinc-600">
                              | {precedent.caseType}
                            </span>
                          </div>
                          
                          <h3 className="text-sm font-serif font-bold text-zinc-100 group-hover:text-orange-500 transition-colors">
                            {precedent.title}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                          <span className="text-[10px] text-zinc-600 font-mono mr-2">{precedent.decisionDate}</span>
                          
                          {/* Trash button if user added it */}
                          {canDelete && (
                            <button
                              id={`${componentIdPrefix}btn_del_${precedent.id}`}
                              onClick={() => handleDeletePrecedent(precedent.id, precedent.addedBy)}
                              className="p-1 px-1.5 hover:bg-zinc-800 text-zinc-600 hover:text-red-500 border border-transparent hover:border-zinc-700 rounded-sm cursor-pointer transition-all"
                              title="Delete precedent"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          
                          <button
                            id={`${componentIdPrefix}btn_expand_${precedent.id}`}
                            onClick={() => setExpandedPrecedentId(isExpanded ? null : precedent.id)}
                            className="bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-400 hover:text-zinc-100 px-2 py-0.5 rounded-sm font-mono cursor-pointer transition-all"
                          >
                            {isExpanded ? "Collapse" : "Review"}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Section Detail */}
                      {isExpanded && (
                        <div className="px-5 pb-5 pt-3 border-t border-zinc-900/60 bg-zinc-950/45 space-y-4 font-sans text-xs">
                          {/* Case Summary */}
                          <div>
                            <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 mb-1 flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-orange-500" />
                              Case Summary & Synopsis
                            </h4>
                            <p className="text-zinc-300 leading-relaxed font-serif italic pl-3 border-l border-orange-500/40">
                              "{precedent.summary}"
                            </p>
                          </div>

                          {/* holdings list */}
                          {precedent.holdings && precedent.holdings.length > 0 && (
                            <div>
                              <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
                                <Scale className="w-3.5 h-3.5 text-orange-500" />
                                Key Court Holdings
                              </h4>
                              <div className="space-y-1.5 pl-3">
                                {precedent.holdings.map((h, hIdx) => (
                                  <div key={hIdx} className="flex items-start gap-2.5 text-zinc-300">
                                    <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                    <span>{h}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* keywords list */}
                          {precedent.keywords && precedent.keywords.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-2">
                              <Tag className="w-3 h-3 text-zinc-600 mr-1" />
                              {precedent.keywords.map((kw, kwIdx) => (
                                <span 
                                  key={kwIdx} 
                                  className="text-[9px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 uppercase tracking-tight"
                                >
                                  {kw}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: AI Research Terminal */}
        {activeTab === 'Search' && (
          <div className="space-y-4" id={`${componentIdPrefix}ai_search_tab`}>
            {results.length > 0 ? (
              <div className="grid grid-cols-1 gap-4" id={`${componentIdPrefix}results_grid`}>
                <div className="p-3 bg-indigo-950/10 border border-indigo-900/20 text-indigo-400 text-[10px] font-mono flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    <span>AI MANIFOLD RETURNED {results.length} EVIDENCE DISCOVERIES GROUNDED IN PRECEDENTS DB</span>
                  </div>
                  <span>Query: "{query}"</span>
                </div>

                {results.map((result, idx) => {
                  const isSaved = savedRecords.some(r => r.title === result.title);
                  return (
                    <div 
                      key={idx} 
                      id={`${componentIdPrefix}res_card_${idx}`}
                      className="group relative bg-zinc-900/80 border border-zinc-900 hover:border-zinc-800 p-5 rounded-sm transition-all"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-1.5 py-0.5 text-[8px] font-bold rounded uppercase tracking-widest border",
                              result.sourceType === 'STATUTE' ? "border-indigo-500/30 text-indigo-400 bg-indigo-500/5" :
                              result.sourceType === 'CASE_LAW' ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/5" :
                              result.sourceType === 'RULE' ? "border-amber-500/30 text-amber-400 bg-amber-500/5" :
                              "border-zinc-500/30 text-zinc-400 bg-zinc-500/5"
                            )}>
                              {result.sourceType}
                            </span>
                            {result.jurisdiction && (
                              <span className="text-[8px] font-mono text-zinc-500 uppercase">{result.jurisdiction}</span>
                            )}
                          </div>
                          
                          <h3 className="text-sm font-serif font-bold text-zinc-100 group-hover:text-orange-500 transition-colors leading-tight">
                            {result.title}
                          </h3>
                        </div>
                        
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {activeCase && (
                            <button
                              onClick={() => handlePinToCase(result)}
                              className={cn(
                                "font-mono text-[9px] px-2 py-1 rounded-sm flex items-center gap-1 cursor-pointer transition-all font-bold",
                                pinnedTitleMap[result.title] || (activeCase.researchFindings?.some(f => f.title === result.title))
                                  ? "bg-amber-500 text-zinc-950"
                                  : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              )}
                              title="Attach authority to active case research findings & MSJ generation"
                            >
                              <Pin className="w-3 h-3" />
                              {pinnedTitleMap[result.title] || (activeCase.researchFindings?.some(f => f.title === result.title)) ? "Pinned to Case" : "Pin to Case"}
                            </button>
                          )}

                          {/* Save finding as a permanent Precedent Database record */}
                          {result.sourceType === 'CASE_LAW' && (
                            <button
                              id={`${componentIdPrefix}btn_integrate_discovery_${idx}`}
                              onClick={() => handleSaveAISearchToDB(result)}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[9px] px-2 py-1 rounded-sm flex items-center gap-1 cursor-pointer transition-all"
                              title="Integrate as Precedent in cloud DB"
                            >
                              <Plus className="w-3 h-3" />
                              Integrate Precedent
                            </button>
                          )}

                          <button 
                            id={`${componentIdPrefix}btn_bookmark_${idx}`}
                            onClick={() => handleToggleBookmark(result)}
                            className={cn(
                              "p-1.5 border hover:border-zinc-700 rounded-sm cursor-pointer transition-all",
                              isSaved ? "bg-orange-600/10 border-orange-500/30 text-orange-400" : "text-zinc-500 hover:text-zinc-300 border-zinc-800"
                            )}
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                          </button>

                          {result.url && result.url !== '#' && (
                            <a 
                              href={result.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-1.5 bg-zinc-800/40 hover:bg-zinc-800 text-zinc-500 hover:text-orange-500 border border-zinc-800 hover:border-zinc-700 rounded-sm transition-all"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-xs text-zinc-400 leading-relaxed font-serif pl-3 border-l-2 border-zinc-800 italic">
                        "{result.snippet}"
                      </p>
                      
                      <div className="mt-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="h-[1px] flex-1 bg-zinc-900" />
                        <span className="text-[8px] font-mono text-zinc-600 uppercase">Analysis Complete (Match Relevance: {result.relevance}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : !isSearching ? (
              <div className="h-72 flex flex-col items-center justify-center text-zinc-700 border border-dashed border-zinc-900 rounded-sm">
                <Sparkles className="w-12 h-12 mb-4 text-zinc-800 opacity-40 animate-pulse" />
                <p className="text-[10px] font-mono uppercase tracking-[0.2em]">Research Manifold Ready</p>
                <p className="text-[11px] mt-2 italic text-zinc-500 max-w-sm text-center">
                  Search across primary law resources. Matching precedents from your synced cloud DB will automatically be infused as constraints to query ground findings.
                </p>
              </div>
            ) : (
              <div className="h-72 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
                <p className="text-[10px] font-mono uppercase tracking-widest text-orange-500 animate-pulse">Querying Search Grounding & precedents DB...</p>
                <p className="text-[10px] mt-2 text-zinc-600 italic">Consulting Supreme Court holdings and state statutory frameworks</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Contribute / Register Precedent Form */}
        {activeTab === 'Contribute' && (
          <div className="max-w-3xl space-y-6" id={`${componentIdPrefix}add_precedent_tab`}>
            {formError && (
              <div className="p-4 bg-red-950/20 border border-red-900/20 text-red-400 text-xs font-mono" id={`${componentIdPrefix}form_p_err`}>
                {formError}
              </div>
            )}

            <div className="p-4 bg-orange-950/10 border border-orange-900/10 rounded-sm text-neutral-400">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-[10px] font-mono font-bold text-orange-500 uppercase tracking-widest">
                    REGISTER LANDMARK LEGAL PRECEDENT
                  </h4>
                  <p className="text-[11px] leading-relaxed">
                    Insert primary legal precedents and case decisions to enrich the AI active reasoning layer. 
                    Your contribution is stored persistently in the database and synced across active legal analysis panels. Fields must strictly comply with ABAC schema validations.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handlePrecedentSubmit} className="space-y-4 font-sans text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">
                    Case Title / Style *
                  </label>
                  <input
                    id={`${componentIdPrefix}form_title`}
                    type="text"
                    required
                    placeholder="e.g. State v. Maciel"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 px-3 py-2 text-xs focus:outline-none focus:border-orange-500/50"
                  />
                </div>

                {/* Citation */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">
                    Citation Volume *
                  </label>
                  <input
                    id={`${componentIdPrefix}form_citation`}
                    type="text"
                    required
                    placeholder="e.g. 345 Or 231"
                    value={formCitation}
                    onChange={(e) => setFormCitation(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 px-3 py-2 text-xs focus:outline-none focus:border-orange-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                {/* Jurisdiction */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase text-zinc-500 block">Jurisdiction</label>
                  <select
                    id={`${componentIdPrefix}form_jurisdiction`}
                    value={formJurisdiction}
                    onChange={(e) => setFormJurisdiction(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 px-3 py-2 text-xs focus:outline-none focus:border-orange-500/50"
                  >
                    <option value="Oregon Supreme Court">Oregon Supreme Court</option>
                    <option value="Oregon Court of Appeals">Oregon Court of Appeals</option>
                    <option value="U.S. Supreme Court">U.S. Supreme Court</option>
                    <option value="9th Circuit Court of Appeals">9th Circuit Court of Appeals</option>
                    <option value="Federal District Court of Oregon">Federal District Court of Oregon</option>
                    <option value="Other Landmark Common Law">Other Landmark Common Law</option>
                  </select>
                </div>

                {/* Case Type */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase text-zinc-500 block">Case Classification</label>
                  <select
                    id={`${componentIdPrefix}form_case_type`}
                    value={formCaseType}
                    onChange={(e) => setFormCaseType(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 px-3 py-2 text-xs focus:outline-none focus:border-orange-500/50"
                  >
                    <option value="Civil - Contract">Civil - Contract</option>
                    <option value="Tort / Municipal Liability">Tort / Municipal Liability</option>
                    <option value="Civil Rights / Constitutional">Civil Rights / Constitutional</option>
                    <option value="Criminal / Constitutional">Criminal / Constitutional</option>
                    <option value="Family Law / Custody">Family Law / Custody</option>
                    <option value="Estate & Probate Law">Estate & Probate Law</option>
                    <option value="Civil Procedure">Civil Procedure</option>
                  </select>
                </div>

                {/* Decision Date */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase text-zinc-500 block">Date of Decision</label>
                  <input
                    id={`${componentIdPrefix}form_date`}
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 px-3 py-1.5 text-xs focus:outline-none focus:border-orange-500/50"
                  />
                </div>
              </div>

              {/* Summary / Syllabus */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">
                  Case Summary / Judicial Syllabus *
                </label>
                <textarea
                  id={`${componentIdPrefix}form_summary`}
                  rows={4}
                  required
                  placeholder="Insert case facts, key legal questions, and court synopsis details in text..."
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 p-3 text-xs focus:outline-none focus:border-orange-500/50 rounded-sm font-serif italic"
                />
              </div>

              {/* Holdings list builder */}
              <div className="space-y-2 border-t border-zinc-900 pt-4" id={`${componentIdPrefix}form_holdings_builder`}>
                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">
                  Add Official Holdings Statements
                </label>
                <div className="flex gap-2">
                  <input
                    id={`${componentIdPrefix}form_holding_input`}
                    type="text"
                    placeholder="Enter distinct legal rule holding established..."
                    value={currentHoldingInput}
                    onChange={(e) => setCurrentHoldingInput(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-300 px-3 py-2 text-xs focus:outline-none focus:border-orange-500/50"
                  />
                  <button
                    id={`${componentIdPrefix}btn_add_holding`}
                    type="button"
                    onClick={handleAddHolding}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 hover:text-orange-500 border border-zinc-700 px-3 py-2 font-mono uppercase tracking-tighter text-[10px] cursor-pointer"
                  >
                    + Add Holding
                  </button>
                </div>
                
                {holdingsList.length > 0 && (
                  <div className="bg-zinc-950/60 p-3 border border-zinc-900 space-y-1.5">
                    {holdingsList.map((holding, idx) => (
                      <div key={idx} className="flex justify-between items-start gap-2 text-zinc-300">
                        <div className="flex gap-2">
                          <span className="text-[10px] font-mono text-orange-500">[{idx+1}]</span>
                          <span>{holding}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setHoldingsList(holdingsList.filter((_, i) => i !== idx))}
                          className="text-zinc-600 hover:text-red-500 text-[10px] font-mono"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Keyword key-tags builder */}
              <div className="space-y-2 border-t border-zinc-900 pt-4 pb-2" id={`${componentIdPrefix}form_keywords_builder`}>
                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">
                  Search Keywords & Tags
                </label>
                <div className="flex gap-2">
                  <input
                    id={`${componentIdPrefix}form_keyword_input`}
                    type="text"
                    placeholder="e.g. search, custody, OTCA statutory liability..."
                    value={currentKeywordInput}
                    onChange={(e) => setCurrentKeywordInput(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-300 px-3 py-2 text-xs focus:outline-none focus:border-orange-500/50"
                  />
                  <button
                    id={`${componentIdPrefix}btn_add_tag`}
                    type="button"
                    onClick={handleAddKeyword}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 hover:text-orange-500 border border-zinc-700 px-3 py-2 text-[10px] font-mono uppercase tracking-tighter cursor-pointer"
                  >
                    + Add Tag
                  </button>
                </div>
                
                {keywordsList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {keywordsList.map((tag, idx) => (
                      <span 
                        key={idx}
                        className="bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono text-[9px] px-2 py-0.5 rounded-sm flex items-center gap-1.5 uppercase"
                      >
                        {tag}
                        <button 
                          type="button" 
                          onClick={() => setKeywordsList(keywordsList.filter((_, i) => i !== idx))}
                          className="text-zinc-600 hover:text-red-500 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-zinc-900 flex justify-end gap-3" id={`${componentIdPrefix}form_footer`}>
                <button
                  id={`${componentIdPrefix}btn_cancel_form`}
                  type="button"
                  onClick={() => setActiveTab('Directory')}
                  className="px-4 py-2 text-[10px] font-mono text-zinc-500 hover:text-zinc-300 uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id={`${componentIdPrefix}btn_submit_precedent`}
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-mono font-bold uppercase tracking-widest text-[10px] px-5 py-2.5 shadow-md shadow-orange-950/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Syncing..." : "Publish to Database"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 4: Saved Bookmarked Findings */}
        {activeTab === 'Saved' && (
          <div className="space-y-4" id={`${componentIdPrefix}bookmarks_tab`}>
            {savedRecords.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-zinc-700 border border-dashed border-zinc-900 rounded-sm">
                <Bookmark className="w-12 h-12 mb-4 opacity-10" />
                <p className="text-[10px] font-mono uppercase tracking-widest">No Bookmarks Saved</p>
                <p className="text-[10px] text-zinc-700 mt-2 italic">Bookmarked search findings from the Research Terminal will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4" id={`${componentIdPrefix}saved_list`}>
                {savedRecords.map((saved, idx) => (
                  <div key={idx} className="bg-zinc-900 border border-zinc-900 p-5 rounded-sm relative group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex flex-col gap-1 bg-transparent">
                        <span className="px-1.5 py-0.5 text-[8px] font-bold rounded uppercase tracking-widest border border-orange-500/30 text-orange-400 bg-orange-500/5 max-w-max">
                          {saved.sourceType}
                        </span>
                        <h3 className="text-sm font-serif font-bold text-zinc-100 leading-tight">
                          {saved.title}
                        </h3>
                      </div>
                      <button 
                        id={`${componentIdPrefix}btn_unsave_${idx}`}
                        onClick={() => setSavedRecords(savedRecords.filter(r => r.title !== saved.title))}
                        className="text-zinc-600 hover:text-red-500 text-xs font-mono font-bold"
                      >
                        Remove Bookmark
                      </button>
                    </div>
                    <p className="text-xs text-zinc-400 font-serif italic pl-3 border-l-2 border-zinc-800">
                      "{saved.snippet}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Settings / Config option */}
        {activeTab === 'Settings' && (
          <div className="max-w-xl space-y-6 mt-4" id={`${componentIdPrefix}config_tab`}>
            <div className="p-4 bg-orange-950/10 border border-orange-900/20 rounded-sm">
              <div className="flex items-start gap-4">
                <Shield className="w-6 h-6 text-orange-500 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-mono font-bold text-orange-500 uppercase tracking-widest mb-2">Research Configuration</h4>
                  <p className="text-[11px] text-orange-400/70 font-mono leading-relaxed">
                    Connecting external legal research APIs enables real-time synchronization with primary law networks.
                    Tokens are strictly stored in local browser environments.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6 text-xs">
              <div className="space-y-2">
                <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                  Custom Research Endpoint
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                    <input
                      id={`${componentIdPrefix}config_endpoint`}
                      type="text"
                      value={customEndpoint}
                      onChange={(e) => setCustomEndpoint(e.target.value)}
                      placeholder="https://api.clerk.legal/v1"
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 pl-10 pr-3 py-2 text-xs font-mono focus:outline-none focus:border-orange-500/50"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                  External API Key / Secret Token
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                    <input
                      id={`${componentIdPrefix}config_key`}
                      type="password"
                      value={researchKey}
                      onChange={(e) => setResearchKey(e.target.value)}
                      placeholder="sk-research-xxxxxxxx"
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 pl-10 pr-3 py-2 text-xs font-mono focus:outline-none focus:border-orange-500/50"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-between items-center bg-transparent">
                <button
                  id={`${componentIdPrefix}btn_reset_defaults_config`}
                  onClick={async () => {
                    await handleReloadDefaultPrecedents();
                  }}
                  className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 px-3 py-2 text-[10px] font-mono uppercase tracking-tighter cursor-pointer"
                >
                  Reload System Precedents
                </button>

                <button 
                  id={`${componentIdPrefix}btn_reset_config`}
                  onClick={() => {
                    localStorage.removeItem('legal_research_api_key');
                    localStorage.removeItem('legal_research_endpoint');
                    setResearchKey('');
                    setCustomEndpoint('');
                  }}
                  className="text-[10px] font-mono text-zinc-600 uppercase hover:text-red-500 transition-colors"
                >
                  Reset Client Configurations
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer / Status bar */}
      <div className="p-4 bg-zinc-950 border-t border-zinc-900 flex justify-between items-center text-[10px] text-zinc-500 font-mono" id={`${componentIdPrefix}footer`}>
        <div className="flex gap-4">
          {manifold.metadata.sources.map(source => (
            <span key={source}>{source}</span>
          ))}
          <span className="text-zinc-600">|</span>
          <span className="text-orange-500/75 uppercase font-bold text-[9px]">Precedent ABAC Protection Enabled</span>
        </div>
        <span>Total Sync: {precedents.length} Precedent Records</span>
      </div>
    </div>
  );
};
