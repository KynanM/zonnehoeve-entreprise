
import { useState } from "react";
import { Search, FileUp, Trash2, Eye, Plus } from "lucide-react";
import { motion } from "framer-motion";

interface Document {
  filename: string;
  last_ingested: string;
}

interface DocumentManagerProps {
  documents: Document[];
  onUpload: (file: File) => void;
  onDelete: (filename: string) => void;
  isUploading: boolean;
}

export function DocumentManager({ documents, onUpload, onDelete, isUploading }: DocumentManagerProps) {
  const [docSearch, setDocSearch] = useState("");

  const filteredDocs = documents.filter(doc => 
    doc.filename.toLowerCase().includes(docSearch.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Search & Actions */}
      <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-black/5 flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-earth-800/30" size={18} />
          <input
            type="text"
            placeholder="Zoek in protocollen..."
            value={docSearch}
            onChange={(e) => setDocSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-earth-50 rounded-2xl text-sm outline-none focus:ring-2 ring-brand-green/20 transition-all font-medium"
          />
        </div>
        <label className="flex items-center gap-3 px-6 py-4 bg-brand-yellow text-earth-900 rounded-2xl font-black text-sm hover:bg-brand-yellow-dark transition-all active:scale-95 cursor-pointer shadow-lg shadow-brand-yellow/10 shrink-0 w-full md:w-auto justify-center">
          <FileUp size={18} />
          {isUploading ? "Uploaden..." : "Nieuw Protocol"}
          <input 
            type="file" 
            className="hidden" 
            accept=".pdf,.docx" 
            onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} 
            disabled={isUploading} 
          />
        </label>
      </div>

      {/* Document List */}
      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-black/5">
        {filteredDocs.length === 0 && (
          <div className="px-6 py-10 text-center text-earth-800/30 font-bold">
            Geen documenten gevonden.
          </div>
        )}
        {filteredDocs.map((doc, i) => (
          <div key={i} className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-green/10 flex items-center justify-center text-brand-green-dark shrink-0">
                  <Plus size={14} />
                </div>
                <span className="font-bold text-earth-900 text-sm leading-tight">{doc.filename}</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-earth-800/40 hover:text-brand-green-dark bg-earth-50 rounded-lg">
                  <Eye size={18} />
                </button>
                <button 
                  onClick={() => onDelete(doc.filename)}
                  className="p-2 text-earth-800/40 hover:text-red-500 bg-earth-50 rounded-lg"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-earth-800/30">Laatst Bijgewerkt</span>
              <span className="text-xs font-bold text-earth-800/50">
                {new Date(doc.last_ingested).toLocaleDateString("nl-BE", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-earth-800/40 text-[10px] uppercase tracking-widest font-extrabold border-b border-black/5 bg-earth-50/50">
              <th className="px-6 py-4">Protocol Naam</th>
              <th className="px-6 py-4">Laatst Bijgewerkt</th>
              <th className="px-6 py-4 text-right">Acties</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocs.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-10 text-center text-earth-800/30 font-bold">
                  Geen documenten gevonden.
                </td>
              </tr>
            )}
            {filteredDocs.map((doc, i) => (
              <tr key={i} className="border-b border-black/5 hover:bg-earth-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-green/10 flex items-center justify-center text-brand-green-dark">
                      <Plus size={14} />
                    </div>
                    <span className="font-bold text-earth-900 text-sm">{doc.filename}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-bold text-earth-800/40">
                  {new Date(doc.last_ingested).toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" })}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2 text-earth-800/40 hover:text-brand-green-dark hover:bg-brand-green/5 rounded-lg transition-all">
                      <Eye size={18} />
                    </button>
                    <button 
                      onClick={() => onDelete(doc.filename)}
                      className="p-2 text-earth-800/40 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
