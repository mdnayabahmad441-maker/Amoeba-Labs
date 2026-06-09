"use client";

export function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="inline-block">
          <div className="w-8 h-8 border-4 border-amber-300/30 border-t-amber-300 rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-400 mt-4">Loading...</p>
      </div>
    </div>
  );
}

interface ErrorStateProps {
  message?: string;
}

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <p className="text-red-400">{message || "An error occurred"}</p>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon?: string;
  title?: string;
  description?: string;
}

export function EmptyState({
  icon = "📭",
  title = "No data",
  description = "Get started by creating your first item",
}: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="text-6xl mb-4">{icon}</div>
        <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
        <p className="text-gray-400">{description}</p>
      </div>
    </div>
  );
}
