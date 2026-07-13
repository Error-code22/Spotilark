"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  Music,
  Video,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";

interface DownloadTask {
  id: string;
  url: string;
  format: "audio" | "video";
  status: "queued" | "downloading" | "uploading" | "completed" | "failed";
  progress: number;
  title?: string;
  thumbnail?: string;
  error?: string;
  trackId?: string;
}

export function DownloadManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<"audio" | "video">("audio");
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const { refetchTracks } = usePlayer();

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/download");
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchTasks();
    }
  }, [isOpen, fetchTasks]);

  useEffect(() => {
    const activeTasks = tasks.filter(
      (t) =>
        t.status === "downloading" ||
        t.status === "uploading" ||
        t.status === "queued"
    );
    if (activeTasks.length === 0) return;

    const interval = setInterval(fetchTasks, 2000);
    return () => clearInterval(interval);
  }, [tasks, fetchTasks]);

  useEffect(() => {
    const completedTasks = tasks.filter((t) => t.status === "completed");
    if (completedTasks.length > 0) {
      refetchTracks();
    }
  }, [tasks, refetchTracks]);

  const startDownload = async () => {
    if (!url.trim()) return;

    setIsStarting(true);
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), format }),
      });

      if (res.ok) {
        setUrl("");
        await fetchTasks();
      }
    } catch {}
    setIsStarting(false);
  };

  const removeTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const getStatusIcon = (status: DownloadTask["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "downloading":
      case "uploading":
      case "queued":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Download className="h-5 w-5 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>YouTube Downloader</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="youtube-url">YouTube URL</Label>
            <Input
              id="youtube-url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && url.trim()) {
                  startDownload();
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Format</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={format === "audio" ? "default" : "outline"}
                size="sm"
                onClick={() => setFormat("audio")}
                className="flex-1"
              >
                <Music className="h-4 w-4 mr-2" />
                Audio (MP3)
              </Button>
              <Button
                type="button"
                variant={format === "video" ? "default" : "outline"}
                size="sm"
                onClick={() => setFormat("video")}
                className="flex-1"
              >
                <Video className="h-4 w-4 mr-2" />
                Video (MP4)
              </Button>
            </div>
          </div>

          <Button
            onClick={startDownload}
            disabled={!url.trim() || isStarting}
            className="w-full"
          >
            {isStarting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download
          </Button>
        </div>

        {tasks.length > 0 && (
          <div className="mt-4 space-y-3 max-h-64 overflow-y-auto">
            <Label>Downloads</Label>
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card"
              >
                {task.thumbnail ? (
                  <img
                    src={task.thumbnail}
                    alt=""
                    className="w-12 h-12 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    {task.format === "audio" ? (
                      <Music className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Video className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(task.status)}
                    <p className="font-medium text-sm truncate">
                      {task.title || task.url}
                    </p>
                  </div>

                  {task.status === "failed" && task.error && (
                    <p className="text-xs text-red-500 mt-1">{task.error}</p>
                  )}

                  {(task.status === "downloading" ||
                    task.status === "uploading" ||
                    task.status === "queued") && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>
                          {task.status === "downloading"
                            ? "Downloading..."
                            : task.status === "uploading"
                            ? "Uploading..."
                            : "Queued..."}
                        </span>
                        <span>{task.progress}%</span>
                      </div>
                      <Progress value={task.progress} className="h-1.5" />
                    </div>
                  )}

                  {task.status === "completed" && (
                    <p className="text-xs text-green-500 mt-1">
                      Added to library
                    </p>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={() => removeTask(task.id)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
