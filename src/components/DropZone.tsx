import { useCallback, useRef, useState } from "react";

interface DropZoneProps {
  onFiles: (files: FileList | File[]) => void;
}

export function DropZone({ onFiles }: DropZoneProps) {
  const [isDragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      onFiles(files);
    },
    [onFiles],
  );

  return (
    <div
      className={`dropzone ${isDragging ? "dragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          inputRef.current?.click();
        }
      }}
    >
      <p>Drop a JSONL trace here or</p>
      <button
        type="button"
        className="filter-button"
        onClick={() => inputRef.current?.click()}
      >
        Choose a file
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".jsonl,.txt,application/json"
        style={{ display: "none" }}
        onChange={(event) => handleFiles(event.target.files)}
      />
    </div>
  );
}
