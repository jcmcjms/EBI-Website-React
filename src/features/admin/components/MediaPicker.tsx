import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface MediaPickerProps {
  value: string;
  onChange: (url: string) => void;
  altTextKey?: string;
}

export function MediaPicker({ value, onChange, altTextKey }: MediaPickerProps) {
  const [open, setOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const mediaQuery = useQuery({
    queryKey: ["media"],
    queryFn: async () => {
      const res = await api.GET("/api/media", { params: { query: { pageSize: 50 } } });
      return res.data;
    },
    enabled: open,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.POST("/api/media", { body: formData as unknown as { file: Blob } });
      if (res.error) throw new Error("Upload failed");
      return res.data;
    },
    onSuccess: (data) => {
      onChange(data.url);
      setUploadFile(null);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex gap-2">
        {value && (
          <div className="relative w-20 h-20 border rounded-md overflow-hidden">
            <img src={value} alt={altTextKey} className="w-full h-full object-cover" />
          </div>
        )}
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            {value ? "Change image" : "Select image"}
          </Button>
        </DialogTrigger>
      </div>

      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Media Library</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload section */}
          <div className="space-y-2">
            <Label>Upload new file</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            />
            {uploadFile && (
              <Button
                size="sm"
                onClick={() => uploadMutation.mutate(uploadFile)}
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? "Uploading..." : "Upload"}
              </Button>
            )}
          </div>

          {/* Media grid */}
          {mediaQuery.isLoading && <p>Loading...</p>}
          {mediaQuery.data && (
            <div className="grid grid-cols-4 gap-2">
              {mediaQuery.data.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onChange(item.url);
                    setOpen(false);
                  }}
                  className={`relative w-full h-20 border-2 rounded-md overflow-hidden ${
                    value === item.url ? "border-primary" : "border-transparent"
                  }`}
                >
                  <img
                    src={item.url}
                    alt={item.fileName}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
