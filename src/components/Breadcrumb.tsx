import { Id } from "../../convex/_generated/dataModel";

interface BreadcrumbItem {
  _id: Id<"folders"> | null;
  name: string;
  path: string;
}

interface BreadcrumbProps {
  path: BreadcrumbItem[];
  onNavigate: (folderId: Id<"folders"> | undefined) => void;
}

export function Breadcrumb({ path, onNavigate }: BreadcrumbProps) {
  return (
    <nav className="flex items-center space-x-2 text-sm">
      {path.map((item, index) => (
        <div key={item._id || "root"} className="flex items-center">
          {index > 0 && <span className="mx-2 text-gray-400">/</span>}
          <button
            onClick={() => onNavigate(item._id || undefined)}
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            {item.name}
          </button>
        </div>
      ))}
    </nav>
  );
}
