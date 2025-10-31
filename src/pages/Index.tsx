import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Link2, Sparkles, BarChart3, Shield } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const urlSchema = z.object({
  longUrl: z.string().url("Please enter a valid URL"),
  customAlias: z.string().regex(/^[A-Za-z0-9_-]*$/, "Only letters, numbers, hyphens, and underscores").min(0).max(50).optional(),
});

const Index = () => {
  const navigate = useNavigate();
  const [longUrl, setLongUrl] = useState("");
  const [customAlias, setCustomAlias] = useState("");
  const [expiryDays, setExpiryDays] = useState("30");
  const [loading, setLoading] = useState(false);

  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validation = urlSchema.safeParse({ longUrl, customAlias });
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("shorten", {
        body: {
          longUrl,
          customAlias: customAlias || null,
          expiryDays: expiryDays ? parseInt(expiryDays) : null,
        },
      });

      if (error) throw error;

      if (data?.shortId) {
        navigate(`/result/${data.shortId}`);
      } else {
        throw new Error("Failed to create short link");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to shorten URL");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-muted">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Shrinkly
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin">
                <Shield className="w-4 h-4 mr-2" />
                Admin
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Smart URL Shortener with
            <span className="block bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Click Analytics
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Create short, memorable links and track every click with detailed analytics.
            Free, fast, and powerful.
          </p>
        </div>

        {/* Shortener Form */}
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-secondary" />
              Shorten Your URL
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleShorten} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="longUrl">Long URL</Label>
                <Input
                  id="longUrl"
                  type="url"
                  placeholder="https://example.com/very-long-url"
                  value={longUrl}
                  onChange={(e) => setLongUrl(e.target.value)}
                  required
                  className="text-base"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="customAlias">
                    Custom Alias <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="customAlias"
                    type="text"
                    placeholder="my-custom-link"
                    value={customAlias}
                    onChange={(e) => setCustomAlias(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiryDays">
                    Expiry <span className="text-muted-foreground">(days)</span>
                  </Label>
                  <Input
                    id="expiryDays"
                    type="number"
                    placeholder="30"
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(e.target.value)}
                    min="1"
                    max="365"
                  />
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? "Creating..." : "Shorten URL"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid gap-6 md:grid-cols-3 pt-12">
          <Card>
            <CardContent className="pt-6 text-center space-y-2">
              <BarChart3 className="w-10 h-10 text-secondary mx-auto" />
              <h3 className="font-semibold">Detailed Analytics</h3>
              <p className="text-sm text-muted-foreground">
                Track clicks, countries, referrers, and more
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center space-y-2">
              <Link2 className="w-10 h-10 text-secondary mx-auto" />
              <h3 className="font-semibold">Custom Aliases</h3>
              <p className="text-sm text-muted-foreground">
                Create memorable, branded short links
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center space-y-2">
              <Shield className="w-10 h-10 text-secondary mx-auto" />
              <h3 className="font-semibold">Secure & Fast</h3>
              <p className="text-sm text-muted-foreground">
                Enterprise-grade security with instant redirects
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
