import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MediaPicker } from "./MediaPicker";

interface FieldEditorProps {
  field: {
    id: string;
    fieldKey: string;
    fieldType: string;
    label: string;
    draftValue: string | null;
  };
  onSave: (value: string | null) => void;
  saving: boolean;
}

export function FieldEditor({ field, onSave, saving }: FieldEditorProps) {
  const [draft, setDraft] = useState(field.draftValue ?? "");

  return (
    <div className="grid gap-2">
      <Label>
        {field.label} <span className="text-xs text-muted-foreground">({field.fieldKey})</span>
      </Label>

      {field.fieldType === "text" && (
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} />
      )}
      {field.fieldType === "textarea" && (
        <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} />
      )}
      {field.fieldType === "image" && (
        <MediaPicker
          value={draft}
          onChange={setDraft}
          altTextKey={field.fieldKey}
        />
      )}
      {/* richtext and link variants follow the same pattern */}

      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          disabled={saving || draft === (field.draftValue ?? "")}
          onClick={() => onSave(draft || null)}
        >
          {saving ? "Saving..." : "Save draft"}
        </Button>
      </div>
    </div>
  );
}
