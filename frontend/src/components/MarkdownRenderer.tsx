import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
        strong: ({ node, ...props }) => <strong className="font-extrabold text-earth-900" {...props} />,
        ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
        ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
        li: ({ node, ...props }) => <li className="pl-1" {...props} />,
        h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-4 mb-2 text-earth-900" {...props} />,
        h2: ({ node, ...props }) => <h2 className="text-lg font-bold mt-4 mb-2 text-earth-900" {...props} />,
        h3: ({ node, ...props }) => <h3 className="text-base font-bold mt-3 mb-1 text-earth-900" {...props} />,
        table: ({ node, ...props }) => (
          <div className="overflow-x-auto my-4 border border-black/10 rounded-xl w-full">
            <table className="w-full text-left text-sm" {...props} />
          </div>
        ),
        thead: ({ node, ...props }) => <thead className="bg-earth-100/50 text-earth-900 font-bold" {...props} />,
        th: ({ node, ...props }) => <th className="p-3 border-b border-black/10" {...props} />,
        td: ({ node, ...props }) => <td className="p-3 border-b border-black/5 text-earth-800" {...props} />,
        a: ({ node, ...props }) => {
          const href = props.href || "";
          const isDocLink = 
            href.startsWith("zonnehoeve://doc/") || 
            href.includes("/api/documents/") ||
            /\.pdf($|[#?])/i.test(href);

          if (isDocLink) {
            let fullRef = href;
            // Verwijder prefixen om de zuivere bestandsnaam + eventuele pagina over te houden
            if (fullRef.startsWith("zonnehoeve://doc/")) {
              fullRef = fullRef.replace("zonnehoeve://doc/", "");
            } else if (fullRef.includes("/api/documents/")) {
              const parts = fullRef.split("/api/documents/");
              fullRef = parts[parts.length - 1];
            }
            
            // Verwijder query parameters (zoals ?download=true) maar behoud hashes (#page=1)
            fullRef = fullRef.split('?')[0];

            return (
               <button 
                 onClick={(e) => {
                   e.preventDefault();
                   window.dispatchEvent(new CustomEvent('open-doc', {detail: fullRef}));
                 }} 
                 className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-bold mx-1 hover:bg-emerald-600 hover:text-white transition-all transform active:scale-95 shadow-sm cursor-pointer border border-emerald-500/20"
                 title={`Open ${decodeURIComponent(fullRef.split('#')[0])}`}
               >
                 <span className="opacity-70">📄</span>
                 {props.children}
               </button>
            );
          }
          return <a className="text-brand-green-dark underline font-bold hover:text-brand-green transition-colors" target="_blank" rel="noopener noreferrer" {...props} />
        },
        blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-brand-green/30 pl-4 py-1 italic text-earth-800/80 my-3" {...props} />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
