import React, { useState } from 'react';
import { Case } from '../types';
import { 
  Shield, 
  AlertCircle, 
  CheckCircle2, 
  Circle, 
  FileText, 
  Send, 
  Users, 
  Clock, 
  ChevronRight,
  ChevronDown,
  Info,
  Loader2,
  Activity,
  MapPin,
  Network,
  Code,
  Braces,
  GitBranch
} from 'lucide-react';
import { cn } from '../lib/utils';
import { generateContentProxy } from '../lib/geminiClient';
import ReactMarkdown from 'react-markdown';

interface DurableGuardianshipEngineProps {
  activeCase: Case;
  onUpdateCase: (updatedCase: Case) => void;
}

export const DurableGuardianshipEngine: React.FC<DurableGuardianshipEngineProps> = ({ activeCase, onUpdateCase }) => {
  const [expandedPhase, setExpandedPhase] = useState<number>(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [showOntology, setShowOntology] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const [showDecisionTree, setShowDecisionTree] = useState(false);

  const phases = [
    {
      id: 1,
      title: "Phase 1: Material Change in Circumstances",
      description: "Gather evidence of stability, safety, and reunification progress.",
      icon: Activity,
    },
    {
      id: 2,
      title: "Phase 2: Document Preparation",
      description: "Draft Motion to Vacate, Motion to Terminate Wardship, and Declarations.",
      icon: FileText,
    },
    {
      id: 3,
      title: "Phase 3: Mandatory Service",
      description: "Serve all required parties including DHS, AAG, and attorneys.",
      icon: Send,
    },
    {
      id: 4,
      title: "Phase 4: Agency Reports & Hearing",
      description: "Review DHS/CASA reports and prepare for Juvenile Court hearing.",
      icon: Users,
    }
  ];

  const analyzeGuardianship = async () => {
    setIsAnalyzing(true);
    
    const prompt = `
      Analyze this Oregon Juvenile Dependency case (ORS 419B) regarding a Durable Guardianship:
      Name: ${activeCase.name}
      Jurisdiction: ${activeCase.jurisdiction || 'Baker County Juvenile Court'}
      Claims: ${activeCase.claims.map(c => c.title).join(', ')}
      Evidence: ${activeCase.evidence.map(e => e.title + ' - ' + e.summary).join(', ')}
      
      ONTOLOGY (Use this structure for reasoning):
      Node: DurableGuardianship_OR
        - statute: ORS 419B
        - type: juvenile_dependency
        - county: Baker
        - effects: does_not_terminate_parental_rights

      Node: Court_BakerCounty_Juvenile
        - authority: [create_guardianship, modify_guardianship, terminate_guardianship, terminate_wardship]
        - requires: [material_change, best_interest]

      Node: Parent
        - retains_rights: [visitation, request_modification, request_termination]
        - must_show: [material_change, child_best_interest]
        - evidence_domains: [safety, stability, parenting, support]

      Node: Guardian
        - must_be: [fit, willing, able]
        - receives_authority: [day_to_day_decisions, medical, educational, placement]

      Node: Child
        - considerations: [safety, attachment, needs, stability]

      Node: Wardship
        - status: [active, terminated]
        - basis: [jurisdictional_findings, safety_threats]

      Node: Evidence
        - safety: [no_current_threats, no_DV, no_substance_use]
        - stability: [housing, employment, transportation, childcare]
        - parenting: [successful_visits, bond, meeting_needs]
        - support: [letters, certificates, treatment_completion]

      Relationships:
        Parent --has_child--> Child
        Court_BakerCounty_Juvenile --establishes--> DurableGuardianship_OR
        DurableGuardianship_OR --grants_authority_to--> Guardian
        DurableGuardianship_OR --affects_rights_of--> Parent
        Parent --files--> Motion_Terminate_Guardianship
        Court_BakerCounty_Juvenile --decides--> Motion_Terminate_Guardianship
        Evidence --supports_or_refutes--> [material_change, best_interest]

      RULES (Apply these strict logical conditions):
      RULE: create_durable_guardianship
      IF child_cannot_safely_return_home_now = true AND adoption_not_appropriate = true AND guardianship_in_best_interest = true AND guardian_fit_willing_able = true THEN action = "create_guardianship"

      RULE: parent_may_seek_termination
      IF guardianship_status = "active" THEN parent_rights += ["file_motion_to_terminate"]

      RULE: material_change_met
      IF safety_threats_resolved = true AND housing_stable = true AND income_stable = true AND visits_successful = true THEN material_change = true

      RULE: best_interest_met
      IF child_safe_with_parent = true AND parent_capacity_adequate = true AND transition_plan_reasonable = true THEN best_interest = true

      RULE: terminate_guardianship
      IF material_change = true AND best_interest = true THEN recommendation = "terminate_guardianship"

      RULE: terminate_wardship
      IF wardship_status = "active" AND conditions_leading_to_wardship_resolved = true AND court_oversight_no_longer_needed = true THEN recommendation += "terminate_wardship"

      DECISION TREE (Follow this evaluation flow):
      START
        |
        v
      Is there an active durable guardianship?
        |-- NO --> "No guardianship to terminate." END
        |-- YES
              |
              v
      Has the parent filed a motion to terminate?
        |-- NO --> "No termination request pending." END
        |-- YES
              |
              v
      Is there evidence of MATERIAL CHANGE?
        |-- NO --> "Material change not established." END
        |-- YES
              |
              v
      Is termination in the CHILD'S BEST INTEREST?
        |-- NO --> "Best interest standard not met." END
        |-- YES
              |
              v
      Is wardship still active?
        |-- NO --> "Guardianship termination supported." END
        |-- YES
              |
              v
      Are wardship conditions resolved?
        |-- NO --> "Wardship termination not supported." END
        |-- YES --> "Guardianship + wardship termination supported." END

      JSON SCHEMA (Structure your internal reasoning using this model):
      {
        "type": "object",
        "title": "DurableGuardianshipCase_OR_Baker",
        "properties": {
          "caseId": { "type": "string" },
          "county": { "type": "string", "enum": ["Baker"] },
          "courtType": { "type": "string", "enum": ["Juvenile"] },
          "statute": { "type": "string", "enum": ["ORS 419B"] },
          "child": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "dob": { "type": "string", "format": "date" },
              "attachments": { "type": "array", "items": { "type": "string" } },
              "specialNeeds": { "type": "string" }
            }
          },
          "parent": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "rightsRetained": { "type": "array", "items": { "type": "string" } },
              "currentStatus": {
                "type": "object",
                "properties": {
                  "housing": { "type": "string" },
                  "employment": { "type": "string" },
                  "substanceUseStatus": { "type": "string" },
                  "criminalJusticeStatus": { "type": "string" }
                }
              }
            }
          },
          "guardian": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "relationshipToChild": { "type": "string" },
              "fitWillingAble": { "type": "boolean" }
            }
          },
          "wardship": {
            "type": "object",
            "properties": {
              "status": { "type": "string", "enum": ["active", "terminated"] },
              "basisFindings": { "type": "array", "items": { "type": "string" } }
            }
          },
          "guardianship": {
            "type": "object",
            "properties": {
              "status": { "type": "string", "enum": ["none", "active", "terminated"] },
              "startDate": { "type": "string", "format": "date" },
              "terminationDate": { "type": "string", "format": "date" },
              "orders": { "type": "array", "items": { "type": "string" } }
            }
          },
          "evidence": {
            "type": "object",
            "properties": {
              "safety": { "type": "array", "items": { "type": "string" } },
              "stability": { "type": "array", "items": { "type": "string" } },
              "parenting": { "type": "array", "items": { "type": "string" } },
              "support": { "type": "array", "items": { "type": "string" } }
            }
          },
          "motions": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "type": {
                  "type": "string",
                  "enum": [
                    "Motion_Terminate_Guardianship",
                    "Motion_Terminate_Wardship",
                    "Motion_Modify_Guardianship"
                  ]
                },
                "filedBy": { "type": "string" },
                "filedDate": { "type": "string", "format": "date" },
                "hearingDate": { "type": "string", "format": "date" },
                "outcome": { "type": "string" }
              }
            }
          }
        }
      }

      CRITICAL LEGAL STANDARDS (ORS 419B, NOT ORS 125):
      1. Durable Guardianship is long-term but NOT permanent. It does NOT terminate parental rights.
      2. To terminate, the parent must show:
         a) A material change in circumstances (e.g., completed treatment, stable housing/income, no safety threats).
         b) Termination is in the child's best interest (weighing safety, stability, attachment, parent capacity).
      3. If terminating wardship, must show conditions leading to wardship no longer exist.
      
      You are analyzing Oregon juvenile dependency records from Baker County involving a DURABLE GUARDIANSHIP under ORS 419B.

      TASK:
      1. Identify:
         - Whether a durable guardianship exists
         - Current status of wardship
         - Parent rights retained
         - Guardian’s authority

      2. Extract:
         - All judgments (jurisdictional, dispositional, permanency, guardianship)
         - All motions related to termination or modification
         - Dates, case numbers, and parties

      3. Evaluate:
         - Evidence of material change in circumstances
         - Evidence related to child’s best interests
         - Any procedural defects (missing signatures, missing service, conflicting orders)

      OUTPUT FORMAT (JSON):
      {
        "caseSummary": { "type": "object", "description": "Summary of the case" },
        "currentStatuses": {
          "wardship": "...",
          "guardianship": "..."
        },
        "parentPosition": {
          "requestedRelief": "...",
          "evidenceMaterialChange": [ "...", "..." ],
          "evidenceBestInterest": [ "...", "..." ]
        },
        "proceduralIssues": [ "...", "..." ],
        "notesForAttorneyReview": [ "...", "..." ]
      }

      Do not give legal advice or predict outcomes.
      Ensure the output is valid JSON wrapped in a markdown code block (\`\`\`json ... \`\`\`).
    `;

    try {
      const response = await generateContentProxy({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
      });
      setAnalysis(response.text || "No analysis generated.");
    } catch (err) {
      console.error(err);
      setAnalysis("Error generating analysis. Please check your API key and connection.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-900/20 rounded-full">
            <Shield className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h2 className="text-xl font-serif italic text-zinc-100">Durable Guardianship Engine</h2>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">ORS 419B Juvenile Dependency Logic</p>
          </div>
        </div>
        <button
          onClick={analyzeGuardianship}
          disabled={isAnalyzing}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-mono text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
        >
          {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
          Analyze Material Change
        </button>
      </div>

      {/* AI Analysis Results */}
      {analysis && (
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-sm prose prose-invert prose-zinc max-w-none prose-sm">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-800">
            <Shield className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-300 m-0">ORS 419B Analysis Report</h3>
          </div>
          <ReactMarkdown>{analysis}</ReactMarkdown>
        </div>
      )}

      {/* Local Context Warning */}
      <div className="p-4 bg-blue-900/10 border border-blue-900/30 flex items-start gap-4">
        <MapPin className="w-5 h-5 text-blue-500 mt-1" />
        <div className="space-y-1">
          <h4 className="text-xs font-mono uppercase text-blue-400 tracking-widest">Baker County Context</h4>
          <p className="text-[10px] text-zinc-400 font-mono leading-relaxed">
            Baker County is small; the Juvenile Department is heavily involved. Judges expect clear evidence of stability, organized filings, and labeled exhibits. 
            <br/><br/>
            <strong>Juvenile Department:</strong> 1995 3rd St, Baker City, OR 97814.
          </p>
        </div>
      </div>

      {/* Ontology Visualizer */}
      <div className="border border-zinc-800 bg-zinc-950 overflow-hidden">
        <button 
          onClick={() => setShowOntology(!showOntology)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-900/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="p-2 bg-zinc-900 text-zinc-400 rounded-sm">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-300">
                Knowledge Graph: ORS 419B Ontology
              </h3>
              <p className="text-[10px] text-zinc-600 font-mono">View the underlying logic nodes and relations used by the AI.</p>
            </div>
          </div>
          {showOntology ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-700" />}
        </button>

        {showOntology && (
          <div className="p-6 border-t border-zinc-800 bg-zinc-900/20 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest border-b border-zinc-800 pb-2">Nodes</h4>
              <div className="space-y-3">
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-sm">
                  <span className="text-[10px] font-mono text-indigo-400 font-bold block mb-1">DurableGuardianship_OR</span>
                  <span className="text-[9px] font-mono text-zinc-500">statute: ORS 419B | type: juvenile_dependency | county: Baker<br/>effects: does_not_terminate_parental_rights</span>
                </div>
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-sm">
                  <span className="text-[10px] font-mono text-indigo-400 font-bold block mb-1">Court_BakerCounty_Juvenile</span>
                  <span className="text-[9px] font-mono text-zinc-500">authority: [create_guardianship, modify_guardianship, terminate_guardianship, terminate_wardship]<br/>requires: [material_change, best_interest]</span>
                </div>
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-sm">
                  <span className="text-[10px] font-mono text-indigo-400 font-bold block mb-1">Parent</span>
                  <span className="text-[9px] font-mono text-zinc-500">retains_rights: [visitation, request_modification, request_termination]<br/>must_show: [material_change, child_best_interest]<br/>evidence_domains: [safety, stability, parenting, support]</span>
                </div>
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-sm">
                  <span className="text-[10px] font-mono text-indigo-400 font-bold block mb-1">Guardian</span>
                  <span className="text-[9px] font-mono text-zinc-500">must_be: [fit, willing, able]<br/>receives_authority: [day_to_day_decisions, medical, educational, placement]</span>
                </div>
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-sm">
                  <span className="text-[10px] font-mono text-indigo-400 font-bold block mb-1">Child</span>
                  <span className="text-[9px] font-mono text-zinc-500">considerations: [safety, attachment, needs, stability]</span>
                </div>
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-sm">
                  <span className="text-[10px] font-mono text-indigo-400 font-bold block mb-1">Wardship</span>
                  <span className="text-[9px] font-mono text-zinc-500">status: [active, terminated]<br/>basis: [jurisdictional_findings, safety_threats]</span>
                </div>
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-sm">
                  <span className="text-[10px] font-mono text-indigo-400 font-bold block mb-1">Evidence</span>
                  <span className="text-[9px] font-mono text-zinc-500">safety: [no_current_threats, no_DV, no_substance_use]<br/>stability: [housing, employment, transportation, childcare]<br/>parenting: [successful_visits, bond, meeting_needs]<br/>support: [letters, certificates, treatment_completion]</span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest border-b border-zinc-800 pb-2">Relations</h4>
              <ul className="space-y-2 font-mono text-[9px] text-zinc-400">
                <li className="flex items-center gap-2"><div className="w-1 h-1 bg-zinc-600 rounded-full"/> Parent <span className="text-indigo-500">--has_child--&gt;</span> Child</li>
                <li className="flex items-center gap-2"><div className="w-1 h-1 bg-zinc-600 rounded-full"/> Court_BakerCounty_Juvenile <span className="text-indigo-500">--establishes--&gt;</span> DurableGuardianship_OR</li>
                <li className="flex items-center gap-2"><div className="w-1 h-1 bg-zinc-600 rounded-full"/> DurableGuardianship_OR <span className="text-indigo-500">--grants_authority_to--&gt;</span> Guardian</li>
                <li className="flex items-center gap-2"><div className="w-1 h-1 bg-zinc-600 rounded-full"/> DurableGuardianship_OR <span className="text-indigo-500">--affects_rights_of--&gt;</span> Parent</li>
                <li className="flex items-center gap-2"><div className="w-1 h-1 bg-zinc-600 rounded-full"/> Parent <span className="text-indigo-500">--files--&gt;</span> Motion_Terminate_Guardianship</li>
                <li className="flex items-center gap-2"><div className="w-1 h-1 bg-zinc-600 rounded-full"/> Court_BakerCounty_Juvenile <span className="text-indigo-500">--decides--&gt;</span> Motion_Terminate_Guardianship</li>
                <li className="flex items-center gap-2"><div className="w-1 h-1 bg-zinc-600 rounded-full"/> Evidence <span className="text-indigo-500">--supports_or_refutes--&gt;</span> [material_change, best_interest]</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Logic Rules Visualizer */}
      <div className="border border-zinc-800 bg-zinc-950 overflow-hidden">
        <button 
          onClick={() => setShowRules(!showRules)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-900/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="p-2 bg-zinc-900 text-zinc-400 rounded-sm">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-300">
                Logic Rules: ORS 419B
              </h3>
              <p className="text-[10px] text-zinc-600 font-mono">View the strict logical conditions applied during analysis.</p>
            </div>
          </div>
          {showRules ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-700" />}
        </button>

        {showRules && (
          <div className="p-6 border-t border-zinc-800 bg-zinc-900/20 space-y-4">
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-sm overflow-x-auto">
              <pre className="text-[10px] font-mono text-zinc-300 leading-relaxed">
<span className="text-indigo-400">RULE:</span> create_durable_guardianship
<span className="text-orange-400">IF</span> child_cannot_safely_return_home_now = <span className="text-green-400">true</span>
<span className="text-orange-400">AND</span> adoption_not_appropriate = <span className="text-green-400">true</span>
<span className="text-orange-400">AND</span> guardianship_in_best_interest = <span className="text-green-400">true</span>
<span className="text-orange-400">AND</span> guardian_fit_willing_able = <span className="text-green-400">true</span>
<span className="text-indigo-400">THEN</span> action = <span className="text-yellow-300">"create_guardianship"</span>

<span className="text-indigo-400">RULE:</span> parent_may_seek_termination
<span className="text-orange-400">IF</span> guardianship_status = <span className="text-yellow-300">"active"</span>
<span className="text-indigo-400">THEN</span> parent_rights += [<span className="text-yellow-300">"file_motion_to_terminate"</span>]

<span className="text-indigo-400">RULE:</span> material_change_met
<span className="text-orange-400">IF</span> safety_threats_resolved = <span className="text-green-400">true</span>
<span className="text-orange-400">AND</span> housing_stable = <span className="text-green-400">true</span>
<span className="text-orange-400">AND</span> income_stable = <span className="text-green-400">true</span>
<span className="text-orange-400">AND</span> visits_successful = <span className="text-green-400">true</span>
<span className="text-indigo-400">THEN</span> material_change = <span className="text-green-400">true</span>

<span className="text-indigo-400">RULE:</span> best_interest_met
<span className="text-orange-400">IF</span> child_safe_with_parent = <span className="text-green-400">true</span>
<span className="text-orange-400">AND</span> parent_capacity_adequate = <span className="text-green-400">true</span>
<span className="text-orange-400">AND</span> transition_plan_reasonable = <span className="text-green-400">true</span>
<span className="text-indigo-400">THEN</span> best_interest = <span className="text-green-400">true</span>

<span className="text-indigo-400">RULE:</span> terminate_guardianship
<span className="text-orange-400">IF</span> material_change = <span className="text-green-400">true</span>
<span className="text-orange-400">AND</span> best_interest = <span className="text-green-400">true</span>
<span className="text-indigo-400">THEN</span> recommendation = <span className="text-yellow-300">"terminate_guardianship"</span>

<span className="text-indigo-400">RULE:</span> terminate_wardship
<span className="text-orange-400">IF</span> wardship_status = <span className="text-yellow-300">"active"</span>
<span className="text-orange-400">AND</span> conditions_leading_to_wardship_resolved = <span className="text-green-400">true</span>
<span className="text-orange-400">AND</span> court_oversight_no_longer_needed = <span className="text-green-400">true</span>
<span className="text-indigo-400">THEN</span> recommendation += <span className="text-yellow-300">"terminate_wardship"</span>
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* JSON Schema Visualizer */}
      <div className="border border-zinc-800 bg-zinc-950 overflow-hidden">
        <button 
          onClick={() => setShowSchema(!showSchema)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-900/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="p-2 bg-zinc-900 text-zinc-400 rounded-sm">
              <Braces className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-300">
                Data Schema: DurableGuardianshipCase_OR_Baker
              </h3>
              <p className="text-[10px] text-zinc-600 font-mono">View the structured JSON schema used to model case data.</p>
            </div>
          </div>
          {showSchema ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-700" />}
        </button>

        {showSchema && (
          <div className="p-6 border-t border-zinc-800 bg-zinc-900/20 space-y-4">
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-sm overflow-x-auto">
              <pre className="text-[10px] font-mono text-zinc-300 leading-relaxed">
{`{
  "type": "object",
  "title": "DurableGuardianshipCase_OR_Baker",
  "properties": {
    "caseId": { "type": "string" },
    "county": { "type": "string", "enum": ["Baker"] },
    "courtType": { "type": "string", "enum": ["Juvenile"] },
    "statute": { "type": "string", "enum": ["ORS 419B"] },
    "child": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "dob": { "type": "string", "format": "date" },
        "attachments": { "type": "array", "items": { "type": "string" } },
        "specialNeeds": { "type": "string" }
      }
    },
    "parent": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "rightsRetained": { "type": "array", "items": { "type": "string" } },
        "currentStatus": {
          "type": "object",
          "properties": {
            "housing": { "type": "string" },
            "employment": { "type": "string" },
            "substanceUseStatus": { "type": "string" },
            "criminalJusticeStatus": { "type": "string" }
          }
        }
      }
    },
    "guardian": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "relationshipToChild": { "type": "string" },
        "fitWillingAble": { "type": "boolean" }
      }
    },
    "wardship": {
      "type": "object",
      "properties": {
        "status": { "type": "string", "enum": ["active", "terminated"] },
        "basisFindings": { "type": "array", "items": { "type": "string" } }
      }
    },
    "guardianship": {
      "type": "object",
      "properties": {
        "status": { "type": "string", "enum": ["none", "active", "terminated"] },
        "startDate": { "type": "string", "format": "date" },
        "terminationDate": { "type": "string", "format": "date" },
        "orders": { "type": "array", "items": { "type": "string" } }
      }
    },
    "evidence": {
      "type": "object",
      "properties": {
        "safety": { "type": "array", "items": { "type": "string" } },
        "stability": { "type": "array", "items": { "type": "string" } },
        "parenting": { "type": "array", "items": { "type": "string" } },
        "support": { "type": "array", "items": { "type": "string" } }
      }
    },
    "motions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "type": {
            "type": "string",
            "enum": [
              "Motion_Terminate_Guardianship",
              "Motion_Terminate_Wardship",
              "Motion_Modify_Guardianship"
            ]
          },
          "filedBy": { "type": "string" },
          "filedDate": { "type": "string", "format": "date" },
          "hearingDate": { "type": "string", "format": "date" },
          "outcome": { "type": "string" }
        }
      }
    }
  }
}`}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Decision Tree Visualizer */}
      <div className="border border-zinc-800 bg-zinc-950 overflow-hidden">
        <button 
          onClick={() => setShowDecisionTree(!showDecisionTree)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-900/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="p-2 bg-zinc-900 text-zinc-400 rounded-sm">
              <GitBranch className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-300">
                Decision Tree: Termination Analysis
              </h3>
              <p className="text-[10px] text-zinc-600 font-mono">View the step-by-step evaluation flow for guardianship termination.</p>
            </div>
          </div>
          {showDecisionTree ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-700" />}
        </button>

        {showDecisionTree && (
          <div className="p-6 border-t border-zinc-800 bg-zinc-900/20 space-y-4">
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-sm overflow-x-auto">
              <pre className="text-[10px] font-mono text-zinc-300 leading-relaxed">
{`START
  |
  v
Is there an active durable guardianship?
  |-- NO --> "No guardianship to terminate." END
  |-- YES
        |
        v
Has the parent filed a motion to terminate?
  |-- NO --> "No termination request pending." END
  |-- YES
        |
        v
Is there evidence of MATERIAL CHANGE?
  |-- NO --> "Material change not established." END
  |-- YES
        |
        v
Is termination in the CHILD'S BEST INTEREST?
  |-- NO --> "Best interest standard not met." END
  |-- YES
        |
        v
Is wardship still active?
  |-- NO --> "Guardianship termination supported." END
  |-- YES
        |
        v
Are wardship conditions resolved?
  |-- NO --> "Wardship termination not supported." END
  |-- YES --> "Guardianship + wardship termination supported." END`}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Procedural Phases */}
      <div className="space-y-4">
        {phases.map((phase) => (
          <div 
            key={phase.id}
            className={cn(
              "border transition-all overflow-hidden",
              expandedPhase === phase.id ? "border-zinc-700 bg-zinc-900/50" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
            )}
          >
            <button 
              onClick={() => setExpandedPhase(expandedPhase === phase.id ? 0 : phase.id)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-2 rounded-sm transition-colors",
                  expandedPhase === phase.id ? "bg-indigo-600 text-white" : "bg-zinc-900 text-zinc-600"
                )}>
                  <phase.icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={cn(
                    "text-xs font-mono uppercase tracking-widest",
                    expandedPhase === phase.id ? "text-zinc-100" : "text-zinc-400"
                  )}>
                    {phase.title}
                  </h3>
                  <p className="text-[10px] text-zinc-600 font-mono">{phase.description}</p>
                </div>
              </div>
              {expandedPhase === phase.id ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-700" />}
            </button>

            {expandedPhase === phase.id && (
              <div className="p-6 border-t border-zinc-800 bg-zinc-950/50 space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
                
                {phase.id === 1 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-mono uppercase text-zinc-400 tracking-widest border-b border-zinc-800 pb-2">Evidence Priorities</h4>
                      <ul className="space-y-3">
                        <li className="text-[10px] text-zinc-300 flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                          <div>
                            <strong className="text-zinc-100">Safety:</strong> No current safety threats, no substance use issues, no domestic violence, no criminal activity.
                          </div>
                        </li>
                        <li className="text-[10px] text-zinc-300 flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                          <div>
                            <strong className="text-zinc-100">Stability:</strong> Proof of housing, employment, transportation, and a childcare plan.
                          </div>
                        </li>
                        <li className="text-[10px] text-zinc-300 flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                          <div>
                            <strong className="text-zinc-100">Parenting:</strong> Logs of successful visits, evidence of bond with child, ability to meet needs.
                          </div>
                        </li>
                        <li className="text-[10px] text-zinc-300 flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                          <div>
                            <strong className="text-zinc-100">Support:</strong> Letters from providers, treatment completion certificates, community support.
                          </div>
                        </li>
                      </ul>
                    </div>
                    <div className="p-4 bg-zinc-900 border border-zinc-800 space-y-3">
                      <h4 className="text-[10px] font-mono uppercase text-zinc-400 tracking-widest border-b border-zinc-800 pb-2">Misconceptions Check</h4>
                      <div className="space-y-2 text-[10px] font-mono text-zinc-500">
                        <p className="flex items-center gap-2"><AlertCircle className="w-3 h-3 text-orange-500" /> NOT Adoption</p>
                        <p className="flex items-center gap-2"><AlertCircle className="w-3 h-3 text-orange-500" /> NOT Termination of Parental Rights</p>
                        <p className="flex items-center gap-2"><AlertCircle className="w-3 h-3 text-orange-500" /> NOT Permanent (can be vacated)</p>
                        <p className="flex items-center gap-2"><AlertCircle className="w-3 h-3 text-orange-500" /> Parents retain visitation & modification rights</p>
                      </div>
                    </div>
                  </div>
                )}

                {phase.id === 2 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-zinc-900 border border-zinc-800 space-y-2">
                        <h5 className="text-[10px] font-mono uppercase text-zinc-300 tracking-widest">Motion to Vacate</h5>
                        <p className="text-[9px] text-zinc-500 font-mono leading-tight">Formal request to end the Durable Guardianship based on material change.</p>
                      </div>
                      <div className="p-4 bg-zinc-900 border border-zinc-800 space-y-2">
                        <h5 className="text-[10px] font-mono uppercase text-zinc-300 tracking-widest">Motion to Terminate Wardship</h5>
                        <p className="text-[9px] text-zinc-500 font-mono leading-tight">Required if the child is still a ward of the court. Shows conditions no longer exist.</p>
                      </div>
                      <div className="p-4 bg-zinc-900 border border-zinc-800 space-y-2">
                        <h5 className="text-[10px] font-mono uppercase text-zinc-300 tracking-widest">Declaration / Affidavit</h5>
                        <p className="text-[9px] text-zinc-500 font-mono leading-tight">Sworn statement detailing the material changes, attaching labeled exhibits.</p>
                      </div>
                    </div>
                    <div className="p-4 bg-red-900/10 border border-red-900/30 flex items-start gap-3">
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                      <div>
                        <h4 className="text-[10px] font-mono uppercase text-red-400 tracking-widest mb-1">Common Defect Scanner</h4>
                        <p className="text-[9px] text-zinc-400 font-mono">
                          Ensure no conflicting versions of judgments exist. Verify all signatures, service certificates, and case numbers (e.g., "23JU..."). Ensure ORS 419B is cited, NOT ORS 125.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {phase.id === 3 && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-mono uppercase text-zinc-400 tracking-widest border-b border-zinc-800 pb-2">Required Service List</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {['Assistant Attorney General (AAG)', 'DHS', "Child's Attorney", "Guardian's Attorney", "Father's Attorney (if applicable)", 'Juvenile Department', 'Any Guardian(s)'].map(party => (
                        <div key={party} className="flex items-center gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-sm">
                          <Circle className="w-3 h-3 text-zinc-600" />
                          <span className="text-[9px] font-mono text-zinc-300">{party}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {phase.id === 4 && (
                  <div className="space-y-4">
                    <div className="p-4 bg-zinc-900/50 border border-zinc-800 space-y-3">
                      <h4 className="text-[10px] font-mono uppercase text-zinc-400 tracking-widest">Hearing Preparation</h4>
                      <p className="text-[10px] text-zinc-400 font-mono leading-relaxed">
                        The court will weigh the parent's current capacity against the child's attachment to the guardian and any objections from the guardian or DHS.
                      </p>
                      <div className="flex items-center gap-4 pt-2">
                        <div className="flex-1 p-3 bg-zinc-950 border border-zinc-800">
                          <span className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">DHS Reports</span>
                          <span className="text-[10px] text-zinc-300">Review for recommendations and safety assessments.</span>
                        </div>
                        <div className="flex-1 p-3 bg-zinc-950 border border-zinc-800">
                          <span className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">CASA Reports</span>
                          <span className="text-[10px] text-zinc-300">Review for child's best interest perspective.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
