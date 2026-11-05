"use client";
import { useState } from "react";
import type { Song, SongFolder, SongInput } from "@musica/contracts";
import {
  Plus,
  Search,
  Upload,
  Music2,
  Pencil,
  Check,
  FileText,
  Folder,
  Trash2,
} from "lucide-react";
import { useDashboard, useCommand, useSongAvailability } from "@/lib/queries";
import { useLocale } from "@/lib/i18n";
import {
  Button,
  Modal,
  Field,
  TextArea,
  SectionTitle,
  Loading,
  ErrorNotice,
  Empty,
  Notice,
  SelectField,
  inputClass,
} from "@/components/ui";
export function SongForm({
  song,
  folders,
  defaultFolderId,
  onClose,
}: {
  song?: Song;
  folders: SongFolder[];
  defaultFolderId?: string | null;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const command = useCommand();
  const [title, setTitle] = useState(song?.title || "");
  const [artist, setArtist] = useState(song?.artist || "");
  const [folderId, setFolderId] = useState(song?.folderId ?? defaultFolderId ?? "");
  return (
    <Modal title={t(song ? "Edit song" : "Add song")} onClose={onClose}>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          command.mutate(
            {
              path: `/musician/songs${song ? "/" + song.id : ""}`,
              method: song ? "PATCH" : "POST",
              body: { title, artist, folderId: folderId || null, enabled: song?.enabled ?? true },
            },
            { onSuccess: onClose },
          );
        }}
      >
        <Field
          label={t("Title")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={150}
        />
        <Field
          label={t("Artist")}
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          required
          maxLength={120}
        />
        <SelectField
          label={t("Folder")}
          value={folderId}
          onChange={setFolderId}
          options={[{value: "", label: t("No folder")}, ...folders.map((folder) => ({value: folder.id, label: folder.name}))]}
        />
        <ErrorNotice error={command.error} />
        <Button type="submit" className="w-full" busy={command.isPending}>
          {t(song ? "Save changes" : "Add song")}
        </Button>
      </form>
    </Modal>
  );
}
function ImportDialog({ folders, defaultFolderId, onClose }: { folders: SongFolder[]; defaultFolderId?: string | null; onClose: () => void }) {
  const { t } = useLocale();
  const [csv, setCsv] = useState("title,artist\n");
  const [folderId, setFolderId] = useState(defaultFolderId ?? "");
  const [rows, setRows] = useState<SongInput[] | null>(null);
  const command = useCommand<{
    rows: SongInput[];
    count: number;
    added: number;
  }>();
  return (
    <Modal title={t("Import CSV")} onClose={onClose}>
      <p className="mb-4 text-xs leading-6 text-muted">
        CSV · UTF-8 · 1 MB
        <br />
        <code>title,artist</code>
      </p>
      <label className="mb-4 flex cursor-pointer items-center justify-center gap-2 rounded-control border border-dashed border-control-border p-4 text-sm">
        <Upload size={17} />
        {t("Upload CSV")}
        <input
          type="file"
          className="sr-only"
          accept=".csv,text/csv"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file && file.size < 1024 * 1024) {
              setCsv(await file.text());
              setRows(null);
            }
          }}
        />
      </label>
      <TextArea
        label="CSV"
        value={csv}
        onChange={(e) => {
          setCsv(e.target.value);
          setRows(null);
        }}
        rows={6}
      />
      <SelectField
        label={t("Import into folder")}
        value={folderId}
        onChange={setFolderId}
        className="mt-4"
        options={[{value: "", label: t("No folder")}, ...folders.map((folder) => ({value: folder.id, label: folder.name}))]}
      />
      {rows && (
        <div className="my-4 max-h-48 overflow-auto rounded-control border border-border p-3 text-xs">
          {rows.map((r, i) => (
            <p key={i} className="py-1">
              {i + 1}. {r.title} — {r.artist}
            </p>
          ))}
        </div>
      )}
      <ErrorNotice error={command.error} />
      <Button
        className="mt-5 w-full"
        busy={command.isPending}
        onClick={() =>
          rows
            ? command.mutate(
                { path: "/musician/songs/import", body: { csv, folderId: folderId || null } },
                { onSuccess: onClose },
              )
            : command.mutate(
                { path: "/musician/songs/import/preview", body: { csv } },
                { onSuccess: (data) => setRows(data.rows) },
              )
        }
      >
        {t(rows ? "Import" : "Preview")}
      </Button>
    </Modal>
  );
}
function FolderForm({ folder, onClose }: { folder?: SongFolder; onClose: () => void }) {
  const { t } = useLocale();
  const command = useCommand();
  const remove = useCommand();
  const [name, setName] = useState(folder?.name || "");
  return <Modal title={t(folder ? "Edit folder" : "New folder")} onClose={onClose}>
    <form className="space-y-5" onSubmit={(event) => {
      event.preventDefault();
      command.mutate({path: `/musician/folders${folder ? "/" + folder.id : ""}`, method: folder ? "PATCH" : "POST", body: {name}}, {onSuccess: onClose});
    }}>
      <Field label={t("Folder name")} value={name} onChange={(event) => setName(event.target.value)} required maxLength={60}/>
      <ErrorNotice error={command.error || remove.error}/>
      <Button type="submit" className="w-full" busy={command.isPending}>{t(folder ? "Save changes" : "Create folder")}</Button>
    </form>
    {folder && <div className="mt-5 border-t border-border pt-5">
      <p className="mb-3 text-xs text-muted">{t("Deleting a folder keeps its songs in All.")}</p>
      <Button variant="secondary" className="w-full" busy={remove.isPending} onClick={() => {
        if (window.confirm(t("Delete this folder?"))) remove.mutate({path: `/musician/folders/${folder.id}`, method: "DELETE"}, {onSuccess: onClose});
      }}><Trash2 size={16}/>{t("Delete folder")}</Button>
    </div>}
  </Modal>;
}
export function CatalogView() {
  const query = useDashboard();
  const command = useCommand();
  const toggle = useSongAvailability();
  const { t } = useLocale();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Song | true | null>(null);
  const [importing, setImporting] = useState(false);
  const [editingFolder, setEditingFolder] = useState<SongFolder | true | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  if (query.isPending) return <Loading />;
  if (query.error)
    return <ErrorNotice error={query.error} retry={() => query.refetch()} />;
  const folders = query.data.folders ?? [];
  const activeFolderId = folders.some(folder => folder.id === selectedFolderId) ? selectedFolderId : null;
  const songs = query.data.songs.filter((s) =>
    (activeFolderId === null || s.folderId === activeFolderId) && `${s.title} ${s.artist}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <SectionTitle
        eyebrow={`${query.data.songs.length} ${t("songs")}`}
        title={t("Repertoire")}
      >
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setImporting(true)}>
            <Upload size={16} />
            {t("Import CSV")}
          </Button>
          <Button onClick={() => setEditing(true)}>
            <Plus size={17} />
            {t("Add song")}
          </Button>
        </div>
      </SectionTitle>
      <section className="mb-6 rounded-card border border-border p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">{t("Folders")}</h3>
          <Button variant="secondary" onClick={() => setEditingFolder(true)}><Plus size={16}/>{t("New folder")}</Button>
        </div>
        {folders.length ? <div className="flex flex-wrap gap-2">
          <button aria-pressed={activeFolderId === null} onClick={() => setSelectedFolderId(null)} className={`rounded-full border px-4 py-2 text-xs font-medium ${activeFolderId === null ? "border-foreground bg-action text-action-foreground" : "border-border"}`}>{t("All")}</button>
          {folders.map(folder => <div key={folder.id} className="inline-flex overflow-hidden rounded-full border border-border">
            <button aria-label={folder.name} aria-pressed={activeFolderId === folder.id} onClick={() => setSelectedFolderId(folder.id)} className={`flex min-w-0 max-w-64 items-center gap-2 px-4 py-2 text-xs font-medium ${activeFolderId === folder.id ? "bg-action text-action-foreground" : "hover:bg-surface-hover"}`}><Folder size={14} className="shrink-0"/><span className="truncate">{folder.name}</span></button>
            <button aria-label={`${t("Edit folder")}: ${folder.name}`} onClick={() => setEditingFolder(folder)} className="border-l border-border px-3 hover:bg-surface-hover"><Pencil size={13}/></button>
          </div>)}
        </div> : <p className="text-xs text-muted">{t("No folders yet. Your songs appear together in All.")}</p>}
      </section>
      <div className="relative mb-6 max-w-lg">
        <Search size={19} className="absolute left-4 top-3.5 text-muted" />
        <input
          className={`${inputClass} pl-11`}
          aria-label={t("Search songs or artists")}
          placeholder={t("Search songs or artists")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <ErrorNotice error={command.error || toggle.error} />
      {songs.length ? (
        <div className="overflow-hidden rounded-card border border-border">
          {songs.map((song) => (
            <div
              key={song.id}
              className="flex items-center gap-3 border-b border-border p-4 last:border-0 sm:gap-5 sm:p-5"
            >
              <div className="hidden size-10 shrink-0 items-center justify-center rounded-control bg-surface-hover sm:flex">
                <Music2 size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{song.title}</p>
                <p className="mt-1 truncate text-xs text-muted">
                  {song.artist}{song.folderId && folders.some(folder => folder.id === song.folderId) && <> <span className="mx-1">·</span> {folders.find(folder => folder.id === song.folderId)?.name}</>}
                </p>
              </div>
              <button
                role="switch"
                aria-checked={song.enabled}
                aria-label={`${t("Available")}: ${song.title}`}
                disabled={toggle.isPending}
                onClick={() =>
                  toggle.mutate({ id: song.id, enabled: !song.enabled })
                }
                className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${song.enabled ? "border-foreground bg-action" : "border-border bg-surface-hover"}`}
              >
                <span
                  className={`absolute top-0.5 size-5 rounded-full bg-surface shadow transition-transform ${song.enabled ? "left-0.5 translate-x-5" : "left-0.5"}`}
                />
              </button>
              <Button
                variant="ghost"
                aria-label={`${t("Edit song")}: ${song.title}`}
                className="px-3"
                onClick={() => setEditing(song)}
              >
                <Pencil size={17} />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <Empty title={t("No songs found")} />
      )}
      {editing && (
        <SongForm
          song={editing === true ? undefined : editing}
          folders={folders}
          defaultFolderId={activeFolderId}
          onClose={() => setEditing(null)}
        />
      )}
      {importing && <ImportDialog folders={folders} defaultFolderId={activeFolderId} onClose={() => setImporting(false)} />}
      {editingFolder && <FolderForm folder={editingFolder === true ? undefined : editingFolder} onClose={() => setEditingFolder(null)}/>}
    </>
  );
}
