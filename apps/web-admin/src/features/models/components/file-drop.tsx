import { useRef, useState, type DragEvent } from 'react';
import { UploadCloud } from 'lucide-react';

import { cn } from '../../../shared/lib/utils';

const MAX_BYTES = 100 * 1024 * 1024;

/** Drag-and-drop STL picker. Rejects non-STL and oversized files before any upload. */
export function FileDrop({
  onFile,
  title = 'Drop an STL file here',
  className,
}: {
  onFile: (file: File) => void;
  title?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = (file: File | undefined) => {
    if (!file) {
      return;
    }
    if (!/\.stl$/i.test(file.name)) {
      setError('Only .stl files can be quoted right now.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('That file is over 100 MB. Try a lighter export.');
      return;
    }
    setError(null);
    onFile(file);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    accept(event.dataTransfer.files[0]);
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors duration-150',
          dragging
            ? 'border-foreground bg-stock-quoted/25'
            : 'border-input bg-card hover:border-foreground hover:bg-muted/50',
        )}
      >
        <UploadCloud className="h-7 w-7 text-foreground" aria-hidden="true" />
        <span className="mt-3 text-[15px] font-bold text-foreground">{title}</span>
        <span className="mt-1 text-sm text-muted-foreground">
          or click to browse · STL up to 100 MB
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".stl,model/stl"
        className="sr-only"
        onChange={(event) => {
          accept(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
