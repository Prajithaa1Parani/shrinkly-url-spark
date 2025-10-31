import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const Redirect = () => {
  const { shortId } = useParams();

  useEffect(() => {
    const handleRedirect = async () => {
      if (!shortId) return;

      try {
        // Call edge function to handle redirect and analytics
        const { data, error } = await supabase.functions.invoke("redirect", {
          body: { shortId },
        });

        if (error) throw error;

        if (data?.url) {
          // Record click analytics
          const userAgent = navigator.userAgent;
          const referrer = document.referrer || "direct";
          
          // Get link info
          const { data: linkData } = await supabase
            .from("links")
            .select("id")
            .eq("short_id", shortId)
            .single();

          if (linkData) {
            // Insert click record (geo lookup will be handled by edge function)
            await supabase.from("clicks").insert({
              link_id: linkData.id,
              ip: "unknown", // Would be captured server-side in production
              country: "Unknown",
              referrer,
              user_agent: userAgent,
            });
          }

          // Redirect
          window.location.href = data.url;
        } else {
          window.location.href = "/";
        }
      } catch (error) {
        console.error("Redirect error:", error);
        window.location.href = "/";
      }
    };

    handleRedirect();
  }, [shortId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
};

export default Redirect;
