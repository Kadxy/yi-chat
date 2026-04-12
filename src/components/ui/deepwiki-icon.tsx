export function DeepWikiIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Hexagonal honeycomb pattern matching DeepWiki brand */}
      <path d="M17 6l5.2 3v6L17 18l-5.2-3V9L17 6z" fill="#5B8DEF" />
      <path d="M29 6l5.2 3v6L29 18l-5.2-3V9L29 6z" fill="#4ECDC4" />
      <path d="M11 17l5.2 3v6L11 29l-5.2-3v-6L11 17z" fill="#7C6FDB" />
      <path d="M23 17l5.2 3v6L23 29l-5.2-3v-6L23 17z" fill="#45B7D1" />
      <path d="M35 17l5.2 3v6L35 29l-5.2-3v-6L35 17z" fill="#6DD5A0" />
      <path d="M17 28l5.2 3v6L17 40l-5.2-3v-6L17 28z" fill="#A78BFA" />
      <path d="M29 28l5.2 3v6L29 40l-5.2-3v-6L29 28z" fill="#34D399" />
    </svg>
  );
}
