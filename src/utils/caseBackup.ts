import { Case, Evidence, LegalClaim } from '../types';
import { evaluateAllCaseLimitations } from '../lib/statuteOfLimitationsService';

export interface TimelineBackupEvent {
  sequenceIndex: number;
  date: string;
  title: string;
  type: string;
  source: 'evidence_exhibit' | 'claim_cause_of_action' | 'chronology_point';
  sourceId: string;
  summary: string;
  assignedTags?: string[];
  associatedClaims?: {
    claimId: string;
    claimTitle: string;
    orsCitation?: string;
  }[];
  associatedEvidenceId?: string;
}

export interface StructuredCaseBackup {
  schema: 'oregon-legal-manifold-case-backup';
  backupVersion: '1.2.0';
  exportedAt: string;
  caseMetadata: {
    id: string;
    name: string;
    jurisdiction: string;
    courtRules: string;
    isFinalized: boolean;
    updatedAt?: string;
    notes?: string;
    executiveSummary?: string;
    executiveSummaryGeneratedAt?: string;
  };
  summaryStatistics: {
    totalEvidenceCount: number;
    totalClaimsCount: number;
    totalTimelineEventsCount: number;
    earliestTimelineDate: string | null;
    latestTimelineDate: string | null;
    statuteOfLimitations: {
      expiredCount: number;
      criticalCount: number;
      warningCount: number;
      safeCount: number;
      missingDateCount: number;
      totalMonitored: number;
    };
  };
  evidence: Evidence[];
  claims: (LegalClaim & {
    linkedEvidenceTitles?: string[];
  })[];
  timeline: TimelineBackupEvent[];
  timelineAnalysis?: string;
  generatedDocuments?: {
    complaint?: string;
    motion?: string;
    toa?: string;
    toc?: string;
    corporateDisclosureStatement?: string;
    notice?: string;
    checklist?: string;
    [key: string]: string | undefined;
  };
}

/**
 * Builds the complete structured case backup object containing evidence, claims, and timeline.
 */
