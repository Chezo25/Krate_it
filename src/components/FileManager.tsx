import { useState, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { FileGrid } from "./FileGrid";
import { FolderGrid } from "./FolderGrid";
import { Breadcrumb } from "./Breadcrumb";
import { SearchBar } from "./SearchBar";
import { UploadArea } from "./UploadArea";
import { ActivityPanel } from "./ActivityPanel";

export function FileManager() {
  const [currentFolderId, setCurrentFolderId] = useState<Id<"folders"> | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [showActivities, setShowActivities] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const folders = useQuery(api.folders.getFolders, { parentId: currentFolderId });
  const files = useQuery(api.files.getFiles, { folderId: currentFolderId });
  const folderPath = useQuery(api.folders.getFolderPath, { folderId: currentFolderId });
  const searchResults = useQuery(
    api.files.searchFiles,
    searchQuery ? { query: searchQuery } : "skip"
  );
  const folderSearchResults = useQuery(
    api.folders.searchFolders,
    searchQuery ? { query: searchQuery } : "skip"
  );

  const createFolder = useMutation(api.folders.createFolder);
  const deleteFolder = useMutation(api.folders.deleteFolder);
  const renameFolder = useMutation(api.folders.renameFolder);
  const deleteFile = useMutation(api.files.deleteFile);
  const renameFile = useMutation(api.files.renameFile);

  const handleCreateFolder = async () => {
    const name = prompt("Enter folder name:");
    if (name) {
      try {
        await createFolder({ name, parentId: currentFolderId });
        toast.success("Folder created successfully");
      } catch (error) {
        toast.error("Failed to create folder");
      }
    }
  };

  const handleDeleteFolder = async (folderId: Id<"folders">) => {
    if (confirm("Are you sure you want to delete this folder and all its contents?")) {
      try {
        await deleteFolder({ folderId });
        toast.success("Folder deleted successfully");
      } catch (error) {
        toast.error("Failed to delete folder");
      }
    }
  };

  const handleRenameFolder = async (folderId: Id<"folders">, currentName: string) => {
    const newName = prompt("Enter new folder name:", currentName);
    if (newName && newName !== currentName) {
      try {
        await renameFolder({ folderId, newName });
        toast.success("Folder renamed successfully");
      } catch (error) {
        toast.error("Failed to rename folder");
      }
    }
  };

  const handleDeleteFile = async (fileId: Id<"files">) => {
    if (confirm("Are you sure you want to delete this file?")) {
      try {
        await deleteFile({ fileId });
        toast.success("File deleted successfully");
      } catch (error) {
        toast.error("Failed to delete file");
      }
    }
  };

  const handleRenameFile = async (fileId: Id<"files">, currentName: string) => {
    const newName = prompt("Enter new file name:", currentName);
    if (newName && newName !== currentName) {
      try {
        await renameFile({ fileId, newName });
        toast.success("File renamed successfully");
      } catch (error) {
        toast.error("Failed to rename file");
      }
    }
  };

  const isSearching = searchQuery.length > 0;
  const displayFolders = isSearching ? folderSearchResults || [] : folders || [];
  const displayFiles = isSearching ? searchResults || [] : files || [];

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b p-4">
          <div className="flex items-center justify-between mb-4">
            <Breadcrumb 
              path={folderPath || []} 
              onNavigate={setCurrentFolderId}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                className="p-2 rounded hover:bg-gray-100"
                title={`Switch to ${viewMode === "grid" ? "list" : "grid"} view`}
              >
                {viewMode === "grid" ? "☰" : "⊞"}
              </button>
              <button
                onClick={() => setShowActivities(!showActivities)}
                className="p-2 rounded hover:bg-gray-100"
                title="Show activities"
              >
                📊
              </button>
              <button
                onClick={handleCreateFolder}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                New Folder
              </button>
            </div>
          </div>
          
          <SearchBar 
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search files and folders..."
          />
        </div>

        {/* Upload Area */}
        <UploadArea currentFolderId={currentFolderId} />

        {/* Content */}
        <div className="flex-1 p-4 overflow-auto">
          {isSearching && (
            <div className="mb-4 text-sm text-gray-600">
              Showing results for "{searchQuery}"
            </div>
          )}
          
          <div className="space-y-6">
            {displayFolders.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Folders</h3>
                <FolderGrid
                  folders={displayFolders}
                  viewMode={viewMode}
                  onOpen={setCurrentFolderId}
                  onDelete={handleDeleteFolder}
                  onRename={handleRenameFolder}
                />
              </div>
            )}
            
            {displayFiles.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Files</h3>
                <FileGrid
                  files={displayFiles}
                  viewMode={viewMode}
                  onDelete={handleDeleteFile}
                  onRename={handleRenameFile}
                />
              </div>
            )}
            
            {displayFolders.length === 0 && displayFiles.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                {isSearching ? "No results found" : "This folder is empty"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity Panel */}
      {showActivities && (
        <div className="w-80 border-l bg-white">
          <ActivityPanel />
        </div>
      )}
    </div>
  );
}
