import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function ActivityPanel() {
  const activities = useQuery(api.activities.getUserActivities, { limit: 50 });

  const getActivityIcon = (action: string) => {
    switch (action) {
      case "upload": return "⬆️";
      case "download": return "⬇️";
      case "delete": return "🗑️";
      case "rename": return "✏️";
      case "share": return "🔗";
      case "create_folder": return "📁";
      case "delete_folder": return "🗑️";
      case "rename_folder": return "✏️";
      case "share_folder": return "🔗";
      default: return "📄";
    }
  };

  const getActivityDescription = (activity: any) => {
    const action = activity.action.replace("_", " ");
    return `${action.charAt(0).toUpperCase() + action.slice(1)} "${activity.targetName}"`;
  };

  if (!activities) {
    return (
      <div className="p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Recent Activity</h3>
      </div>
      
      <div className="flex-1 overflow-auto">
        {activities.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No recent activity
          </div>
        ) : (
          <div className="space-y-1">
            {activities.map((activity) => (
              <div key={activity._id} className="p-3 hover:bg-gray-50 border-b">
                <div className="flex items-start gap-3">
                  <span className="text-lg">{getActivityIcon(activity.action)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {getActivityDescription(activity)}
                    </p>
                    {activity.details && (
                      <p className="text-xs text-gray-500 mt-1">
                        {activity.details}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(activity._creationTime).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
