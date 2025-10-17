import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Upload,
  Link as LinkIcon,
  FileText,
  Globe,
  Youtube,
  ClipboardPaste,
  Loader2,
} from "lucide-react";

interface AddSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSourceAdded: (ids: string[]) => void;
}

export const AddSourceDialog = ({ open, onOpenChange, onSourceAdded }: AddSourceDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fileUploadProgress, setFileUploadProgress] = useState(0);

  // Form states
  const [linkUrl, setLinkUrl] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [pastedTitle, setPastedTitle] = useState("");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const createdIds: string[] = [];
      for (const file of Array.from(files)) {
        const fileExt = file.name.split(".").pop()?.toLowerCase();
        let sourceType = "pdf";
        
        if (fileExt === "txt") sourceType = "text";
        else if (fileExt === "md") sourceType = "markdown";
        else if (["mp3", "wav", "m4a"].includes(fileExt || "")) sourceType = "audio";

        // Read file content for text files
        let content = null as string | null;
        if (["txt", "md"].includes(fileExt || "")) {
          content = await file.text();
        }

        const { data, error } = await supabase
          .from("notebook_sources")
          .insert({
            user_id: user.id,
            source_type: sourceType,
            title: file.name,
            content,
            metadata: {
              file_size: file.size,
              file_type: file.type,
            },
          })
          .select("id")
          .single();

        if (error) throw error;
        if (data?.id) createdIds.push(data.id);
      }

      toast({
        title: "Sources added",
        description: `${files.length} ${files.length === 1 ? "file" : "files"} uploaded successfully`,
      });

      onSourceAdded(createdIds);
      onOpenChange(false);
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setFileUploadProgress(0);
    }
  };

  const handleLinkSubmit = async () => {
    if (!linkUrl.trim()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const isYoutube = linkUrl.includes("youtube.com") || linkUrl.includes("youtu.be");
      const sourceType = isYoutube ? "youtube" : "website";

      const { data, error } = await supabase
        .from("notebook_sources")
        .insert({
          user_id: user.id,
          source_type: sourceType,
          title: linkUrl,
          external_url: linkUrl,
          metadata: { url: linkUrl },
        })
        .select("id")
        .single();

      if (error) throw error;

      toast({
        title: "Source added",
        description: "Link added successfully",
      });

      setLinkUrl("");
      onSourceAdded(data?.id ? [data.id] : []);
      onOpenChange(false);
    } catch (error) {
      console.error("Link error:", error);
      toast({
        title: "Failed to add link",
        description: error instanceof Error ? error.message : "Failed to add link",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePastedTextSubmit = async () => {
    if (!pastedText.trim() || !pastedTitle.trim()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("notebook_sources")
        .insert({
          user_id: user.id,
          source_type: "pasted_text",
          title: pastedTitle,
          content: pastedText,
        })
        .select("id")
        .single();

      if (error) throw error;

      toast({
        title: "Source added",
        description: "Text added successfully",
      });

      setPastedText("");
      setPastedTitle("");
      onSourceAdded(data?.id ? [data.id] : []);
      onOpenChange(false);
    } catch (error) {
      console.error("Paste error:", error);
      toast({
        title: "Failed to add text",
        description: error instanceof Error ? error.message : "Failed to add text",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Add Sources</DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Examples: marketing plans, course reading, research notes, meeting transcripts, sales documents, etc.
          </p>
        </DialogHeader>

        <Tabs defaultValue="upload" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="link">
              <LinkIcon className="h-4 w-4 mr-2" />
              Link
            </TabsTrigger>
            <TabsTrigger value="paste">
              <ClipboardPaste className="h-4 w-4 mr-2" />
              Paste Text
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-12 text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Upload sources</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Drag & drop or choose file to upload
              </p>
              <Input
                type="file"
                multiple
                accept=".pdf,.txt,.md,.mp3,.wav,.m4a"
                onChange={handleFileUpload}
                disabled={loading}
                className="hidden"
                id="file-upload"
              />
              <Label htmlFor="file-upload">
                <Button variant="outline" disabled={loading} asChild>
                  <span>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      "Choose Files"
                    )}
                  </span>
                </Button>
              </Label>
              <p className="text-xs text-muted-foreground mt-4">
                Supported file types: PDF, .txt, Markdown, Audio (e.g. mp3)
              </p>
            </div>
          </TabsContent>

          <TabsContent value="link" className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="h-20 flex-col gap-2" disabled>
                  <Globe className="h-6 w-6" />
                  Website
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-2" disabled>
                  <Youtube className="h-6 w-6" />
                  YouTube
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Enter URL</Label>
                <Input
                  placeholder="https://example.com or youtube.com/watch?v=..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button
                onClick={handleLinkSubmit}
                disabled={loading || !linkUrl.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Link"
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="paste" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  placeholder="Give your text a title"
                  value={pastedTitle}
                  onChange={(e) => setPastedTitle(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  placeholder="Paste your text here..."
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  disabled={loading}
                  rows={10}
                />
              </div>
              <Button
                onClick={handlePastedTextSubmit}
                disabled={loading || !pastedText.trim() || !pastedTitle.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Text"
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
