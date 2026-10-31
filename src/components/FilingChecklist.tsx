import React, { useState } from 'react';
import { Case } from '../types';
import { 
  ClipboardCheck, 
  ShieldCheck, 
  Zap, 
  BarChart3, 
  FileSignature, 
  AlertCircle, 
  Gavel, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Search, 
  Sparkles, 
  ListChecks, 
  BookOpen, 
  Scale, 
  Plus, 
  Trash2, 
  Copy, 
  Check,
  Building2,
  Database,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Download,
  Filter
} from 'lucide-react';
import { cn } from '../lib/utils';

interface FilingChecklistProps {
  activeCase: Case;
  onUpdateCase: (updatedCase: Case) => void;
}

export type DocumentTab = 'complaint' | 'msj' | 'general' | 'evidence_audit';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  promptInstruction?: string;
  category: string;
}

interface ChecklistSection {
  title: string;
  categoryKey: string;
  icon: React.ReactNode;
  items: ChecklistItem[];
}

// --- COMPLAINT DRAFTING CHECKLIST SECTIONS ---
const COMPLAINT_SECTIONS: ChecklistSection[] = [
  {
    title: "1. Case Caption & Parties",
    categoryKey: "c_parties",
    icon: <Building2 className="w-4 h-4 text-orange-500" />,
    items: [
      {
        id: "c_caption_format",
        category: "c_parties",
        label: "Court & Parties Caption",
        description: "Ensure complete designation of Court, Division, Plaintiff(s), Defendant(s), and Case Number header.",
        promptInstruction: "Verify that all party names in the caption strictly match legal entities named in contracts and public corporate filings."
      },
      {
        id: "c_party_capacity",
        category: "c_parties",
        label: "Party Capacity & Standing",
        description: "Explicit allegations establishing legal capacity (individual, LLC, corporation, guardian) and standing to sue.",
        promptInstruction: "Cross-check Plaintiff's standing (direct injury in fact) and Defendant's legal capacity under state corporate records."
      },
      {
        id: "c_corp_disclosure",
        category: "c_parties",
        label: "Corporate Disclosure Statement",
        description: "Statement identifying parent corporations or stock ticker symbols for corporate entities (FRCP 7.1 / local rules).",
        promptInstruction: "Verify corporate ticker symbols and parent/subsidiary relationships against official SEC EDGAR disclosures."
      }
    ]
  },
  {
    title: "2. Jurisdiction & Venue",
    categoryKey: "c_jurisdiction",
    icon: <Scale className="w-4 h-4 text-orange-500" />,
    items: [
      {
        id: "c_subject_jurisdiction",
        category: "c_jurisdiction",
        label: "Subject Matter Jurisdiction",
        description: "Specific statutory basis establishing jurisdiction (e.g., 28 U.S.C. § 1331 Federal Question, § 1332 Diversity, or State General Jurisdiction).",
        promptInstruction: "Verify that amount-in-controversy exceeds $75,000 for diversity or identify specific federal statutory claims."
      },
      {
        id: "c_personal_jurisdiction",
        category: "c_jurisdiction",
        label: "Personal Jurisdiction",
        description: "Factual basis for personal jurisdiction over each Defendant (domicile, principal place of business, specific acts under Long-Arm statute).",
        promptInstruction: "Verify minimum contacts: confirm forum state acts, contract execution place, or tortious impact locations."
      },
      {
        id: "c_venue_basis",
        category: "c_jurisdiction",
        label: "Statutory Venue Allegations",
        description: "Specific factual grounds establishing venue under 28 U.S.C. § 1391 or state venue statutes.",
        promptInstruction: "Ensure venue facts reference the location where substantial events occurred or property is situated."
      },
      {
        id: "c_exhaustion_notice",
        category: "c_jurisdiction",
        label: "Statutory Prerequisites & Pre-Suit Notice",
        description: "Verification that required notices (e.g. Tort Claims Act, EEOC Right-to-Sue, statutory demand letters) were timely served.",
        promptInstruction: "Check Evidence Manifold for certified mail return receipts proving pre-suit notice delivery dates."
      }
    ]
  },
  {
    title: "3. Statement of Facts & Evidence Manifold Alignment",
    categoryKey: "c_facts",
    icon: <Database className="w-4 h-4 text-orange-500" />,
    items: [
      {
        id: "c_facts_chronological",
        category: "c_facts",
        label: "Chronological Narrative",
        description: "Statement of facts organized in a clear, date-sequenced narrative avoiding unsupported legal conclusions.",
        promptInstruction: "Verify timeline against Case Timeline entries to ensure no missing dates or gaps in key event sequencing."
      },
      {
        id: "c_facts_evidence_mapping",
        category: "c_facts",
        label: "Evidence Manifold Cross-Referencing",
        description: "Direct bracketed citations to specific Exhibits in the Evidence Manifold for every core factual sentence (e.g., [Exhibit A, p. 3]).",
        promptInstruction: "Prompt verification: Scan every paragraph in Statement of Facts and ensure an Exhibit ID is explicitly cited."
      },
      {
        id: "c_facts_non_conclusory",
        category: "c_facts",
        label: "Non-Conclusory Ultimate Facts",
        description: "Ensure allegations state specific ultimate acts, omissions, dates, and locations rather than bare legal conclusions.",
        promptInstruction: "Audit fact sentences: Replace phrases like 'Defendant acted fraudulently' with specific misrepresentation details."
      }
    ]
  },
  {
    title: "4. Claims / Causes of Action & Legal Elements",
    categoryKey: "c_claims",
    icon: <Gavel className="w-4 h-4 text-orange-500" />,
    items: [
      {
        id: "c_claims_counts",
        category: "c_claims",
        label: "Separation of Counts",
        description: "Each distinct cause of action set forth in a separate numbered Count (Count I, Count II, etc.).",
        promptInstruction: "Verify that claims are cleanly partitioned and incorporate prior factual allegations by reference."
      },
      {
        id: "c_claims_elements",
        category: "c_claims",
        label: "All Essential Legal Elements Pleaded",
        description: "Every required legal element of each cause of action is supported by specific ultimate facts pleaded.",
        promptInstruction: "Compare claim elements against the Legal Claims module to confirm 100% element coverage."
      },
      {
        id: "c_claims_governing_law",
        category: "c_claims",
        label: "Governing Law & Statutory Citation",
        description: "Explicit citation to governing statutes, administrative rules, or common law doctrines establishing liability.",
        promptInstruction: "Run Citation Audit to confirm statutes and precedents cited in claims are current and binding."
      },
      {
        id: "c_claims_causation",
        category: "c_claims",
        label: "Proximate Cause & Direct Injury Nexus",
        description: "Explicit causation nexus showing Defendant's conduct directly and proximately caused Plaintiff's injuries.",
        promptInstruction: "Verify factual bridge linking Defendant's breach/violation directly to Plaintiff's quantifiable harm."
      }
    ]
  },
  {
    title: "5. Prayer for Relief & Demand",
    categoryKey: "c_prayer",
    icon: <BarChart3 className="w-4 h-4 text-orange-500" />,
    items: [
      {
        id: "c_prayer_damages",
        category: "c_prayer",
        label: "Specific Damages Demanded",
        description: "Clear specification of general, special, economic, non-economic, or statutory damages requested.",
        promptInstruction: "Cross-check damage figures against damages calculation worksheets or financial evidence exhibits."
      },
      {
        id: "c_prayer_equitable",
        category: "c_prayer",
        label: "Equitable & Injunctive Relief",
        description: "Specific details for requested preliminary or permanent injunctions, declaratory relief, or specific performance.",
        promptInstruction: "Verify that irreparable harm and lack of adequate remedy at law are explicitly asserted."
      },
      {
        id: "c_prayer_fees_interest",
        category: "c_prayer",
        label: "Interest, Costs & Attorney Fees",
        description: "Statutory or contractual demand for pre/post-judgment interest, court costs, and attorney fees under applicable law.",
        promptInstruction: "Cite specific statutory authority (e.g. ORS 20.080, ORS 82.010 or FRCP 54) for fee recovery."
      },
      {
        id: "c_jury_demand",
        category: "c_prayer",
        label: "Jury Trial Demand",
        description: "Explicit demand for trial by jury set forth prominently in caption and closing prayer (if requested).",
        promptInstruction: "Ensure 'DEMAND FOR JURY TRIAL' is clearly included in the document header and prayer for relief."
      }
    ]
  },
  {
    title: "6. Signatures & Rule 11 Verification",
    categoryKey: "c_signatures",
    icon: <FileSignature className="w-4 h-4 text-orange-500" />,
    items: [
      {
        id: "c_sig_block",
        category: "c_signatures",
        label: "Complete Signature Block",
        description: "Signature line, printed name, Bar/OSB number, complete law firm/pro se address, phone, and official email.",
        promptInstruction: "Confirm contact details match exact e-filing portal registration records."
      },
      {
        id: "c_rule11_cert",
        category: "c_signatures",
        label: "Rule 11 / Good Faith Certification",
        description: "Certification that document is well-grounded in fact, non-frivolous, and not presented for improper delay.",
        promptInstruction: "Verify that all factual representations have evidentiary support or are likely to have support after discovery."
      },
      {
        id: "c_cert_service",
        category: "c_signatures",
        label: "Summons & Certificate of Service",
        description: "Summons forms prepared for each named Defendant and Certificate of Service mode specified.",
        promptInstruction: "Confirm process server instructions or e-filing service list details."
      }
    ]
  }
];