export function generateStructuredCaseBackup(activeCase: Case): StructuredCaseBackup {
  const evidenceMap = new Map<string, Evidence>();
  (activeCase.evidence || []).forEach((ev) => {
    evidenceMap.set(ev.id, ev);
  });

  // 1. Build enriched claims with associated evidence titles
  const enrichedClaims = (activeCase.claims || []).map((claim) => {
    const linkedEvidenceTitles = (claim.evidenceIds || [])
      .map((id) => evidenceMap.get(id)?.title)
      .filter((title): title is string => Boolean(title));

    return {
      ...claim,
      linkedEvidenceTitles
    };
  });

  // 2. Build structured chronological timeline from evidence dates & claim dates
  const rawEvents: Array<{
    dateStr: string;
    timestamp: number;
    title: string;
    type: string;
    source: 'evidence_exhibit' | 'claim_cause_of_action' | 'chronology_point';
    sourceId: string;
    summary: string;
    assignedTags?: string[];
    associatedEvidenceId?: string;
    claimRef?: {
      claimId: string;
      claimTitle: string;
      orsCitation?: string;
    };
  }> = [];

  // Ingest dates from evidence items
  (activeCase.evidence || []).forEach((e) => {
    if (e.date && e.date.trim()) {
      const parsed = new Date(e.date);
      const validTime = !isNaN(parsed.getTime()) ? parsed.getTime() : 0;
      
      // Find any claims that reference this evidence
      const matchingClaims = (activeCase.claims || []).filter((c) => 
        (c.evidenceIds || []).includes(e.id)
      );

      rawEvents.push({
        dateStr: e.date,
        timestamp: validTime,
        title: e.title,
        type: e.type || 'exhibit',
        source: 'evidence_exhibit',
        sourceId: e.id,
        summary: e.summary || (e.content ? e.content.substring(0, 300) : 'No summary provided.'),
        assignedTags: e.tags || [],
        associatedEvidenceId: e.id,
        claimRef: matchingClaims.length > 0 ? {
          claimId: matchingClaims[0].id,
          claimTitle: matchingClaims[0].title,
          orsCitation: matchingClaims[0].orsCitation
        } : undefined
      });
    }
  });

  // Ingest cause of action dates from claims if not already redundant
  (activeCase.claims || []).forEach((c) => {
    if (c.causeOfActionDate && c.causeOfActionDate.trim()) {
      const parsed = new Date(c.causeOfActionDate);
      const validTime = !isNaN(parsed.getTime()) ? parsed.getTime() : 0;

      rawEvents.push({
        dateStr: c.causeOfActionDate,
        timestamp: validTime,
        title: `Accrual of Cause of Action: ${c.title}`,
        type: 'cause_of_action',
        source: 'claim_cause_of_action',
        sourceId: c.id,
        summary: `Statutory clock commenced for claim "${c.title}". Statutory citation: ${c.orsCitation || 'Unspecified ORS'}.`,
        assignedTags: ['Statute of Limitations', 'Accrual Date'],
        claimRef: {
          claimId: c.id,
          claimTitle: c.title,
          orsCitation: c.orsCitation
        }
      });
    }
  });

  // Sort chronological order (oldest to newest)
  rawEvents.sort((a, b) => {
    if (a.timestamp !== b.timestamp) {
      return a.timestamp - b.timestamp;
    }
    return a.dateStr.localeCompare(b.dateStr);
  });

  // Assign sequence indexes and organize associated claims
  const timeline: TimelineBackupEvent[] = rawEvents.map((ev, idx) => {
    // Find all claims citing this evidence
    const associatedClaims: { claimId: string; claimTitle: string; orsCitation?: string }[] = [];
    if (ev.claimRef) {
      associatedClaims.push(ev.claimRef);
    }
    if (ev.associatedEvidenceId) {
      (activeCase.claims || []).forEach((c) => {
        if ((c.evidenceIds || []).includes(ev.associatedEvidenceId!) && !associatedClaims.some(ac => ac.claimId === c.id)) {
          associatedClaims.push({
            claimId: c.id,
            claimTitle: c.title,
            orsCitation: c.orsCitation
          });
        }
      });
    }

    return {
      sequenceIndex: idx + 1,
      date: ev.dateStr,
      title: ev.title,
      type: ev.type,
      source: ev.source,
      sourceId: ev.sourceId,
      summary: ev.summary,
      assignedTags: ev.assignedTags,
      associatedClaims: associatedClaims.length > 0 ? associatedClaims : undefined,
      associatedEvidenceId: ev.associatedEvidenceId
    };
  });

  // 3. Limitations audit snapshot
  const limitationsSummary = evaluateAllCaseLimitations(activeCase);

  const datesWithValidTimes = timeline.filter(t => t.date);
  const earliestTimelineDate = datesWithValidTimes.length > 0 ? datesWithValidTimes[0].date : null;
  const latestTimelineDate = datesWithValidTimes.length > 0 ? datesWithValidTimes[datesWithValidTimes.length - 1].date : null;

  return {
    schema: 'oregon-legal-manifold-case-backup',
    backupVersion: '1.2.0',
    exportedAt: new Date().toISOString(),
    caseMetadata: {
      id: activeCase.id,
      name: activeCase.name || 'Untitled Case',
      jurisdiction: activeCase.jurisdiction || 'Multnomah County Circuit Court',
      courtRules: activeCase.courtRules || 'Oregon Uniform Trial Court Rules / ORCP',
      isFinalized: Boolean(activeCase.isFinalized),
      updatedAt: activeCase.updatedAt || new Date().toISOString(),
      notes: activeCase.notes,
      executiveSummary: activeCase.executiveSummary,
      executiveSummaryGeneratedAt: activeCase.executiveSummaryGeneratedAt
    },
    summaryStatistics: {
      totalEvidenceCount: (activeCase.evidence || []).length,
      totalClaimsCount: (activeCase.claims || []).length,
      totalTimelineEventsCount: timeline.length,
      earliestTimelineDate,
      latestTimelineDate,
      statuteOfLimitations: {
        expiredCount: limitationsSummary.expiredCount,
        criticalCount: limitationsSummary.criticalCount,
        warningCount: limitationsSummary.warningCount,
        safeCount: limitationsSummary.safeCount,
        missingDateCount: limitationsSummary.missingDateCount,
        totalMonitored: limitationsSummary.totalClaimsCount
      }
    },
    evidence: activeCase.evidence || [],
    claims: enrichedClaims,
    timeline,
    timelineAnalysis: activeCase.timelineAnalysis,
    generatedDocuments: activeCase.generatedDocs || {}
  };
}

/**
 * Returns formatted JSON string of the complete structured case backup.
 */
export function getStructuredCaseBackupJsonString(activeCase: Case, indent: number = 2): string {
  const backupObj = generateStructuredCaseBackup(activeCase);
  return JSON.stringify(backupObj, null, indent);
}

/**
 * Initiates direct browser file download of the structured JSON backup file.
 */
export function downloadCaseBackupJson(activeCase: Case): { fileName: string; sizeFormatted: string; totalEvents: number } {
  const backupObj = generateStructuredCaseBackup(activeCase);
  const jsonStr = JSON.stringify(backupObj, null, 2);

  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const safeName = (activeCase.name || 'case')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_+|_+$)/g, '');
  const timestamp = new Date().toISOString().slice(0, 10);
  const fileName = `case_backup_${safeName || 'manifold'}_${activeCase.id || 'case'}_${timestamp}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Release object URL after a brief delay
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);

  // Format file size in KB/MB
  const bytes = blob.size;
  let sizeFormatted = `${bytes} B`;
  if (bytes > 1024 * 1024) {
    sizeFormatted = `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } else if (bytes > 1024) {
    sizeFormatted = `${(bytes / 1024).toFixed(1)} KB`;
  }

  return {
    fileName,
    sizeFormatted,
    totalEvents: backupObj.timeline.length
  };
}
