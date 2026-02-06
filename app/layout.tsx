import './globals.css';

export const metadata = {
  title: 'VibeScript MVP',
  description: 'Generate scripts + image prompts + music prompts',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
