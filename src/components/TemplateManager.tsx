import React, { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { cn } from '../lib/utils';

export interface DocumentTemplate {
  id: string;
  name: string;
  content: string;
}

interface TemplateManagerProps {
  templates: DocumentTemplate[];
  onUpdateTemplates: (templates: DocumentTemplate[]) => void;
}

const DEFAULT_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'template_caption',
    name: 'Standard Oregon Circuit Court Caption',
    content: `IN THE CIRCUIT COURT OF THE STATE OF OREGON
                    FOR THE COUNTY OF BAKER

[YOUR FULL LEGAL NAME],
   Plaintiff / Petitioner,

v.                                                Case No.: [____________]

[OPPOSING PARTY FULL LEGAL NAME],
   Defendant / Respondent.`
  },
  {
    id: 'template_motion_pro_se',
    name: 'Motion (Pro Se Defendant)',
    content: `MOTION TO ____________________

COMES NOW the Defendant, appearing pro se, and moves the Court for the following relief:

1. [Legal and factual basis.]

2. [Supporting authority if known.]

WHEREFORE, Defendant requests the Court grant the motion as stated above.`
  },
  {
    id: 'template_petition',
    name: 'Petition (Probate/Guardianship)',
    content: `PETITION FOR ____________________

1. Petitioner is an interested person under ORS _______.

2. The decedent / protected person is named ____________________.

3. Venue is proper in Baker County.

WHEREFORE, Petitioner requests that the Court issue an order granting the relief requested herein.`
  },
  {
    id: 'template_declaration',
    name: 'Declaration (General/Family Law)',
    content: `DECLARATION OF [YOUR NAME]

I, [Your Name], declare:

1. I am a party to this family law matter.

2. [Statement relating to custody, parenting time, support, or facts at issue.]

3. The statements above are based on personal knowledge.

I declare under penalty of perjury that the above is true and correct.

DATED this ___ day of ____________, 20__.

______________________________
[Your Name]`
  },
  {
    id: 'template_motion_general',
    name: 'Motion (General)',
    content: `MOTION FOR ____________________

1. Plaintiff [or Defendant] states the following facts in support of this motion:

2. [Concise numbered factual allegations.]

3. [Each paragraph limited to one factual assertion.]

WHEREFORE, Plaintiff respectfully requests that the Court:

A. Grant the requested relief;
B. Award costs and disbursements as allowed by law;
C. Grant such other relief as the Court deems just and proper.`
  }
];

export const TemplateManager: React.FC<TemplateManagerProps> = ({ templates, onUpdateTemplates }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);

  // Initialize with default templates if empty
  useEffect(() => {
    if (templates.length === 0) {
      onUpdateTemplates(DEFAULT_TEMPLATES);
    }
  }, []);

  const handleAddTemplate = () => {
    setEditingTemplate({
      id: `template_${Date.now()}`,
      name: 'New Custom Template',
      content: 'Enter template content here. Use placeholders like {{party_name}}, {{date}}, or {{statute}} for the AI to populate.'
    });
    setIsEditing(true);
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate) return;
    
    const existingIndex = templates.findIndex(t => t.id === editingTemplate.id);
    let newTemplates;
    
    if (existingIndex >= 0) {
      newTemplates = [...templates];
      newTemplates[existingIndex] = editingTemplate;
    } else {
      newTemplates = [...templates, editingTemplate];
    }
    
    onUpdateTemplates(newTemplates);
    setIsEditing(false);
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = (id: string) => {
    onUpdateTemplates(templates.filter(t => t.id !== id));
  };

  const handleEditTemplate = (template: DocumentTemplate) => {
    setEditingTemplate(template);
    setIsEditing(true);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-sm overflow-hidden">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-300">Custom Document Templates</h3>
        </div>
        {!isEditing && (
          <button
            onClick={handleAddTemplate}
            className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm transition-colors flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider"
          >
            <Plus className="w-3 h-3" />
            New Template
          </button>
        )}
      </div>

      <div className="p-4">
        {isEditing && editingTemplate ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div>
              <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Template Name</label>
              <input
                type="text"
                value={editingTemplate.name}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500/50"
                placeholder="e.g., Subpoena Duces Tecum"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Template Content (Markdown)</label>
              <textarea
                value={editingTemplate.content}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500/50 min-h-[200px] resize-y"
                placeholder="Enter template content with placeholders..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setIsEditing(false); setEditingTemplate(null); }}
                className="px-3 py-1.5 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-[10px] font-mono uppercase tracking-wider transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-mono uppercase tracking-wider transition-colors flex items-center gap-1"
              >
                <Save className="w-3 h-3" />
                Save Template
              </button>
            </div>
          </div>
        ) : templates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map(template => (
              <div key={template.id} className="p-3 border border-zinc-800 bg-zinc-950/50 rounded-sm flex flex-col gap-2 group">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono text-zinc-300 truncate pr-2">{template.name}</h4>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEditTemplate(template)}
                      className="p-1 text-zinc-500 hover:text-indigo-400 transition-colors"
                      title="Edit Template"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                      title="Delete Template"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <p className="text-[10px] font-mono text-zinc-600 line-clamp-2">{template.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-zinc-600 font-mono text-xs italic">
            No custom templates created yet.
          </div>
        )}
      </div>
    </div>
  );
};
