"use client";

import { useRef, useState } from "react";
import Link from "next/link";

type WorkExperienceForm = {
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
};

type EducationForm = {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
};

type ExtractionForm = {
  fullName: string;
  email: string;
  phone: string;
  currentRole: string;
  yearsOfExperience: string; // kept as string for editable input, parsed on save
  summary: string;
  skills: string; // comma-separated in the UI
  languages: string; // comma-separated in the UI
  certifications: string; // comma-separated in the UI
  workExperience: WorkExperienceForm[];
  education: EducationForm[];
};

type DuplicateInfo = { id: string; fullName: string; email: string | null; currentRole: string | null };

type UploadItem = {
  key: string;
  fileName: string;
  status: "queued" | "parsing" | "review" | "saving" | "saved" | "error";
  error?: string;
  form?: ExtractionForm;
  rawText?: string;
  sourceFileUrl?: string;
  sourceFileType?: "pdf" | "docx";
  duplicate?: DuplicateInfo | null;
  duplicateResolution: "replace" | "keepBoth" | null;
  savedCandidateId?: string;
};

function toForm(extraction: {
  fullName: string;
  email: string | null;
  phone: string | null;
  currentRole: string | null;
  yearsOfExperience: number | null;
  summary: string | null;
  skills: string[];
  languages: string[];
  certifications: string[];
  workExperience: { company: string; title: string; startDate: string | null; endDate: string | null; isCurrent: boolean; description: string | null }[];
  education: { institution: string; degree: string | null; fieldOfStudy: string | null; startDate: string | null; endDate: string | null }[];
}): ExtractionForm {
  return {
    fullName: extraction.fullName ?? "",
    email: extraction.email ?? "",
    phone: extraction.phone ?? "",
    currentRole: extraction.currentRole ?? "",
    yearsOfExperience: extraction.yearsOfExperience != null ? String(extraction.yearsOfExperience) : "",
    summary: extraction.summary ?? "",
    skills: extraction.skills.join(", "),
    languages: extraction.languages.join(", "),
    certifications: extraction.certifications.join(", "),
    workExperience: extraction.workExperience.map((w) => ({
      company: w.company ?? "",
      title: w.title ?? "",
      startDate: w.startDate ?? "",
      endDate: w.endDate ?? "",
      isCurrent: w.isCurrent ?? false,
      description: w.description ?? "",
    })),
    education: extraction.education.map((e) => ({
      institution: e.institution ?? "",
      degree: e.degree ?? "",
      fieldOfStudy: e.fieldOfStudy ?? "",
      startDate: e.startDate ?? "",
      endDate: e.endDate ?? "",
    })),
  };
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function UploadPage() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function updateItem(key: string, patch: Partial<UploadItem>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  function updateForm(key: string, patch: Partial<ExtractionForm>) {
    setItems((prev) =>
      prev.map((it) => (it.key === key && it.form ? { ...it, form: { ...it.form, ...patch } } : it))
    );
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const newItems: UploadItem[] = Array.from(fileList).map((file) => ({
      key: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      fileName: file.name,
      status: "queued",
      duplicateResolution: null,
    }));
    setItems((prev) => [...prev, ...newItems]);

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const key = newItems[i].key;
      updateItem(key, { status: "parsing" });

      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload/extract", { method: "POST", body: fd });
        const data = await res.json();

        if (!res.ok) {
          updateItem(key, { status: "error", error: data.error || "Failed to parse this CV." });
          continue;
        }

        updateItem(key, {
          status: "review",
          form: toForm(data.extraction),
          rawText: data.rawText,
          sourceFileUrl: data.sourceFileUrl,
          sourceFileType: data.fileType,
          duplicate: data.duplicate,
          duplicateResolution: data.duplicate ? "keepBoth" : null,
        });
      } catch {
        updateItem(key, { status: "error", error: "Network error while uploading this file." });
      }
    }

    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleSave(item: UploadItem) {
    if (!item.form || !item.rawText || !item.sourceFileUrl || !item.sourceFileType) return;
    updateItem(item.key, { status: "saving" });

    const extraction = {
      fullName: item.form.fullName.trim(),
      email: item.form.email.trim() || null,
      phone: item.form.phone.trim() || null,
      currentRole: item.form.currentRole.trim() || null,
      yearsOfExperience: item.form.yearsOfExperience.trim() ? Number(item.form.yearsOfExperience) : null,
      summary: item.form.summary.trim() || null,
      skills: splitList(item.form.skills),
      languages: splitList(item.form.languages),
      certifications: splitList(item.form.certifications),
      workExperience: item.form.workExperience.map((w) => ({
        company: w.company.trim(),
        title: w.title.trim(),
        startDate: w.startDate.trim() || null,
        endDate: w.endDate.trim() || null,
        isCurrent: w.isCurrent,
        description: w.description.trim() || null,
      })),
      education: item.form.education.map((e) => ({
        institution: e.institution.trim(),
        degree: e.degree.trim() || null,
        fieldOfStudy: e.fieldOfStudy.trim() || null,
        startDate: e.startDate.trim() || null,
        endDate: e.endDate.trim() || null,
      })),
    };

    try {
      const res = await fetch("/api/upload/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extraction,
          rawText: item.rawText,
          sourceFileUrl: item.sourceFileUrl,
          sourceFileType: item.sourceFileType,
          sourceFileName: item.fileName,
          duplicateResolution: item.duplicate ? item.duplicateResolution : null,
          duplicateCandidateId: item.duplicate?.id ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        updateItem(item.key, { status: "review", error: data.error || "Failed to save candidate." });
        return;
      }
      updateItem(item.key, { status: "saved", savedCandidateId: data.candidateId, error: undefined });
    } catch {
      updateItem(item.key, { status: "review", error: "Network error while saving." });
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Upload CVs</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Upload PDF or Word (.docx) CVs. We&apos;ll extract structured candidate data automatically —
        review and correct it before saving.
      </p>

      <div className="mt-6 rounded-lg border-2 border-dashed border-black/15 p-8 text-center dark:border-white/15">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => handleFiles(e.target.files)}
          className="mx-auto block text-sm"
        />
        <p className="mt-2 text-xs text-zinc-500">PDF or .docx, up to 15MB each.</p>
      </div>

      <div className="mt-8 flex flex-col gap-6">
        {items.map((item) => (
          <UploadItemCard
            key={item.key}
            item={item}
            onFormChange={(patch) => updateForm(item.key, patch)}
            onDuplicateResolutionChange={(r) => updateItem(item.key, { duplicateResolution: r })}
            onSave={() => handleSave(item)}
            onRemove={() => setItems((prev) => prev.filter((it) => it.key !== item.key))}
          />
        ))}
        {items.length === 0 && (
          <p className="text-center text-sm text-zinc-500">No files uploaded yet.</p>
        )}
      </div>
    </div>
  );
}

