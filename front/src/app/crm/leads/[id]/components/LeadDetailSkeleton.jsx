/**
 * Skeleton loader que reflete o layout final da tela.
 * Substitui o spinner genérico — usuário vê estrutura aparecer
 * imediatamente, populando depois. Reduz "perceived latency".
 */
export default function LeadDetailSkeleton() {
  return (
    <div className="max-w-[1400px] mx-auto pb-24 animate-pulse">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-3 w-20 bg-(--surface-3) rounded" />
        <div className="h-3 w-16 bg-(--surface-3) rounded" />
        <div className="h-3 w-12 bg-(--surface-3) rounded" />
      </div>

      {/* Header */}
      <div className="border-b border-(--border-subtle) py-3 mb-6 flex items-center gap-4">
        <div className="w-12 h-12 bg-(--surface-3) rounded-2xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-48 bg-(--surface-3) rounded" />
          <div className="h-3 w-64 bg-(--surface-3) rounded" />
        </div>
        <div className="w-32 h-9 bg-(--surface-3) rounded-2xl" />
        <div className="w-9 h-9 bg-(--surface-3) rounded-2xl" />
      </div>

      {/* Main + Aside */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 bg-(--surface-2) border border-(--border-subtle) rounded-3xl p-6 space-y-6">
          {[1, 2, 3].map((section) => (
            <div key={section} className="space-y-3">
              <div className="h-4 w-40 bg-(--surface-3) rounded" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-(--surface-3) rounded" />
                  <div className="h-9 bg-(--surface-3) rounded-2xl" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-20 bg-(--surface-3) rounded" />
                  <div className="h-9 bg-(--surface-3) rounded-2xl" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="xl:col-span-4 space-y-4">
          {[1, 2, 3].map((card) => (
            <div key={card} className="bg-(--surface-2) border border-(--border-subtle) rounded-2xl p-4 space-y-3">
              <div className="h-3 w-24 bg-(--surface-3) rounded" />
              <div className="h-12 bg-(--surface-3) rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
