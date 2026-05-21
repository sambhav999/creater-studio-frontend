import { Clock3, Download, ShieldCheck } from "lucide-react";

export function TemplateGallery({ templates, selectedId, onSelect, onDownloadAll }) {
  return (
    <section className="template-section">
      <div className="section-heading">
        <div>
          <span>{templates.length} Templates</span>
          <strong>Primary Path</strong>
        </div>
        <button type="button" className="small-tool-button" onClick={onDownloadAll}>
          <Download size={14} /> All
        </button>
      </div>
      <div className="template-list">
        {templates.map(template => (
          <button
            type="button"
            key={template.id}
            className={`template-card ${selectedId === template.id ? "selected" : ""}`}
            onClick={() => onSelect(template.id)}
            style={{ "--accent": template.accent }}
          >
            <span className="template-category">{template.category}</span>
            <strong>{template.name}</strong>
            <small>{template.mechanic}</small>
            <div className="template-meta">
              <span><Clock3 size={13} /> {template.time}</span>
              <span><ShieldCheck size={13} /> {template.reliability}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
