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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      try {
        const response = await fetch(`/api/documents/${encodeURIComponent(activeDocument)}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error("Kon document niet laden");
        
        // We gebruiken arrayBuffer en maken zelf een Blob met expliciet type
        // Dit is robuuster tegen onjuiste Content-Type headers van de proxy
        const buffer = await response.arrayBuffer();
        if (isMounted) {
          const blob = new Blob([buffer], { type: "application/pdf" });
          objectUrl = URL.createObjectURL(blob);
          setPdfBlobUrl(objectUrl);
        }
      } catch (error: any) {
        clearTimeout(timeoutId);
        console.error("[PDF LOAD ERROR]", error);
        if (isMounted) {
          const message = error.name === "AbortError" 
            ? "Laden duurde te lang. Controleer je verbinding." 
            : "Kon document niet laden in de viewer.";
          showToast(message);
        }
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
