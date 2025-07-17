import { Id } from "../../convex/_generated/dataModel";

interface Folder {
  _id: Id<"folders">;
  name: string;
  _creationTime: number;
}

interface FolderGridProps {
  folders: Folder[];
  viewMode: "grid" | "list";
  onOpen: (folderId: Id<"folders">) => void;
  onDelete: (folderId: Id<"folders">) => void;
  onRename: (folderId: Id<"folders">, currentName: string) => void;
}

export function FolderGrid({ folders, viewMode, onOpen, onDelete, onRename }: FolderGridProps) {
  if (viewMode === "list") {
    return (
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Modified</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {folders.map((folder) => (
              <tr key={folder._id} className="border-t hover:bg-gray-50">
                <td className="p-3">
                  <div 
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => onOpen(folder._id)}
                  >
                    <span className="text-2xl">📁</span>
                    <span className="font-medium">{folder.name}</span>
                  </div>
                </td>
                <td className="p-3 text-gray-600">
                  {new Date(folder._creationTime).toLocaleDateString()}
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onRename(folder._id, folder.name)}
                      className="p-1 rounded hover:bg-gray-200"
                      title="Rename"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => onDelete(folder._id)}
                      className="p-1 rounded hover:bg-red-100 text-red-600"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {folders.map((folder) => (
        <div
          key={folder._id}
          className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow group cursor-pointer"
          onClick={() => onOpen(folder._id)}
        >
          <div className="text-center">
            <div className="text-4xl mb-2">📁</div>
            <div className="font-medium text-sm truncate mb-3">{folder.name}</div>
            
            <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRename(folder._id, folder.name);
                }}
                className="p-1 rounded hover:bg-gray-200"
                title="Rename"
              >
                ✏️
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(folder._id);
                }}
                className="p-1 rounded hover:bg-red-100 text-red-600"
                title="Delete"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
