import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Link2 } from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="space-y-2">
          <Link2 className="w-20 h-20 mx-auto text-muted-foreground/50" />
          <h1 className="text-6xl font-bold text-primary">404</h1>
          <h2 className="text-2xl font-semibold">Link Not Found</h2>
          <p className="text-muted-foreground">
            The short link you're looking for doesn't exist or may have expired.
          </p>
        </div>
        <Button asChild size="lg">
          <Link to="/">
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
