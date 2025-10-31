import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ExternalLink, Globe, MousePointer, Calendar } from "lucide-react";
import { toast } from "sonner";

interface LinkStats {
  link: any;
  totalClicks: number;
  countryCounts: Record<string, number>;
  referrerCounts: Record<string, number>;
  recentClicks: any[];
}

const Stats = () => {
  const { shortId } = useParams();
  const [stats, setStats] = useState<LinkStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!shortId) return;

      try {
        // Fetch link
        const { data: linkData, error: linkError } = await supabase
          .from("links")
          .select("*")
          .eq("short_id", shortId)
          .single();

        if (linkError) throw linkError;

        // Fetch all clicks
        const { data: clicksData, error: clicksError } = await supabase
          .from("clicks")
          .select("*")
          .eq("link_id", linkData.id)
          .order("timestamp", { ascending: false });

        if (clicksError) throw clicksError;

        // Process stats
        const countryCounts: Record<string, number> = {};
        const referrerCounts: Record<string, number> = {};

        clicksData?.forEach((click) => {
          if (click.country) {
            countryCounts[click.country] = (countryCounts[click.country] || 0) + 1;
          }
          if (click.referrer) {
            const ref = click.referrer === "direct" ? "Direct" : click.referrer;
            referrerCounts[ref] = (referrerCounts[ref] || 0) + 1;
          }
        });

        setStats({
          link: linkData,
          totalClicks: clicksData?.length || 0,
          countryCounts,
          referrerCounts,
          recentClicks: clicksData?.slice(0, 20) || [],
        });
      } catch (error) {
        toast.error("Failed to load stats");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [shortId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <div className="text-muted-foreground">Loading stats...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <div className="text-center space-y-4">
          <div className="text-muted-foreground">Link not found</div>
          <Button asChild>
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <a href={stats.link.long_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Visit Link
            </a>
          </Button>
        </div>

        <div>
          <h1 className="text-4xl font-bold mb-2">Link Analytics</h1>
          <p className="text-muted-foreground">
            {window.location.origin}/{shortId}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MousePointer className="w-4 h-4 text-secondary" />
                Total Clicks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{stats.totalClicks}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Globe className="w-4 h-4 text-secondary" />
                Countries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">
                {Object.keys(stats.countryCounts).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-secondary" />
                Created
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {new Date(stats.link.created_at).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Top Countries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats.countryCounts)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([country, count]) => (
                    <div key={country} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{country}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-secondary h-full rounded-full transition-all"
                            style={{
                              width: `${(count / stats.totalClicks) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {count}
                        </span>
                      </div>
                    </div>
                  ))}
                {Object.keys(stats.countryCounts).length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    No data yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Referrers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats.referrerCounts)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([referrer, count]) => (
                    <div key={referrer} className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate max-w-[200px]">
                        {referrer}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full transition-all"
                            style={{
                              width: `${(count / stats.totalClicks) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {count}
                        </span>
                      </div>
                    </div>
                  ))}
                {Object.keys(stats.referrerCounts).length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    No data yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.recentClicks.map((click) => (
                <div
                  key={click.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">
                      {new Date(click.timestamp).toLocaleString()}
                    </span>
                    <span className="font-medium">{click.country || "Unknown"}</span>
                  </div>
                  <span className="text-muted-foreground truncate max-w-[200px]">
                    {click.referrer || "direct"}
                  </span>
                </div>
              ))}
              {stats.recentClicks.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No clicks yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Stats;
