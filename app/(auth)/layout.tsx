export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-dvh flex-col bg-neutral-100 text-neutral-900 antialiased">
      <h1>Auth layout</h1>
      <main className="flex-1 overflow-y-auto p-4">{children}</main>
    </div>
  );
}