function UploadItemCard({
  item,
  onFormChange,
  onDuplicateResolutionChange,
  onSave,
  onRemove,
}: {
  item: UploadItem;
  onFormChange: (patch: Partial<ExtractionForm>) => void;
  onDuplicateResolutionChange: (r: "replace" | "keepBoth") => void;
  onSave: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
      <div className="flex items-center justify-between">
        <span className="font-medium">{item.fileName}</span>
        <StatusBadge status={item.status} />
      </div>

      {item.status === "parsing" && (
        <p className="mt-3 text-sm text-zinc-500">Extracting text and parsing candidate data…</p>
      )}

      {item.status === "error" && (
        <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {item.error}
          <button onClick={onRemove} className="ml-3 underline">
            Dismiss
          </button>
        </div>
      )}

      {item.form && (item.status === "review" || item.status === "saving") && (
        <div className="mt-4 flex flex-col gap-4">
          {item.error && (
            <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {item.error}
            </p>
          )}

          {item.duplicate && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950/30">
              <p>
                Possible duplicate: <strong>{item.duplicate.fullName}</strong>
                {item.duplicate.email ? ` (${item.duplicate.email})` : ""} already exists
                {item.duplicate.currentRole ? ` — ${item.duplicate.currentRole}` : ""}.
              </p>
              <div className="mt-2 flex gap-4">
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name={`dup-${item.key}`}
                    checked={item.duplicateResolution === "replace"}
                    onChange={() => onDuplicateResolutionChange("replace")}
                  />
                  Replace existing candidate
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name={`dup-${item.key}`}
                    checked={item.duplicateResolution === "keepBoth"}
                    onChange={() => onDuplicateResolutionChange("keepBoth")}
                  />
                  Keep both
                </label>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Full name">
              <input className={inputClass} value={item.form.fullName} onChange={(e) => onFormChange({ fullName: e.target.value })} />
            </Field>
            <Field label="Current / most recent role">
              <input className={inputClass} value={item.form.currentRole} onChange={(e) => onFormChange({ currentRole: e.target.value })} />
            </Field>
            <Field label="Email">
              <input className={inputClass} value={item.form.email} onChange={(e) => onFormChange({ email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input className={inputClass} value={item.form.phone} onChange={(e) => onFormChange({ phone: e.target.value })} />
            </Field>
            <Field label="Years of experience">
              <input
                type="number"
                step="0.5"
                className={inputClass}
                value={item.form.yearsOfExperience}
                onChange={(e) => onFormChange({ yearsOfExperience: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Summary">
            <textarea className={inputClass} rows={2} value={item.form.summary} onChange={(e) => onFormChange({ summary: e.target.value })} />
          </Field>

          <Field label="Skills (comma-separated)">
            <input className={inputClass} value={item.form.skills} onChange={(e) => onFormChange({ skills: e.target.value })} />
          </Field>
          <Field label="Languages (comma-separated)">
            <input className={inputClass} value={item.form.languages} onChange={(e) => onFormChange({ languages: e.target.value })} />
          </Field>
          <Field label="Certifications (comma-separated)">
            <input className={inputClass} value={item.form.certifications} onChange={(e) => onFormChange({ certifications: e.target.value })} />
          </Field>

          <WorkExperienceEditor
            entries={item.form.workExperience}
            onChange={(workExperience) => onFormChange({ workExperience })}
          />
          <EducationEditor entries={item.form.education} onChange={(education) => onFormChange({ education })} />

          <div className="flex justify-end gap-2">
            <button onClick={onRemove} className="rounded-md border border-black/10 px-4 py-2 text-sm dark:border-white/20">
              Discard
            </button>
            <button
              onClick={onSave}
              disabled={item.status === "saving" || !item.form.fullName.trim() || (!!item.duplicate && !item.duplicateResolution)}
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {item.status === "saving" ? "Saving…" : "Save candidate"}
            </button>
          </div>
        </div>
      )}

      {item.status === "saved" && (
        <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">
          Saved.{" "}
          <Link href={`/candidates/${item.savedCandidateId}`} className="underline">
            View candidate profile
          </Link>
        </p>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-black/15 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-black/40 dark:border-white/15 dark:focus:border-white/40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

function StatusBadge({ status }: { status: UploadItem["status"] }) {
  const map: Record<UploadItem["status"], string> = {
    queued: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    parsing: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    review: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    saving: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    saved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    error: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  };
  const label: Record<UploadItem["status"], string> = {
    queued: "Queued",
    parsing: "Parsing…",
    review: "Needs review",
    saving: "Saving…",
    saved: "Saved",
    error: "Error",
  };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status]}`}>{label[status]}</span>;
}

function WorkExperienceEditor({
  entries,
  onChange,
}: {
  entries: WorkExperienceForm[];
  onChange: (entries: WorkExperienceForm[]) => void;
}) {
  function update(i: number, patch: Partial<WorkExperienceForm>) {
    onChange(entries.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  }
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500">Work experience</span>
        <button
          type="button"
          onClick={() =>
            onChange([...entries, { company: "", title: "", startDate: "", endDate: "", isCurrent: false, description: "" }])
          }
          className="text-xs underline"
        >
          + Add entry
        </button>
      </div>
      <div className="mt-2 flex flex-col gap-3">
        {entries.map((entry, i) => (
          <div key={i} className="grid grid-cols-5 gap-2 rounded-md border border-black/10 p-2 dark:border-white/10">
            <input className={inputClass} placeholder="Title" value={entry.title} onChange={(e) => update(i, { title: e.target.value })} />
            <input className={inputClass} placeholder="Company" value={entry.company} onChange={(e) => update(i, { company: e.target.value })} />
            <input className={inputClass} placeholder="Start" value={entry.startDate} onChange={(e) => update(i, { startDate: e.target.value })} />
            <input className={inputClass} placeholder="End" value={entry.endDate} onChange={(e) => update(i, { endDate: e.target.value })} disabled={entry.isCurrent} />
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={entry.isCurrent} onChange={(e) => update(i, { isCurrent: e.target.checked })} />
              Current
            </label>
            <textarea
              className={`col-span-5 ${inputClass}`}
              placeholder="Description"
              rows={1}
              value={entry.description}
              onChange={(e) => update(i, { description: e.target.value })}
            />
            <button
              type="button"
              onClick={() => onChange(entries.filter((_, idx) => idx !== i))}
              className="col-span-5 text-left text-xs text-red-600"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function EducationEditor({
  entries,
  onChange,
}: {
  entries: EducationForm[];
  onChange: (entries: EducationForm[]) => void;
}) {
  function update(i: number, patch: Partial<EducationForm>) {
    onChange(entries.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  }
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500">Education</span>
        <button
          type="button"
          onClick={() => onChange([...entries, { institution: "", degree: "", fieldOfStudy: "", startDate: "", endDate: "" }])}
          className="text-xs underline"
        >
          + Add entry
        </button>
      </div>
      <div className="mt-2 flex flex-col gap-3">
        {entries.map((entry, i) => (
          <div key={i} className="grid grid-cols-5 gap-2 rounded-md border border-black/10 p-2 dark:border-white/10">
            <input className={inputClass} placeholder="Institution" value={entry.institution} onChange={(e) => update(i, { institution: e.target.value })} />
            <input className={inputClass} placeholder="Degree" value={entry.degree} onChange={(e) => update(i, { degree: e.target.value })} />
            <input className={inputClass} placeholder="Field of study" value={entry.fieldOfStudy} onChange={(e) => update(i, { fieldOfStudy: e.target.value })} />
            <input className={inputClass} placeholder="Start" value={entry.startDate} onChange={(e) => update(i, { startDate: e.target.value })} />
            <input className={inputClass} placeholder="End" value={entry.endDate} onChange={(e) => update(i, { endDate: e.target.value })} />
            <button
              type="button"
              onClick={() => onChange(entries.filter((_, idx) => idx !== i))}
              className="col-span-5 text-left text-xs text-red-600"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
