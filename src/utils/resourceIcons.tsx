import { ExternalLink, FileText, Video, Link as LinkIcon, Image } from "lucide-react";

/**
 * Returns the appropriate icon component for a given resource type.
 * Centralizes icon logic previously duplicated in AdminDashboard, StudentDashboard,
 * StudentTopics, and GlobalTopicsManager.
 */
export function getResourceIcon(type: string) {
  switch (type) {
    case "video":
      return <Video className="h-4 w-4" />;
    case "pdf":
    case "document":
      return <FileText className="h-4 w-4" />;
    case "link":
      return <LinkIcon className="h-4 w-4" />;
    case "image":
      return <Image className="h-4 w-4" />;
    default:
      return <ExternalLink className="h-4 w-4" />;
  }
}
