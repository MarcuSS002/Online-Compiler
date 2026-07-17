import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "./components/ui/separator";
import axios from "axios";

const LANGUAGES = ["python", "cpp", "javascript"] as const;
type Language = (typeof LANGUAGES)[number];

const PAIRS: Record<string, string> = {
  "(": ")",
  "{": "}",
  "[": "]",
  '"': '"',
  "'": "'",
  "`": "`",
};

function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
  const textarea = e.currentTarget;
  const { selectionStart, selectionEnd, value } = textarea;

  const closing = PAIRS[e.key];

  if (closing) {
    e.preventDefault();

    const before = value.slice(0, selectionStart);
    const selected = value.slice(selectionStart, selectionEnd);
    const after = value.slice(selectionEnd);

    // wrap selection OR insert pair with cursor inside
    const newValue = before + e.key + selected + closing + after;
    textarea.value = newValue;

    // put cursor between the pair (or after the selection)
    const newCursor = selectionStart + 1 + selected.length;
    textarea.setSelectionRange(newCursor, newCursor);
  }

  // pressing Enter inside {} → auto-indent
  if (e.key === "Enter") {
    const before = value.slice(0, selectionStart);
    const after = value.slice(selectionStart);

    if (before.endsWith("{") && after.startsWith("}")) {
      e.preventDefault();
      const indent = before.match(/\n?([ \t]*)(?=[^\s])/)?.[1] ?? "";
      const newValue = before + "\n" + indent + "  \n" + indent + after;
      textarea.value = newValue;
      const pos = selectionStart + indent.length + 3;
      textarea.setSelectionRange(pos, pos);
    }
  }

  // skip over closing bracket if it's already there
  if (Object.values(PAIRS).includes(e.key)) {
    if (value[selectionStart] === e.key && selectionStart === selectionEnd) {
      e.preventDefault();
      textarea.setSelectionRange(selectionStart + 1, selectionStart + 1);
    }
  }
}

const LANG_LABELS: Record<Language, string> = {
  python: "Python",
  cpp: "C++",
  javascript: "JavaScript",
};

type Status = "idle" | "Processing" | "Success" | "Failure" | "TLE";

const STATUS_STYLES: Record<Status, string> = {
  idle: "bg-slate-700 text-slate-300",
  Processing: "bg-violet-500/20 text-violet-300 border border-violet-500/40",
  Success: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40",
  Failure: "bg-red-500/20 text-red-300 border border-red-500/40",
  TLE: "bg-amber-500/20 text-amber-300 border border-amber-500/40",
};

const STATUS_DOT: Record<Status, string> = {
  idle: "bg-slate-500",
  Processing: "bg-violet-400 animate-pulse",
  Success: "bg-emerald-400",
  Failure: "bg-red-400",
  TLE: "bg-amber-400",
};

function App() {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [language, setLanguage] = useState<Language>("python");
  const [status, setStatus] = useState<Status>("idle");
  const [output, setOutput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function pollBackend(submissionId: string): Promise<void> {
    while (true) {
      const response = await axios.get(
        `http://localhost:3000/submission/${submissionId}`
      );
      const submission = response.data.submission;

      if (submission.status !== "Processing") {
        setStatus(submission.status as Status);
        setOutput(submission.output);
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  async function handleRun() {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setStatus("Processing");
    setOutput("");

    try {
      const response = await axios.post("http://localhost:3000/submission", {
        code: textAreaRef.current?.value,
        language,
      });

      await pollBackend(response.data.id);
    } catch {
      setStatus("Failure");
      setOutput("Failed to reach the server. Make sure the backend is running.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const statusLabel = status === "idle" ? "Ready" : status;

  return (
    <div className="flex h-screen w-screen flex-col bg-slate-950 text-slate-100 font-mono overflow-hidden">

      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-xs tracking-widest uppercase">
              Online Code Runner
          </span>
          <Separator orientation="vertical" className="h-4 bg-slate-700" />
          <div className="flex items-center gap-1.5">
            {LANGUAGES.map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`rounded px-3 py-1 text-xs font-medium transition-all ${
                  language === lang
                    ? "bg-violet-600 text-white"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                {LANG_LABELS[lang]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
            {statusLabel}
          </div>

          <Button
            onClick={handleRun}
            disabled={isSubmitting}
            className="bg-violet-600 hover:bg-violet-500 text-white text-xs px-4 h-8 rounded disabled:opacity-40"
          >
            {isSubmitting ? "Running…" : "Run"}
          </Button>
        </div>
      </header>

      {/* Main split */}
      <div className="flex flex-1 overflow-hidden">

        {/* Editor pane */}
        <div className="flex flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-2">
            <span className="text-xs text-slate-500">main.{language === "cpp" ? "cpp" : language === "javascript" ? "js" : "py"}</span>
          </div>
          <textarea
            ref={textAreaRef}
            spellCheck={false}
            className="flex-1 resize-none bg-slate-950 px-5 py-4 text-sm text-slate-200 placeholder-slate-600 outline-none leading-relaxed"
            placeholder={`# Write your ${LANG_LABELS[language]} code here…`}
            onKeyDown={handleKeyDown}
          />
        </div>

        <Separator orientation="vertical" className="bg-slate-800 w-px" />

        {/* Output pane */}
        <div className="flex w-[420px] flex-col shrink-0">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
            <span className="text-xs text-slate-500">Output</span>
            {output && (
              <button
                onClick={() => setOutput("")}
                className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex-1 overflow-auto p-5">
            {status === "idle" && !output && (
              <p className="text-xs text-slate-600 leading-relaxed">
                Run your code to see output here.
              </p>
            )}

            {status === "Processing" && (
              <div className="flex items-center gap-2 text-xs text-violet-400">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
                Executing…
              </div>
            )}

            {output && status !== "Processing" && (
              <pre className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                {output}
              </pre>
            )}
          </div>

          {/* Footer with status badge */}
          {status !== "idle" && status !== "Processing" && (
            <div className="border-t border-slate-800 px-5 py-3">
              <Badge
                className={`text-xs rounded font-medium ${STATUS_STYLES[status]}`}
              >
                {status}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;