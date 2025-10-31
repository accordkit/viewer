import { DropZone } from "./DropZone";

interface TraceIngestPanelProps {
  fileName: string | null;
  errors: string[];
  onLoadSample: () => void;
  onFiles: (files: FileList | File[]) => void | Promise<void>;
}

export function TraceIngestPanel({
  fileName,
  errors,
  onLoadSample,
  onFiles,
}: TraceIngestPanelProps) {
  return (
    <div className="panel" style={{ marginBottom: "1.5rem" }}>
      <div className="panel-header">
        <h2>Trace Ingest</h2>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            type="button"
            className="filter-button"
            onClick={onLoadSample}
          >
            Load sample trace
          </button>
          {fileName && (
            <span
              style={{
                fontSize: "0.85rem",
                color: "rgba(148,163,184,0.85)",
              }}
            >
              Loaded: <strong>{fileName}</strong>
            </span>
          )}
        </div>
      </div>
      <div className="panel-body">
        {errors.length > 0 && (
          <div className="error-banner">
            <strong>{errors.length} line(s) failed to parse.</strong>
            <ul style={{ marginTop: "0.5rem", marginBottom: 0 }}>
              {errors.slice(0, 3).map((err, index) => (
                <li key={index}>{err}</li>
              ))}
            </ul>
          </div>
        )}
        <DropZone onFiles={(files) => void onFiles(files)} />
      </div>
    </div>
  );
}
