import { useConfigStore } from '@/store/configStore';

/**
 * Hook for exporting the current configuration as a JSON file.
 * Downloads the config with a timestamp in the filename.
 */
export function useConfigExport() {
  const exportToJson = useConfigStore((state) => state.exportToJson);

  const handleExport = () => {
    const json = exportToJson();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `omo-config-${timestamp}.json`;

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return { handleExport };
}