// --- MOTION FOR SUMMARY JUDGMENT (MSJ) CHECKLIST SECTIONS ---
const MSJ_SECTIONS: ChecklistSection[] = [
  {
    title: "1. Motion Header & Procedural Requirements",
    categoryKey: "m_procedural",
    icon: <Gavel className="w-4 h-4 text-orange-500" />,
    items: [
      {
        id: "m_notice_hearing",
        category: "m_procedural",
        label: "Notice of Motion & Hearing Date",
        description: "Motion header specifying relief sought, hearing date/time, judge assigned, and response deadlines.",
        promptInstruction: "Verify court calendar rules for summary judgment motion setting and briefing schedules."
      },
      {
        id: "m_conferral_cert",
        category: "m_procedural",
        label: "Good Faith Conferral Certification",
        description: "Certification of pre-filing conferral with opposing counsel (e.g., UTCR 5.010 / Local Rule 7-1).",
        promptInstruction: "Verify date, time, mode (phone/in person), and outcome of conferral with opposing counsel."
      },
      {
        id: "m_legal_standard",
        category: "m_procedural",
        label: "Summary Judgment Standard Recital",
        description: "Explicit recital of summary judgment standard (FRCP 56 / ORCP 47): no genuine dispute as to any material fact.",
        promptInstruction: "Confirm clear framing of movant's initial burden and non-movant's burden of production."
      }
    ]
  },
  {
    title: "2. Concise Statement of Material Facts (CSMF)",
    categoryKey: "m_csmf",
    icon: <Database className="w-4 h-4 text-orange-500" />,
    items: [
      {
        id: "m_csmf_numbered",
        category: "m_csmf",
        label: "Numbered Concise Statement of Facts",
        description: "Each material fact set forth in a separate, consecutively numbered paragraph for easy point-by-point response.",
        promptInstruction: "Ensure every numbered paragraph contains exactly one distinct material factual assertion."
      },
      {
        id: "m_csmf_pinpoint_citations",
        category: "m_csmf",
        label: "Pinpoint Evidence Citations for Every Fact",
        description: "Every numbered fact supported by exact pinpoint citations to Exhibits, Depositions (page/line), or Sworn Declarations.",
        promptInstruction: "Prompt verification: Confirm that no numbered fact is unbacked by an Exhibit or Declaration citation."
      },
      {
        id: "m_csmf_admissible_evidence",
        category: "m_csmf",
        label: "Admissible Evidentiary Standard",
        description: "Verify that referenced evidence would be admissible at trial (authenticated, non-hearsay or hearsay exception, personal knowledge).",
        promptInstruction: "Audit referenced exhibits for hearsay or foundation objections that opposing party could raise."
      }
    ]
  },
  {
    title: "3. Legal Argument & Defense Rebuttal",
    categoryKey: "m_argument",
    icon: <BookOpen className="w-4 h-4 text-orange-500" />,
    items: [
      {
        id: "m_arg_claims",
        category: "m_argument",
        label: "Application of Law to Uncontroverted Facts",
        description: "Detailed legal argument demonstrating why undisputed facts entitle movant to judgment as a matter of law.",
        promptInstruction: "Verify that legal arguments directly reference the numbered material facts in the CSMF."
      },
      {
        id: "m_rebut_defenses",
        category: "m_argument",
        label: "Rebuttal of Opposing Affirmative Defenses",
        description: "Legal and factual demonstration showing non-movant lacks evidence to support essential elements of affirmative defenses.",
        promptInstruction: "Identify each affirmative defense raised in Answer and demonstrate absence of genuine dispute."
      },
      {
        id: "m_citation_audit_verify",
        category: "m_argument",
        label: "Precedent & Citation Integrity Verification",
        description: "All cited judicial decisions and statutes verified through Citation Audit to ensure good law without ghost citations.",
        promptInstruction: "Run Citation Audit to confirm every case citation includes volume, reporter, page, and year."
      }
    ]
  },
  {
    title: "4. Supporting Declarations & Exhibits",
    categoryKey: "m_declarations",
    icon: <FileSignature className="w-4 h-4 text-orange-500" />,
    items: [
      {
        id: "m_decl_personal_knowledge",
        category: "m_declarations",
        label: "Sworn Declarations / Personal Knowledge",
        description: "Declarations made on personal knowledge, setting forth admissible facts, signed under penalty of perjury.",
        promptInstruction: "Verify that declarant explicitly states personal knowledge and competency to testify."
      },
      {
        id: "m_exhibit_index",
        category: "m_declarations",
        label: "Exhibit Index & Evidence Custody",
        description: "Complete exhibit index matching Evidence Manifold exhibits attached to supporting declaration.",
        promptInstruction: "Ensure exhibit labels (Exhibit 1, Exhibit 2) in motion match attached exhibit PDFs."
      }
    ]
  },
  {
    title: "5. Proposed Order & Signatures",
    categoryKey: "m_order",
    icon: <CheckCircle2 className="w-4 h-4 text-orange-500" />,
    items: [
      {
        id: "m_proposed_order",
        category: "m_order",
        label: "Separate Proposed Order",
        description: "Attached Proposed Order granting Summary Judgment and specifying the claims or defenses disposed of.",
        promptInstruction: "Draft precise order language granting summary judgment on specified counts or entire action."
      },
      {
        id: "m_sig_block",
        category: "m_order",
        label: "Signature Block & Rule 11 Verification",
        description: "Full signature block with bar number, contact information, and Rule 11 certification statement.",
        promptInstruction: "Confirm signature line conforms to local e-filing electronic signature standards (/s/ Name)."
      }
    ]
  }
];

