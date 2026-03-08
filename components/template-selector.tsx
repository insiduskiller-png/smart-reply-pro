"use client";

export type TemplateType = "work" | "dating" | "negotiation" | "conflict" | "decline" | "customer_service" | null;

interface Template {
  id: TemplateType;
  name: string;
  description: string;
  icon: string;
  proOnly: boolean;
}

const templates: Template[] = [
  {
    id: "work",
    name: "Work",
    description: "Professional business communication",
    icon: "💼",
    proOnly: false,
  },
  {
    id: "customer_service",
    name: "Customer Service",
    description: "Helpful and solution-oriented",
    icon: "🎧",
    proOnly: false,
  },
  {
    id: "decline",
    name: "Polite Decline",
    description: "Say no without apologizing",
    icon: "🙅",
    proOnly: false,
  },
  {
    id: "dating",
    name: "Dating",
    description: "Playful confidence and natural flow",
    icon: "💬",
    proOnly: true,
  },
  {
    id: "negotiation",
    name: "Negotiation",
    description: "Maintain leverage strategically",
    icon: "🤝",
    proOnly: true,
  },
  {
    id: "conflict",
    name: "Conflict",
    description: "De-escalate while maintaining respect",
    icon: "⚖️",
    proOnly: true,
  },
];

interface TemplateSelectorProps {
  selectedTemplate: TemplateType;
  onSelectTemplate: (template: TemplateType) => void;
  isPro: boolean;
  onUpgradeClick: () => void;
}

export default function TemplateSelector({
  selectedTemplate,
  onSelectTemplate,
  isPro,
  onUpgradeClick,
}: TemplateSelectorProps) {
  function handleTemplateClick(template: Template) {
    if (template.proOnly && !isPro) {
      onUpgradeClick();
      return;
    }
    
    // Toggle selection: if clicking the same template, deselect it
    if (selectedTemplate === template.id) {
      onSelectTemplate(null);
    } else {
      onSelectTemplate(template.id);
    }
  }

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-100">Quick Reply Templates</h2>
        {selectedTemplate && (
          <button
            onClick={() => onSelectTemplate(null)}
            className="text-xs text-slate-400 hover:text-slate-300"
          >
            Clear
          </button>
        )}
      </div>
      
      {/* Desktop: Grid Layout */}
      <div className="hidden grid-cols-3 gap-2 md:grid">
        {templates.map((template) => {
          const isSelected = selectedTemplate === template.id;
          const isLocked = template.proOnly && !isPro;
          
          return (
            <button
              key={template.id}
              onClick={() => handleTemplateClick(template)}
              className={`relative flex flex-col items-start rounded-md border p-3 text-left transition-all ${
                isSelected
                  ? "border-sky-500 bg-sky-500/10 shadow-lg"
                  : isLocked
                  ? "border-slate-700 bg-slate-900/40 opacity-60"
                  : "border-slate-700 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-800/60"
              }`}
            >
              <div className="mb-1 flex w-full items-center justify-between">
                <span className="text-lg">{template.icon}</span>
                {isLocked && (
                  <span className="text-xs text-amber-400">🔒 Pro</span>
                )}
              </div>
              <span className="text-sm font-medium text-slate-100">{template.name}</span>
              <span className="mt-1 text-xs text-slate-400">{template.description}</span>
            </button>
          );
        })}
      </div>
      
      {/* Mobile: Horizontal Scroll */}
      <div className="flex gap-2 overflow-x-auto pb-2 md:hidden">
        {templates.map((template) => {
          const isSelected = selectedTemplate === template.id;
          const isLocked = template.proOnly && !isPro;
          
          return (
            <button
              key={template.id}
              onClick={() => handleTemplateClick(template)}
              className={`relative flex min-w-[140px] flex-col items-start rounded-md border p-3 text-left transition-all ${
                isSelected
                  ? "border-sky-500 bg-sky-500/10 shadow-lg"
                  : isLocked
                  ? "border-slate-700 bg-slate-900/40 opacity-60"
                  : "border-slate-700 bg-slate-900/40 active:bg-slate-800/60"
              }`}
            >
              <div className="mb-1 flex w-full items-center justify-between">
                <span className="text-xl">{template.icon}</span>
                {isLocked && (
                  <span className="text-[10px] text-amber-400">🔒</span>
                )}
              </div>
              <span className="text-sm font-medium text-slate-100">{template.name}</span>
              <span className="mt-1 text-xs leading-tight text-slate-400">{template.description}</span>
            </button>
          );
        })}
      </div>
      
      {selectedTemplate && (
        <div className="mt-3 rounded-md border border-sky-500/30 bg-sky-500/5 p-2 text-xs text-sky-300">
          <span className="font-medium">Active Template:</span> {templates.find(t => t.id === selectedTemplate)?.name}
        </div>
      )}
    </div>
  );
}
