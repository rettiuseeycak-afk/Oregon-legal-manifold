export type EvidenceId = string;
export type CaseId = string;

export interface EvidenceRecord {
  id: EvidenceId;
  caseId: CaseId;
  title: string;
  date: string; // ISO
  category: string;
  summary: string;
  tags: string[];
  hash: string;
  createdAt: string;
  createdBy: string;
}

export interface ChainOfCustodyEvent {
  id: string;
  evidenceId: EvidenceId;
  caseId: CaseId;
  type:
    | 'UPLOAD'
    | 'AI_ANALYSIS'
    | 'EDIT_METADATA'
    | 'EXPORT'
    | 'TAG_UPDATE'
    | 'DELETE_REQUEST';
  actor: 'USER' | 'SYSTEM' | 'AI';
  actorId?: string;
  timestamp: string;
  details: Record<string, any>;
}

export interface CaseBrain {
  caseId: CaseId;
  parties: string[];
  claims: string[];
  defenses: string[];
  keyFacts: string[];
  proceduralPosture: string;
  deadlines: { label: string; dueDate: string; ruleRef?: string }[];
  strategyNotes: string[];
  updatedAt: string;
}
