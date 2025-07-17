import { Id } from "../../convex/_generated/dataModel";

interface File {
  _id: Id<"files">;
  name: string;
  size: number;
  type: string;
  url: string | null;
  _creationTime: number;
}

interface FileGridProps {
  files: File[];
  viewMode: "grid" | "list";
  onDelete: (fileId: Id<"files">) => void;
  onRename: (fileId: Id<"files">, currentName: string) => void;
}

export function FileGrid({ files, viewMode, onDelete, onRename }: FileGridProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return "🖼️";
    if (type.startsWith("video/")) return "🎥";
    if (type.startsWith("audio/")) return "🎵";
    if (type.includes("pdf")) return "📄";
    if (type.includes("word")) return "📝";
    if (type.includes("excel") || type.includes("spreadsheet")) return "📊";
    if (type.includes("powerpoint") || type.includes("presentation")) return "📽️";
    if (type.includes("zip") || type.includes("rar")) return "🗜️";
    return "📄";
  };

  const handleDownload = (file: File) => {
    if (file.url) {
      const link = document.createElement("a");
      link.href = file.url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (viewMode === "list") {
    return (
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Size</th>
              <th className="text-left p-3 font-medium">Modified</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <tr key={file._id} className="border-t hover:bg-gray-50">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getFileIcon(file.type)}</span>
                    <span className="font-medium">{file.name}</span>
                  </div>
                </td>
                <td className="p-3 text-gray-600">{formatFileSize(file.size)}</td>
                <td className="p-3 text-gray-600">
                  {new Date(file._creationTime).toLocaleDateString()}
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleDownload(file)}
                      className="p-1 rounded hover:bg-gray-200"
                      title="Download"
                    >
                      ⬇️
                    </button>
                    <button
                      onClick={() => onRename(file._id, file.name)}
                      className="p-1 rounded hover:bg-gray-200"
                      title="Rename"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => onDelete(file._id)}
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
      {files.map((file) => (
        <div
          key={file._id}
          className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow group"
        >
          <div className="text-center">
            <div className="text-4xl mb-2">{getFileIcon(file.type)}</div>
            <div className="font-medium text-sm truncate mb-1">{file.name}</div>
            <div className="text-xs text-gray-500 mb-3">
              {formatFileSize(file.size)}
            </div>
            
            <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleDownload(file)}
                className="p-1 rounded hover:bg-gray-200"
                title="Download"
              >
                ⬇️
              </button>
              <button
                onClick={() => onRename(file._id, file.name)}
                className="p-1 rounded hover:bg-gray-200"
                title="Rename"
              >
                ✏️
              </button>
              <button
                onClick={() => onDelete(file._id)}
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
