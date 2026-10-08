"use client";

interface WhatsAppButtonProps {
  phoneNumber?: string;
  defaultMessage?: string;
}

export default function WhatsAppButton({
  phoneNumber = "254786530713",
  defaultMessage = "Hi Book A Chef, I'd like to inquire about booking a private chef experience.",
}: WhatsAppButtonProps) {
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(defaultMessage)}`;

  return (
    <aside
      aria-label="Contact concierge on WhatsApp"
      className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 flex items-center group"
    >
      {/* Tooltip on hover */}
      <span className="hidden sm:inline-block mr-3 px-3.5 py-1.5 rounded-full bg-forest-950/90 backdrop-blur-md text-white text-xs font-bold shadow-xl border border-forest-800 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
        Chat with us on WhatsApp <span className="text-emerald-400 font-mono text-[11px] ml-1">+254 786 530 713</span>
      </span>

      {/* Floating Action Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Book A Chef on WhatsApp (+254 786 530 713)"
        className="relative flex items-center justify-center h-14 w-14 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 border-2 border-white/40"
      >
        {/* Subtle pulsing ping ring */}
        <span className="absolute -inset-1 rounded-full bg-[#25D366] opacity-30 animate-ping pointer-events-none" />

        {/* WhatsApp SVG Icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-7 w-7 relative z-10"
        >
          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.17 8.17 0 0 1 2.41 5.82c0 4.54-3.7 8.24-8.24 8.24-1.42 0-2.82-.37-4.06-1.07l-.29-.17-3.12.82.83-3.04-.19-.3a8.21 8.21 0 0 1-1.26-4.48c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.59c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.25-1.49-1.4-1.74-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43l-.48-.01c-.17 0-.44.06-.67.31-.23.25-.87.85-.87 2.08 0 1.22.89 2.41 1.02 2.58.13.17 1.76 2.68 4.26 3.76.59.26 1.06.41 1.42.53.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.17-.48-.29z" />
        </svg>
      </a>
    </aside>
  );
}
