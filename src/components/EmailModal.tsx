import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { track } from "../lib/track";

interface EmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where messages should end up; used for the mailto: fallback. */
  contactEmail: string;
}

const EmailModal: React.FC<EmailModalProps> = ({ open, onOpenChange, contactEmail }) => {
  const [form, setForm] = useState({ email: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const finish = () => {
    setSent(true);
    track("email_sent");
    setTimeout(() => {
      onOpenChange(false);
      setSent(false);
      setForm({ email: "", message: "" });
    }, 2000);
  };

  /** If the server can't take the message, hand it to the visitor's mail app instead of lying. */
  const mailtoFallback = () => {
    const subject = encodeURIComponent("Hello from amannajeeb.in");
    const body = encodeURIComponent(`${form.message}\n\n— ${form.email}`);
    window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${body}`;
    toast.info("Opening your email app — the message is pre-filled.");
    onOpenChange(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        toast.success("Message sent! I'll get back to you soon.");
        finish();
      } else if (res.status === 429) {
        toast.error("Too many messages — please try again in a bit.");
      } else if (res.status === 400) {
        toast.error(data.error || "Please check your email and message.");
      } else {
        mailtoFallback();
      }
    } catch (err) {
      console.error(err);
      mailtoFallback();
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="sm:max-w-[500px] w-[90vw] p-6 bg-black text-white border-2 border-white rounded-[2rem] shadow-2xl font-mono relative"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={20} />
            </button>
            <div className="mb-4 text-left">
              <h2 className="text-xl font-bold">Drop me a line</h2>
              <p className="text-gray-400">I usually reply within 24 hours.</p>
            </div>
            {sent ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center">
                  <Check className="w-8 h-8" strokeWidth={3} />
                </div>
                <p className="text-lg font-medium">Message Sent!</p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2 text-left">
                  <label htmlFor="email" className="text-white">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                    className="w-full bg-black border border-white/50 focus:border-white text-white placeholder:text-gray-600 rounded-xl px-3 py-2 focus:outline-none"
                  />
                </div>
                <div className="space-y-2 text-left">
                  <label htmlFor="message" className="text-white">
                    Message
                  </label>
                  <textarea
                    id="message"
                    required
                    placeholder="What's on your mind?"
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm((s) => ({ ...s, message: e.target.value }))}
                    className="w-full bg-black border border-white/50 focus:border-white text-white placeholder:text-gray-600 rounded-xl px-3 py-2 focus:outline-none resize-none"
                  />
                </div>
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={sending}
                    className="bg-white text-black hover:bg-gray-200 rounded-full px-8 font-bold py-2 disabled:opacity-60 cursor-pointer inline-flex items-center justify-center"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Send"
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EmailModal;
