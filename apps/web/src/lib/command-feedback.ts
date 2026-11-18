type FeedbackKind = "success" | "info" | "error";

export interface CommandAction {
  path: string;
  body?: unknown;
  method?: string;
}

export function commandFeedback(action: CommandAction): { kind: FeedbackKind; message: string } | null {
  const method = action.method ?? "POST";
  const body = action.body && typeof action.body === "object" ? action.body as Record<string, unknown> : {};
  const feedback = (message: string, kind: FeedbackKind = "success") => ({ message, kind });

  if (action.path === "/musician/profile/media") {
    const kind = typeof FormData !== "undefined" && action.body instanceof FormData ? action.body.get("kind") : null;
    return feedback(kind === "banner" ? "Banner updated" : "Profile photo updated");
  }
  if (action.path === "/musician/profile" && method === "PATCH") return feedback("Profile updated");
  if (action.path === "/musician/songs/import/preview") return feedback("Import preview ready", "info");
  if (action.path === "/musician/songs/import") return feedback("Songs imported");
  if (action.path === "/musician/songs" && method === "POST") return feedback("Song added");
  if (/^\/musician\/songs\/[^/]+$/.test(action.path) && method === "PATCH") return feedback(Object.keys(body).length === 1 && body.enabled === true ? "Song available" : Object.keys(body).length === 1 && body.enabled === false ? "Song unavailable" : "Song updated");
  if (action.path === "/musician/folders" && method === "POST") return feedback("Folder created");
  if (/^\/musician\/folders\/[^/]+$/.test(action.path)) return feedback(method === "DELETE" ? "Folder deleted" : "Folder updated");
  if (action.path === "/musician/shows" && method === "POST") return feedback("Show created");
  if (/^\/musician\/shows\/[^/]+\/queue$/.test(action.path)) return feedback("Queue reordered");
  if (/^\/musician\/shows\/[^/]+\/action$/.test(action.path)) {
    const messages: Record<string, string> = { open: "Show opened", pause: "Requests paused", resume: "Requests resumed", finish: "Show finished" };
    return typeof body.action === "string" && messages[body.action] ? feedback(messages[body.action]) : null;
  }
  if (/^\/musician\/shows\/[^/]+$/.test(action.path) && method === "PATCH") return feedback("capacity" in body ? "Show capacity updated" : "Show updated");
  if (/^\/musician\/requests\/[^/]+\/performance$/.test(action.path)) {
    const messages: Record<string, string> = { playing: "Song started", played: "Song marked as played", not_performed: "Request marked not performed" };
    return typeof body.status === "string" && messages[body.status] ? feedback(messages[body.status]) : null;
  }
  if (/^\/requests\/[^/]+\/receipt$/.test(action.path)) return feedback("Receipt uploaded");
  if (/^\/requests\/[^/]+\/claim$/.test(action.path)) return feedback("Your request is in the queue. The transfer is not verified.");
  if (/^\/requests\/[^/]+\/cancel$/.test(action.path)) return feedback("Reservation cancelled");
  return null;
}
