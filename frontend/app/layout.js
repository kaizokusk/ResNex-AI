import "./globals.css";

export const metadata = {
  title: "ResNex AI — Collaborative Research Workspace",
  description: "AI-native collaborative research workspace for teams",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true} className="antialiased">
        {children}
      </body>
    </html>
  );
}