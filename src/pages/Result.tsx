import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, Check, BarChart3, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const Result = () => {
  const { shortId } = useParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const shortUrl = `${window.location.origin}/${shortId}`;

  useEffect(() => {
    const fetchLink = async () => {
      if (!shortId) return;
      
      const { data, error } = await supabase
        .from("links")
        .select("*")
        .eq("short_id", shortId)
        .single();

      if (error) {
        toast.error("Link not found");
        navigate("/");
        return;
      }

      setLink(data);
      setLoading(false);
    };

    fetchLink();
  }, [shortId, navigate]);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card className="shadow-lg">
          <CardContent className="pt-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
                Your Shortened URL
              </div>
              <div className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {shortUrl}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={copyToClipboard}
                className="flex-1"
                size="lg"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </>
                )}
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
              >
                <Link to={`/stats/${shortId}`}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Stats
                </Link>
              </Button>
            </div>

            <div className="pt-4 border-t space-y-2">
              <div className="text-sm text-muted-foreground">Original URL:</div>
              <div className="text-sm font-mono bg-muted p-3 rounded-lg break-all">
                {link?.long_url}
              </div>
              {link?.custom_alias && (
                <div className="text-xs text-muted-foreground">
                  Custom alias: {link.custom_alias}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button asChild variant="outline">
            <Link to="/">Create Another Link</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Result;
