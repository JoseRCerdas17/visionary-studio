export default function LocationButton() {
  return (
    <a
      href="https://maps.app.goo.gl/zcfrCQAJDv4KLDfb9"
      target="_blank"
      className="fixed bottom-24 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 group"
      style={{ backgroundColor: "#D4A017" }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-7 h-7">
        <path
          fillRule="evenodd"
          d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.07-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-2.079 3.218-4.407 3.218-6.484C19.508 6.95 16.092 3.5 12 3.5c-4.093 0-7.508 3.45-7.508 7.843 0 2.077 1.274 4.405 3.218 6.484a19.58 19.58 0 002.683 2.282c.392.28.783.527 1.147.742zM12 13.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"
          clipRule="evenodd"
        />
      </svg>
      <span className="absolute right-16 bg-black text-white text-xs px-3 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        Ver ubicación
      </span>
    </a>
  );
}
