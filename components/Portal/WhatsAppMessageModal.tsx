"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Modal from "./Modal";
import { FormSelect, FormTextarea } from "./FormInputs";

interface WhatsAppMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSent?: () => void;
  ventureId: string;
  contactName: string;
  phone?: string | null;
  clientId?: string;
  leadId?: string;
  defaultMessageType?: string;
  initialMessage?: string;
}

const messageTypes = [
  {
    value: "task",
    label: "Task Handover",
    template:
      "Hi {{name}}, this is Nayab from Groenics. I am handing over a task to you. Please check the details and update me once it is done.",
  },
  {
    value: "followup",
    label: "Follow-up",
    template:
      "Hi {{name}}, this is Nayab from Groenics. Just following up on our discussion. Let me know a good time to connect.",
  },
  {
    value: "proposal",
    label: "Proposal Reminder",
    template:
      "Hi {{name}}, this is Nayab from Groenics. Sharing a quick reminder about the proposal we discussed. I would be happy to clarify anything.",
  },
  {
    value: "payment",
    label: "Payment Reminder",
    template:
      "Hi {{name}}, this is Nayab from Groenics. This is a gentle reminder regarding the pending payment. Please let me know if you need the invoice again.",
  },
  {
    value: "marketing",
    label: "Marketing",
    template:
      "Hi {{name}}, Groenics helps businesses find workflow problems and solve them with AI, automation, and software. Would you like a free assessment?",
  },
  {
    value: "custom",
    label: "Custom",
    template: "",
  },
];

function personalize(template: string, contactName: string) {
  return template.replaceAll("{{name}}", contactName);
}

function toWhatsAppNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 10) {
    return `91${digits}`;
  }

  return digits;
}

export default function WhatsAppMessageModal({
  isOpen,
  onClose,
  onSent,
  ventureId,
  contactName,
  phone,
  clientId,
  leadId,
  defaultMessageType = "followup",
  initialMessage,
}: WhatsAppMessageModalProps) {
  const defaultType = messageTypes.find((type) => type.value === defaultMessageType) || messageTypes[0];
  const [messageType, setMessageType] = useState(defaultType.value);
  const [message, setMessage] = useState(initialMessage || personalize(defaultType.template, contactName));
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setTimeout(() => {
      const selected = messageTypes.find((type) => type.value === defaultMessageType) || messageTypes[0];
      setMessageType(selected.value);
      setMessage(initialMessage || personalize(selected.template, contactName));
      setError("");
      setSuccess("");
    }, 0);

    return () => window.clearTimeout(timer);
  }, [contactName, defaultMessageType, initialMessage, isOpen]);

  function handleTypeChange(value: string) {
    setMessageType(value);
    const selected = messageTypes.find((type) => type.value === value);
    if (selected && selected.value !== "custom") {
      setMessage(personalize(selected.template, contactName));
    }
  }

  async function logFollowup(sentMessage: string) {
    if (!ventureId) return;

    const today = new Date().toISOString().split("T")[0];
    await supabase.from("followups").insert([
      {
        venture_id: ventureId,
        client_id: clientId || null,
        lead_id: leadId || null,
        type: "WhatsApp",
        notes: sentMessage,
        follow_up_date: today,
        next_follow_up: null,
        status: "Done",
      },
    ]);
  }

  async function handleOpenWhatsApp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!phone) {
      setError("This contact does not have a phone number.");
      return;
    }

    const whatsappNumber = toWhatsAppNumber(phone);

    if (!whatsappNumber || whatsappNumber.length < 10) {
      setError("This contact phone number is not valid for WhatsApp.");
      return;
    }

    setOpening(true);

    try {
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
      const opened = window.open(whatsappUrl, "_blank", "noopener,noreferrer");

      if (!opened) {
        window.location.href = whatsappUrl;
      }

      await logFollowup(`WhatsApp opened manually: ${message}`);
      setSuccess("WhatsApp opened with the message filled. Press Send in WhatsApp to deliver it.");
      onSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open WhatsApp.");
    } finally {
      setOpening(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Open WhatsApp - ${contactName}`}>
      <form onSubmit={handleOpenWhatsApp} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-green-500/25 bg-green-500/10 px-3 py-2 text-sm text-green-300">
            {success}
          </div>
        )}

        <div className="rounded-lg border border-amber-300/10 bg-black/20 px-3 py-2 text-sm text-gray-300">
          Opening chat with: <span className="font-semibold text-white">{phone || "No phone number"}</span>
        </div>

        <FormSelect
          label="Message Type"
          value={messageType}
          onChange={(e) => handleTypeChange(e.target.value)}
          options={messageTypes.map((type) => ({ value: type.value, label: type.label }))}
        />
        <FormTextarea
          label="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          placeholder="Write your WhatsApp message..."
          required
        />
        <p className="text-xs leading-relaxed text-gray-500">
          This opens WhatsApp or WhatsApp Business with the message filled. You will press Send there manually.
        </p>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <button
            type="submit"
            disabled={opening}
            className="flex-1 rounded-xl bg-green-400 py-2.5 text-sm font-bold text-black transition hover:bg-green-300 disabled:bg-green-400/40"
          >
            {opening ? "Opening..." : "Open WhatsApp"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-white/8 py-2.5 text-sm font-medium text-white transition hover:bg-white/12"
          >
            Close
          </button>
        </div>
      </form>
    </Modal>
  );
}