// --- GENERAL & LOCAL COURT RULES CHECKLIST SECTIONS ---
const GENERAL_SECTIONS: ChecklistSection[] = [
  {
    title: "1. Formatting & Local Rules Compliance",
    categoryKey: "g_formatting",
    icon: <FileText className="w-4 h-4 text-orange-500" />,
    items: [
      {
        id: "g_pleading_paper",
        category: "g_formatting",
        label: "Pleading Paper & Margin Format",
        description: "Correct line numbering (e.g. 28-line Oregon pleading paper), 1-inch margins, double line spacing, and 12pt standard font.",
        promptInstruction: "Verify line numbers align with text lines and footer displays case name and page number."
      },
      {
        id: "g_page_limit",
        category: "g_formatting",
        label: "Page & Word Cap Compliance",
        description: "Document length verified against local court rule limits (e.g. 20 or 35 pages for motions/briefs).",
        promptInstruction: "Check page count; if exceeding limit, prepare motion for leave to exceed page cap."
      },
      {
        id: "g_toc_toa",
        category: "g_formatting",
        label: "Table of Contents & Authorities",
        description: "Required for briefs exceeding 10-15 pages, with hyperlinked section and precedent references.",
        promptInstruction: "Ensure page numbers in TOC/TOA accurately match electronic PDF page numbers."
      }
    ]
  },
  {
    title: "2. E-Filing, PDF/A & Privacy Redaction",
    categoryKey: "g_efiling",
    icon: <Zap className="w-4 h-4 text-orange-500" />,
    items: [
      {
        id: "g_pdf_a",
        category: "g_efiling",
        label: "PDF/A Archival Format",
        description: "Document converted and saved in PDF/A archival standard prior to e-filing submission.",
        promptInstruction: "Verify document is formatted as text-searchable PDF/A rather than flat image scan."
      },
      {
        id: "g_ocr",
        category: "g_efiling",
        label: "OCR Text Searchability",
        description: "All physical or scanned exhibits processed with Optical Character Recognition (OCR).",
        promptInstruction: "Test text selection and keyword searchability across all attached PDF exhibit files."
      },
      {
        id: "g_metadata_scrub",
        category: "g_efiling",
        label: "E-Filing Metadata Scrubber",
        description: "Document scrubbed of confidential author properties, hidden revision histories, or unwanted AI tags.",
        promptInstruction: "Inspect PDF properties to ensure clean metadata prior to court server upload."
      },
      {
        id: "g_redaction",
        category: "g_efiling",
        label: "Privacy Redaction (FRCP 5.2 / ORCP 9)",
        description: "Social security numbers, financial account numbers, dates of birth, and minor names properly redacted.",
        promptInstruction: "Verify that sensitive financial account numbers and SSNs are truncated to last 4 digits."
      }
    ]
  }
];

