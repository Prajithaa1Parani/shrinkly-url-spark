import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Ban, CheckCircle, BarChart3 } from "lucide-react";

const Admin = () => {
  const navigate = useNavigate();
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please sign in to access admin");
        navigate("/auth");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (!roleData) {
        toast.error("Admin access required");
        navigate("/");
        return;
      }

      setIsAdmin(true);
      fetchLinks();
    };

    checkAdmin();
  }, [navigate]);

  const fetchLinks = async () => {
    const { data, error } = await supabase
      .from("links")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load links");
      return;
    }

    setLinks(data || []);
    setLoading(false);
  };

  const toggleDisabled = async (linkId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("links")
      .update({ disabled: !currentStatus })
      .eq("id", linkId);

    if (error) {
      toast.error("Failed to update link");
      return;
    }

    toast.success(currentStatus ? "Link enabled" : "Link disabled");
    fetchLinks();
  };

  const deleteLink = async (linkId: string) => {
    if (!confirm("Are you sure you want to delete this link?")) return;

    const { error } = await supabase.from("links").delete().eq("id", linkId);

    if (error) {
      toast.error("Failed to delete link");
      return;
    }

    toast.success("Link deleted");
    fetchLinks();
  };

  if (!isAdmin || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <div className="text-muted-foreground">Loading...</div>
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
        </div>

        <div>
          <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage all shortened links</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Links ({links.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-bold text-primary">
                        /{link.short_id}
                      </code>
                      {link.custom_alias && (
                        <span className="text-xs bg-secondary/20 text-secondary px-2 py-1 rounded">
                          Custom: {link.custom_alias}
                        </span>
                      )}
                      {link.disabled && (
                        <span className="text-xs bg-destructive/20 text-destructive px-2 py-1 rounded">
                          Disabled
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {link.long_url}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {link.click_count} clicks • Created{" "}
                      {new Date(link.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <Link to={`/stats/${link.short_id}`}>
                        <BarChart3 className="w-4 h-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleDisabled(link.id, link.disabled)}
                    >
                      {link.disabled ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Ban className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteLink(link.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {links.length === 0 && (
                <div className="text-center text-muted-foreground py-12">
                  No links yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
