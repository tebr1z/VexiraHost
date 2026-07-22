export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <div className="admin-mesh-bg min-h-screen">{children}</div>;
}