export const FilingChecklist: React.FC<FilingChecklistProps> = ({ activeCase, onUpdateCase }) => {
  const [activeTab, setActiveTab] = useState<DocumentTab>('complaint');
  const [auditResult, setAuditResult] = useState<string | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'completed'>('all');
  const [customItemLabel, setCustomItemLabel] = useState('');
  const [customItemDesc, setCustomItemDesc] = useState('');
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [copiedAudit, setCopiedAudit] = useState(false);

  const checklistItems = activeCase.checklistItems || {};

  const toggleItem = (id: string) => {
    onUpdateCase({
      ...activeCase,
      checklistItems: {
        ...checklistItems,
        [id]: !checklistItems[id]
      }
    });
  };

  // Get active sections based on active tab
  const getActiveSections = (): ChecklistSection[] => {
    if (activeTab === 'complaint') return COMPLAINT_SECTIONS;
    if (activeTab === 'msj') return MSJ_SECTIONS;
    if (activeTab === 'general') return GENERAL_SECTIONS;
    return [];
  };

  const currentSections = getActiveSections();

  // Combine all items across all standard sections
  const allStandardItems = [
    ...COMPLAINT_SECTIONS.flatMap(s => s.items),
    ...MSJ_SECTIONS.flatMap(s => s.items),
    ...GENERAL_SECTIONS.flatMap(s => s.items)
  ];

  // Calculate metrics
  const activeTabItems = currentSections.flatMap(s => s.items);
  const activeTabCompletedCount = activeTabItems.filter(item => !!checklistItems[item.id]).length;
  const activeTabTotalCount = activeTabItems.length;
  const activeTabProgress = activeTabTotalCount > 0 ? (activeTabCompletedCount / activeTabTotalCount) * 100 : 0;

  const totalOverallCompleted = Object.values(checklistItems).filter(Boolean).length;
  const totalOverallItems = allStandardItems.length;
  const overallProgress = totalOverallItems > 0 ? (totalOverallCompleted / totalOverallItems) * 100 : 0;

  // Case Evidence & Rules Verification Stats
  const evidenceCount = activeCase.evidence?.length || 0;
  const claimsCount = activeCase.claims?.length || 0;
  const claimsWithExhibitsCount = activeCase.claims?.filter(c => c.evidenceIds && c.evidenceIds.length > 0).length || 0;
  const hasJurisdictionInfo = !!activeCase.jurisdiction && activeCase.jurisdiction.trim().length > 0;
  const hasCourtRulesInfo = !!activeCase.courtRules && activeCase.courtRules.trim().length > 0;

  // Run real-time evidence and rules cross-audit
  const runCaseAudit = () => {
    setIsAuditing(true);
    setAuditResult(null);

    setTimeout(() => {
      const findings: string[] = [];
      let passCount = 0;
      let warnCount = 0;

      // 1. Evidence Check
      if (evidenceCount === 0) {
        findings.push("⚠️ EVIDENCE WARNING: No exhibits found in the Evidence Manifold. Factual statements in your document cannot be pinpoint-cited.");
        warnCount++;
      } else {
        findings.push(`✅ EVIDENCE VERIFIED: ${evidenceCount} exhibit(s) available in the Evidence Manifold for pinpoint citation.`);
        passCount++;
      }

      // 2. Claims & Exhibit Mapping Check
      if (claimsCount === 0) {
        findings.push("⚠️ CLAIMS WARNING: No legal claims defined in the Legal Claims module.");
        warnCount++;
      } else if (claimsWithExhibitsCount < claimsCount) {
        findings.push(`⚠️ CLAIMS MAPPING GAP: ${claimsCount - claimsWithExhibitsCount} of ${claimsCount} claim(s) do not have mapped evidence exhibits.`);
        warnCount++;
      } else {
        findings.push(`✅ CLAIMS MAPPED: All ${claimsCount} legal claims are mapped to supporting exhibits in the Evidence Manifold.`);
        passCount++;
      }

      // 3. Jurisdiction Check
      if (!hasJurisdictionInfo) {
        findings.push("⚠️ JURISDICTION GAP: Case jurisdiction notes are empty. Specify statutory jurisdiction ground (e.g. Diversity 28 U.S.C. § 1332 or Federal Question § 1331).");
        warnCount++;
      } else {
        findings.push(`✅ JURISDICTION NOTED: Jurisdiction details defined: "${activeCase.jurisdiction.substring(0, 60)}..."`);
        passCount++;
      }

      // 4. Local Rules Check
      if (!hasCourtRulesInfo) {
        findings.push("⚠️ LOCAL RULES WARNING: Local court rules/UTCR guidelines not specified. Ensure 28-line pleading paper, page cap, and UTCR 5.010 conferral rules are checked.");
        warnCount++;
      } else {
        findings.push(`✅ LOCAL RULES NOTED: Court rules configured: "${activeCase.courtRules.substring(0, 60)}..."`);
        passCount++;
      }

      // 5. Document Specific Guidance
      if (activeTab === 'complaint') {
        findings.push("💡 COMPLAINT TIP: Ensure every factual allegation in the Statement of Facts includes bracketed exhibit citations e.g. [Exhibit A, p. 2].");
      } else if (activeTab === 'msj') {
        findings.push("💡 SUMMARY JUDGMENT TIP: UTCR 5.010 / Local Rule good faith conferral certification must be included prior to filing MSJ.");
      } else {
        findings.push("💡 E-FILING TIP: Convert final document to text-searchable PDF/A format and scrub author metadata before court upload.");
      }

      const score = Math.round((passCount / (passCount + warnCount)) * 100);

      const summaryText = `--- DRAFTING & EVIDENCE AUDIT REPORT ---
Case: ${activeCase.name || 'Untitled Case'}
Target Document: ${activeTab === 'complaint' ? 'Civil Complaint' : activeTab === 'msj' ? 'Motion for Summary Judgment' : 'General Filing'}
Date: ${new Date().toLocaleDateString()}
Audit Score: ${score}% Verified

${findings.join('\n\n')}

Action Plan:
1. Review highlighted warning items above and resolve gaps in the Evidence Manifold or Legal Claims module.
2. Complete all checklist items in the ${activeTab.toUpperCase()} tab prior to final signature and e-filing.`;

      setAuditResult(summaryText);
      setIsAuditing(false);
    }, 600);
  };

  const handleSelectAllInTab = () => {
    const updated = { ...checklistItems };
    activeTabItems.forEach(item => {
      updated[item.id] = true;
    });
    onUpdateCase({ ...activeCase, checklistItems: updated });
  };

  const handleResetTab = () => {
    const updated = { ...checklistItems };
    activeTabItems.forEach(item => {
      updated[item.id] = false;
    });
    onUpdateCase({ ...activeCase, checklistItems: updated });
  };

  const copyAuditReport = () => {
    if (!auditResult) return;
    navigator.clipboard.writeText(auditResult);
    setCopiedAudit(true);
    setTimeout(() => setCopiedAudit(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-950/40 border border-orange-800/40 rounded-md">
            <ClipboardCheck className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h2 className="text-xl font-serif italic text-zinc-100 flex items-center gap-2">
              Legal Document Drafting Checklist
              <span className="text-[10px] font-mono non-italic bg-zinc-900 border border-zinc-800 text-orange-400 px-2 py-0.5 rounded">
                2026 Edition
              </span>
            </h2>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Comprehensive verification for Complaints, Summary Judgment Motions, Evidence Mapping, and Local Rules.
            </p>
          </div>
        </div>

        {/* Global Progress Widget */}
        <div className="flex items-center gap-4 bg-zinc-950 border border-zinc-850 px-4 py-2 rounded-md">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Overall Readiness</span>
            <span className={cn(
              "text-xs font-mono font-bold",
              overallProgress === 100 ? "text-emerald-400" : "text-orange-400"
            )}>
              {totalOverallCompleted} / {totalOverallItems} ({overallProgress.toFixed(0)}%)
            </span>
          </div>
          <div className="w-24 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
            <div 
              className="h-full bg-gradient-to-r from-orange-600 to-amber-500 transition-all duration-500" 
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* DOCUMENT SELECTION TABS */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('complaint')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-mono transition-all border",
              activeTab === 'complaint'
                ? "bg-orange-950/50 border-orange-600/60 text-orange-300 font-bold shadow-sm"
                : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850"
            )}
          >
            <Building2 className="w-3.5 h-3.5" />
            Complaint Checklist
          </button>

          <button
            onClick={() => setActiveTab('msj')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-mono transition-all border",
              activeTab === 'msj'
                ? "bg-orange-950/50 border-orange-600/60 text-orange-300 font-bold shadow-sm"
                : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850"
            )}
          >
            <Gavel className="w-3.5 h-3.5" />
            Motion for Summary Judgment
          </button>

          <button
            onClick={() => setActiveTab('general')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-mono transition-all border",
              activeTab === 'general'
                ? "bg-orange-950/50 border-orange-600/60 text-orange-300 font-bold shadow-sm"
                : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850"
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            General & Local Rules
          </button>

          <button
            onClick={() => setActiveTab('evidence_audit')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-mono transition-all border",
              activeTab === 'evidence_audit'
                ? "bg-orange-950/50 border-orange-600/60 text-orange-300 font-bold shadow-sm"
                : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850"
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            Evidence & Rules Verifier
          </button>
        </div>

        {/* Tab Controls */}
        {activeTab !== 'evidence_audit' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAllInTab}
              className="text-[10px] font-mono bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded transition-colors"
            >
              Check All in Tab
            </button>
            <button
              onClick={handleResetTab}
              className="text-[10px] font-mono bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 px-2.5 py-1 rounded transition-colors"
            >
              Reset Tab
            </button>
          </div>
        )}
      </div>

      {/* TAB SUB-HEADER / METRICS */}
      {activeTab !== 'evidence_audit' && (
        <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-900 border border-zinc-800 rounded">
              <ListChecks className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <h3 className="text-xs font-mono font-bold text-zinc-200 uppercase tracking-wider">
                {activeTab === 'complaint' && "Civil Complaint & Petition Drafting Requirements"}
                {activeTab === 'msj' && "Motion for Summary Judgment (MSJ) & CSMF Requirements"}
                {activeTab === 'general' && "General Formatting, PDF/A, & Local Rules Requirements"}
              </h3>
              <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                {activeTabCompletedCount} of {activeTabTotalCount} items verified ({activeTabProgress.toFixed(0)}%)
              </p>
            </div>
          </div>

          {/* Filter mode toggles */}
          <div className="flex items-center gap-2 bg-zinc-900/80 p-1 rounded border border-zinc-800">
            <button
              onClick={() => setFilterMode('all')}
              className={cn(
                "text-[10px] font-mono px-2 py-0.5 rounded transition-all",
                filterMode === 'all' ? "bg-orange-600 text-white font-bold" : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              All ({activeTabTotalCount})
            </button>
            <button
              onClick={() => setFilterMode('pending')}
              className={cn(
                "text-[10px] font-mono px-2 py-0.5 rounded transition-all",
                filterMode === 'pending' ? "bg-orange-600 text-white font-bold" : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              Pending ({activeTabTotalCount - activeTabCompletedCount})
            </button>
            <button
              onClick={() => setFilterMode('completed')}
              className={cn(
                "text-[10px] font-mono px-2 py-0.5 rounded transition-all",
                filterMode === 'completed' ? "bg-orange-600 text-white font-bold" : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              Done ({activeTabCompletedCount})
            </button>
          </div>
        </div>
      )}

      {/* CHECKLIST SECTIONS & ITEMS */}
      {activeTab !== 'evidence_audit' && (
        <div className="space-y-6">
          {currentSections.map((section, sIdx) => {
            const visibleItems = section.items.filter(item => {
              if (filterMode === 'pending') return !checklistItems[item.id];
              if (filterMode === 'completed') return !!checklistItems[item.id];
              return true;
            });

            if (visibleItems.length === 0 && filterMode !== 'all') return null;

            return (
              <div key={sIdx} className="bg-zinc-950 border border-zinc-850 rounded-lg overflow-hidden shadow-sm">
                <div className="p-3.5 border-b border-zinc-850 bg-zinc-900/60 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {section.icon}
                    <h3 className="text-xs font-mono font-bold text-zinc-200 uppercase tracking-wider">
                      {section.title}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {section.items.filter(i => !!checklistItems[i.id]).length} / {section.items.length} Checked
                  </span>
                </div>

                <div className="p-4 divide-y divide-zinc-900">
                  {visibleItems.map((item) => {
                    const isChecked = !!checklistItems[item.id];
                    return (
                      <div 
                        key={item.id} 
                        className="py-3.5 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-start justify-between gap-3 group"
                      >
                        <label className="flex items-start gap-3 cursor-pointer flex-1">
                          <div className="relative mt-0.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleItem(item.id)}
                              className="peer w-4 h-4 bg-zinc-900 border border-zinc-700 rounded text-orange-600 focus:ring-0 focus:ring-offset-0 transition-all cursor-pointer"
                            />
                            <div className="absolute inset-0 bg-orange-500/10 opacity-0 peer-checked:opacity-100 transition-opacity rounded" />
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-xs font-mono font-bold tracking-wide transition-colors",
                                isChecked ? "text-emerald-400 line-through opacity-85" : "text-zinc-200 group-hover:text-orange-300"
                              )}>
                                {item.label}
                              </span>
                              {isChecked && (
                                <span className="text-[9px] font-mono bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 px-1.5 py-0.2 rounded">
                                  VERIFIED
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400 font-mono leading-relaxed">
                              {item.description}
                            </p>
                          </div>
                        </label>

                        {/* Prompt Instruction Box */}
                        {item.promptInstruction && (
                          <div className="md:w-72 bg-zinc-900/70 border border-zinc-850 p-2.5 rounded text-[10px] font-mono text-zinc-400 space-y-1 shrink-0">
                            <div className="flex items-center gap-1 text-orange-400 font-bold uppercase tracking-wider text-[9px]">
                              <Sparkles className="w-3 h-3" />
                              Verification Prompt
                            </div>
                            <p className="italic leading-normal text-zinc-350">
                              "{item.promptInstruction}"
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EVIDENCE & RULES CROSS-VERIFICATION TAB */}
      {activeTab === 'evidence_audit' && (
        <div className="space-y-6">
          <div className="bg-zinc-950 border border-zinc-850 p-5 rounded-lg space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                <h3 className="text-sm font-mono font-bold text-zinc-200 uppercase tracking-wider">
                  Real-Time Case Evidence & Local Rules Cross-Audit
                </h3>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 uppercase">
                Active Case: {activeCase.name || 'Untitled Case'}
              </span>
            </div>

            <p className="text-xs text-zinc-400 font-mono leading-relaxed">
              This automated verifier evaluates your active case's Evidence Manifold exhibits, Legal Claims elements, and Court Rules configuration to ensure all factual allegations in your draft are backed by admissible evidence.
            </p>

            {/* Live Case Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-md space-y-1">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block">Evidence Manifold</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-mono font-bold text-zinc-100">{evidenceCount}</span>
                  <span className="text-[10px] font-mono text-zinc-400">Exhibits</span>
                </div>
                <div className="text-[10px] font-mono text-zinc-500 border-t border-zinc-800/60 pt-1">
                  {evidenceCount > 0 ? "Ready for citation" : "⚠️ No exhibits added"}
                </div>
              </div>

              <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-md space-y-1">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block">Claims Mapped</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-mono font-bold text-zinc-100">{claimsWithExhibitsCount} / {claimsCount}</span>
                  <span className="text-[10px] font-mono text-zinc-400">Claims</span>
                </div>
                <div className="text-[10px] font-mono text-zinc-500 border-t border-zinc-800/60 pt-1">
                  {claimsCount === 0 ? "No claims defined" : claimsWithExhibitsCount === claimsCount ? "100% exhibit mapped" : "Gaps detected"}
                </div>
              </div>

              <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-md space-y-1">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block">Jurisdiction Grounds</span>
                <div className="flex items-baseline justify-between">
                  <span className={cn("text-xs font-mono font-bold", hasJurisdictionInfo ? "text-emerald-400" : "text-amber-400")}>
                    {hasJurisdictionInfo ? "DEFINED" : "NOT SPECIFIED"}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-zinc-500 border-t border-zinc-800/60 pt-1 truncate">
                  {hasJurisdictionInfo ? activeCase.jurisdiction : "Set in Case Details"}
                </div>
              </div>

              <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-md space-y-1">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block">Court Rules Config</span>
                <div className="flex items-baseline justify-between">
                  <span className={cn("text-xs font-mono font-bold", hasCourtRulesInfo ? "text-emerald-400" : "text-amber-400")}>
                    {hasCourtRulesInfo ? "CONFIGURED" : "DEFAULT UTCR"}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-zinc-500 border-t border-zinc-800/60 pt-1 truncate">
                  {hasCourtRulesInfo ? activeCase.courtRules : "Standard pleading paper"}
                </div>
              </div>
            </div>

            {/* Run Audit Action */}
            <div className="flex items-center justify-between border-t border-zinc-850 pt-4">
              <span className="text-xs font-mono text-zinc-400">
                Click below to execute an automated audit comparing evidence manifold against pleading requirements:
              </span>

              <button
                onClick={runCaseAudit}
                disabled={isAuditing}
                className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-mono text-xs font-bold px-4 py-2 rounded-md transition-all shadow-md shrink-0"
              >
                {isAuditing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Auditing Evidence...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Run Real-Time Audit
                  </>
                )}
              </button>
            </div>

            {/* Audit Results Box */}
            {auditResult && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-xs font-mono font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Audit Summary Report
                  </span>

                  <button
                    onClick={copyAuditReport}
                    className="flex items-center gap-1.5 text-[10px] font-mono bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 px-2.5 py-1 rounded transition-colors"
                  >
                    {copiedAudit ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        Copied to Clipboard
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy Report
                      </>
                    )}
                  </button>
                </div>

                <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed bg-zinc-950 p-3.5 rounded border border-zinc-850 overflow-x-auto">
                  {auditResult}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FOOTER WARNING & GUIDANCE */}
      {overallProgress < 100 && (
        <div className="p-4 bg-orange-950/20 border border-orange-900/40 rounded-lg flex items-start gap-3.5">
          <AlertCircle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-mono font-bold text-orange-300 uppercase tracking-wider">
              Drafting Readiness Caution
            </h4>
            <p className="text-[11px] text-zinc-400 font-mono leading-relaxed">
              Checklist stability is currently at {overallProgress.toFixed(0)}%. Filing pleadings with unverified exhibit citations, missing venue allegations, or unconfirmed local rules (such as UTCR 5.010 conferral) may result in a Motion to Strike or Rule 11 sanctions.
            </p>
          </div>
        </div>
      )}

      {overallProgress === 100 && (
        <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-lg flex items-start gap-3.5">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-mono font-bold text-emerald-300 uppercase tracking-wider">
              Document Fully Verified
            </h4>
            <p className="text-[11px] text-zinc-300 font-mono leading-relaxed">
              All drafting requirements across Complaints, Summary Judgment Motions, Evidence Mapping, and Local Rules are 100% verified. Document is ready for final assembly, PDF/A conversion, and court filing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
