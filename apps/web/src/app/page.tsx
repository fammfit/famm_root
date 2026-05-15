export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white">
      <div className="max-w-2xl w-full space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            FAMM
          </h1>
          <p className="text-lg text-gray-500">
            Multi-Tenant Marketplace Operating System
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {(
            [
              ["API Health", "/api/health"],
              ["Register", "/api/v1/auth/register"],
              ["Login", "/api/v1/auth/login"],
              ["Tenants", "/api/v1/tenants"],
            ] as [string, string][]
          ).map(([label, path]) => (
            <div
              key={path}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-200"
            >
              <span className="font-medium">{label}</span>
              <span className="text-gray-400 font-mono text-xs">{path}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
