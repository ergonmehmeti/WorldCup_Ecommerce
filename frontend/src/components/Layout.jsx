import Navbar from './Navbar';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-dark-950 relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Purple glow - top left */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-purple-600/10 rounded-full blur-[128px]" />
        {/* Pink glow - bottom right */}
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-brand-pink-600/10 rounded-full blur-[128px]" />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <Navbar />

      {/* Main Content */}
      <main className="relative pt-16">
        {children}
      </main>
    </div>
  );
}
