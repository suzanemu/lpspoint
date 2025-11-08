import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Upload, Shield } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [accessCode, setAccessCode] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  const handleAccessCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accessCode.trim()) {
      toast.error("Please enter an access code");
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();

      if (authError) {
        toast.error("Authentication failed");
        return;
      }

      if (!authData.user) {
        toast.error("Authentication failed");
        return;
      }

      const { data: codeData, error: codeError } = await supabase
        .rpc("validate_access_code", { input_code: accessCode.trim().toUpperCase() })
        .single();

      if (codeError || !codeData) {
        await supabase.auth.signOut();
        toast.error("Invalid access code");
        return;
      }

      const { error: sessionError } = await supabase
        .from("sessions")
        .insert({
          user_id: authData.user.id,
          code_used: accessCode.trim().toUpperCase(),
          role: codeData.role,
          team_id: codeData.team_id,
        });

      if (sessionError) {
        await supabase.auth.signOut();
        toast.error("Failed to create session");
        return;
      }

      toast.success(`Welcome ${codeData.role}!`);
      navigate("/");
    } catch (error) {
      console.error("Access code error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerAccess = async () => {
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();

      if (authError) {
        toast.error("Authentication failed");
        return;
      }

      if (!authData.user) {
        toast.error("Authentication failed");
        return;
      }

      const { error: sessionError } = await supabase
        .from("sessions")
        .insert({
          user_id: authData.user.id,
          code_used: "PLAYER_DIRECT",
          role: "player",
          team_id: null,
        });

      if (sessionError) {
        await supabase.auth.signOut();
        toast.error("Failed to create session");
        return;
      }

      toast.success("Welcome! You can now submit screenshots.");
      navigate("/");
    } catch (error) {
      console.error("Player access error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-background/80">
      <Card className="w-full max-w-md p-6 md:p-8 border-primary/30 shadow-card bg-card/95 backdrop-blur">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-3 tracking-tight">
            PUBG MOBILE
          </h1>
          <p className="text-muted-foreground text-lg">Esports Point Tracker</p>
        </div>

        <div className="mb-6">
          <Button
            onClick={handlePlayerAccess}
            disabled={loading}
            className="w-full bg-gradient-primary hover:shadow-glow h-14 text-lg font-semibold transition-all duration-300"
          >
            <Upload className="mr-2 h-5 w-5" />
            Screenshot Submit
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Upload your match screenshots
          </p>
        </div>

        <div className="relative my-6">
          <Separator className="bg-border" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
            OR
          </span>
        </div>

        <form onSubmit={handleAccessCode} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="access-code" className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-primary" />
              Admin Access Code
            </Label>
            <Input
              id="access-code"
              type="text"
              placeholder="Enter admin access code"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              required
              className="bg-input border-border uppercase text-center text-lg tracking-widest h-12 font-semibold"
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground text-center">
              For administrators only
            </p>
          </div>
          <Button
            type="submit"
            disabled={loading}
            variant="outline"
            className="w-full border-primary/50 hover:bg-primary/10 h-12 font-semibold"
          >
            {loading ? "Validating..." : "Admin Login"}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Auth;
