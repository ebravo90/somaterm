import { useAppStore } from '../../../store/useAppStore';

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'rs':
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
    case 'json':
    case 'md':
    case 'css':
    case 'html':
      return '📄';
    default:
      return '📄';
  }
}

export function ContextFilePicker() {
  const { stagedContextFiles, removeContextFile } = useAppStore();

  if (!stagedContextFiles || stagedContextFiles.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {stagedContextFiles.map((file: string) => {
        const name = file.split('/').pop() || file;
        return (
          <div key={file} className="flex items-center gap-1 bg-soma-bg/80 backdrop-blur border border-soma-border rounded-full px-3 py-1 text-xs text-soma-text">
            <span>{getFileIcon(name)} {name}</span>
            <button 
              onClick={() => removeContextFile(file)}
              className="ml-1 text-soma-text-muted hover:text-red-400 transition-colors cursor-pointer"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
