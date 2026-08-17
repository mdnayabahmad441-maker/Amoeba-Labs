"use client";
/* eslint-disable @next/next/no-img-element -- Supabase Storage URL is user-uploaded and shown inside a printable card. */

import { ChangeEvent, useRef, useState } from "react";
import Image from "next/image";
import { Employee } from "@/lib/types";
import Modal from "./Modal";

interface EmployeeIdCardModalProps {
  employee: Employee | null;
  onClose: () => void;
  onPhotoUpload: (file: File) => Promise<void>;
}

function employeeCode(id: string) {
  return `GRN-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function EmployeeIdCardModal({ employee, onClose, onPhotoUpload }: EmployeeIdCardModalProps) {
  const photoInput = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  if (!employee) return null;

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      await onPhotoUpload(file);
    } finally {
      event.target.value = "";
      setUploadingPhoto(false);
    }
  }

  return (
    <Modal isOpen={Boolean(employee)} onClose={onClose} title={`Identity Card · ${employee.full_name}`}>
      <div className="space-y-4">
        <p className="text-sm text-gray-400">This ready-to-print card uses the employee record currently saved in the portal.</p>

        <article id="employee-id-card" className="mx-auto w-full max-w-[330px] overflow-hidden rounded-[1.4rem] border border-amber-300/30 bg-[#08172a] shadow-2xl shadow-black/50">
          <div className="h-2 bg-gradient-to-r from-amber-300 via-yellow-100 to-amber-500" />
          <div className="relative p-5">
            <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-amber-300/10" />
            <div className="relative border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <Image src="/groenics-logo.png" width={38} height={38} alt="Groenics logo" className="rounded-lg border border-amber-200/20" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-200">Employee identity card</p>
                  <h3 className="mt-1 text-lg font-bold text-white">Groenics</h3>
                </div>
              </div>
            </div>

            <div className="relative mt-5 flex gap-4">
              <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} className="hidden" />
              <button type="button" onClick={() => photoInput.current?.click()} disabled={uploadingPhoto} title="Upload employee photo" className="group relative h-24 w-20 shrink-0 overflow-hidden rounded-2xl border border-amber-200/30 disabled:opacity-60">
                {employee.photo_url ? <img src={employee.photo_url} alt={employee.full_name} className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-300 to-amber-600 text-2xl font-black text-[#071426]">{initials(employee.full_name)}</span>}
                <span className="absolute inset-0 flex items-center justify-center bg-black/65 px-1 text-center text-[9px] font-bold uppercase tracking-wide text-white opacity-0 transition group-hover:opacity-100">{uploadingPhoto ? "Uploading" : "Change photo"}</span>
              </button>
              <div className="min-w-0">
                <h4 className="truncate text-xl font-bold text-white">{employee.full_name}</h4>
                <p className="mt-1 text-sm font-semibold text-amber-200">{employee.role || "Team member"}</p>
                <p className="mt-0.5 text-xs text-gray-400">{employee.department || "General operations"}</p>
                <p className="mt-2 font-mono text-xs font-semibold tracking-wide text-sky-200">{employeeCode(employee.id)}</p>
              </div>
            </div>

            <dl className="relative mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/10 pt-4 text-xs">
              <div><dt className="uppercase tracking-wider text-gray-500">Phone</dt><dd className="mt-1 break-words font-medium text-gray-200">{employee.phone || "Not provided"}</dd></div>
              <div><dt className="uppercase tracking-wider text-gray-500">Email</dt><dd className="mt-1 break-all font-medium text-gray-200">{employee.email || "Not provided"}</dd></div>
              <div><dt className="uppercase tracking-wider text-gray-500">Department</dt><dd className="mt-1 font-medium text-gray-200">{employee.department || "General operations"}</dd></div>
              <div><dt className="uppercase tracking-wider text-gray-500">Employee ID</dt><dd className="mt-1 font-mono font-medium text-sky-200">{employeeCode(employee.id)}</dd></div>
            </dl>
          </div>
          <p className="border-t border-white/10 bg-black/20 px-5 py-3 text-center text-[9px] font-medium uppercase tracking-[0.16em] text-gray-500">Company property · Return if found</p>
        </article>

        <button type="button" onClick={() => window.print()} className="w-full rounded-xl bg-amber-300 py-2.5 text-sm font-bold text-black transition hover:bg-amber-200">
          Print / Save ID Card PDF
        </button>
      </div>
    </Modal>
  );
}
