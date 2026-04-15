import { useState, useEffect } from "react";

export function usePdfLoader(activeDocument: string | null, showToast: (message: string) => void) {
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  useEffect(() => {
    if (!activeDocument) {
      setPdfBlobUrl(null);
      return;
    }

    let isMounted = true;
    let objectUrl: string | null = null;

    const loadPdf = async () => {
      setIsPdfLoading(true);
      try {
        const response = await fetch(`/api/documents/${encodeURIComponent(activeDocument)}`);
        if (!response.ok) throw new Error("Kon document niet laden");
        
        const blob = await response.blob();
        if (isMounted) {
          objectUrl = URL.createObjectURL(blob);
          setPdfBlobUrl(objectUrl);
        }
      } catch (error) {
        console.error("[PDF LOAD ERROR]", error);
        if (isMounted) showToast("Kon document niet laden in de viewer.");
      } finally {
        if (isMounted) setIsPdfLoading(false);
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [activeDocument, showToast]);

  return { pdfBlobUrl, isPdfLoading };
}
