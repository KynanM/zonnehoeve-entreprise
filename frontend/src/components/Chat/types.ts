export type Message = {
  role: "user" | "assistant";
  content: string;
  log_id?: number;
  retrieved_sources?: string[];
  feedback?: string;
  pinned?: boolean;
};

export type PinnedNote = {
  id: string;
  content: string;
  sources: string[];
  pinnedAt: string;
};

export interface DigitalGuideProps {
  initialTheme?: "light" | "night";
  onThemeChange?: (theme: "light" | "night") => void;
  className?: string;
}
