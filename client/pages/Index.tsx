import { ComponentType, FormEvent, ReactNode, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  Activity,
  Bolt,
  Clock4,
  ShieldCheck,
  Sparkles,
  Wifi,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";

const sellingPoints = [
  {
    icon: ShieldCheck,
    title: "Zero-trust security",
    description: "End-to-end encrypted device control with role-based parental approvals.",
  },
  {
    icon: Clock4,
    title: "Predictive schedules",
    description: "AI-assisted routines that learn family habits and save up to 28% energy.",
  },
  {
    icon: Activity,
    title: "Live diagnostics",
    description: "Heartbeat monitoring for every appliance, with anomaly alerts in seconds.",
  },
];

const quickStats = [
  { label: "Homes automated", value: "12.4k" },
  { label: "Energy saved", value: "32%" },
  { label: "Avg. response", value: "320ms" },
];

type AuthTab = "signin" | "signup";

type SignInForm = {
  email: string;
  password: string;
};

type SignUpForm = SignInForm & {
  fullName: string;
};

const initialSignIn: SignInForm = {
  email: "",
  password: "",
};

const initialSignUp: SignUpForm = {
  email: "",
  password: "",
  fullName: "",
};

export default function Index() {
  const { user, signIn, signUp, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<AuthTab>("signin");
  const [signInForm, setSignInForm] = useState<SignInForm>(initialSignIn);
  const [signUpForm, setSignUpForm] = useState<SignUpForm>(initialSignUp);
  const [submitting, setSubmitting] = useState(false);

  const headline = useMemo(() => {
    return activeTab === "signin"
      ? "Log in to your electric sanctuary"
      : "Create your ElectraWireless co-pilot";
  }, [activeTab]);

  if (user) {
    return <Navigate to={redirect} replace />;
  }

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    const result = await signIn(signInForm);
    setSubmitting(false);

    if (result.error) {
      toast({ title: "Sign-in failed", description: result.error, variant: "destructive" });
      return;
    }

    toast({
      title: "Welcome back",
      description: "Homes and devices are syncing in the background.",
    });
    navigate(redirect);
  };

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    const result = await signUp(signUpForm);
    setSubmitting(false);

    if (result.error) {
      toast({ title: "We couldn't finish signup", description: result.error, variant: "destructive" });
      return;
    }

    toast({
      title: "Verify your inbox",
      description: "Confirm the magic link we sent to activate your Electra home.",
    });
    navigate("/dashboard");
  };

  return (
    <div className="relative grid min-h-screen grid-cols-1 bg-gradient-to-br from-background via-secondary/40 to-background lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="relative flex flex-col justify-between overflow-hidden bg-sidebar px-8 py-12 text-sidebar-foreground">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(93,138,255,0.24),transparent_55%)]" />
        <div className="relative z-10 flex flex-col gap-10">
          <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.35em] text-sidebar-foreground/70">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sidebar-primary text-lg text-sidebar-primary-foreground">
              EW
            </span>
            ElectraWireless
          </div>
          <div className="max-w-xl space-y-4">
            <BadgeLabel icon={Sparkles} text="Next-gen smart living" />
            <h1 className="text-4xl font-semibold leading-tight text-sidebar-foreground lg:text-5xl">
              Command every appliance with precision and calm.
            </h1>
            <p className="text-lg text-sidebar-foreground/80">
              Automations, family permissions, and energy analytics orchestrated from a single, secure hub.
              Tailored for modern homes that deserve better than static switches.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {sellingPoints.map((item) => (
              <Card key={item.title} className="border-transparent bg-sidebar-accent/60 shadow-none backdrop-blur">
                <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary/10 text-sidebar-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base font-semibold text-sidebar-accent-foreground">
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm text-sidebar-accent-foreground/75">
                    {item.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <div className="relative z-10 grid gap-5 rounded-3xl border border-sidebar-border/50 bg-sidebar-accent/40 p-6 text-sm text-sidebar-foreground/80 backdrop-blur">
          <div className="flex items-center gap-3">
            <Wifi className="h-4 w-4" />
            <span>Secure mesh connectivity across every floor and outbuilding.</span>
          </div>
          <Separator className="bg-sidebar-border/50" />
          <div className="flex flex-wrap gap-4">
            {quickStats.map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-sidebar-primary/10 px-4 py-3">
                <p className="text-xs uppercase tracking-wider text-sidebar-foreground/60">
                  {stat.label}
                </p>
                <p className="text-xl font-semibold text-sidebar-primary-foreground">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative flex items-center justify-center px-6 py-16 sm:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(93,138,255,0.12),transparent_60%)]" />
        <div className="relative z-10 w-full max-w-md">
          <Card className="border-border/50 bg-card/80 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold text-foreground">
                {headline}
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Authenticate to sync your home, access live energy insights, and manage schedules anywhere.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AuthTab)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Create account</TabsTrigger>
                </TabsList>
                <TabsContent value="signin" className="mt-6">
                  <form className="space-y-5" onSubmit={handleSignIn}>
                    <Field label="Email address" htmlFor="signin-email">
                      <Input
                        id="signin-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={signInForm.email}
                        onChange={(event) =>
                          setSignInForm((previous) => ({ ...previous, email: event.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Password" htmlFor="signin-password">
                      <Input
                        id="signin-password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={signInForm.password}
                        onChange={(event) =>
                          setSignInForm((previous) => ({ ...previous, password: event.target.value }))
                        }
                      />
                    </Field>
                    <Button type="submit" className="w-full" disabled={submitting || loading}>
                      <Bolt className={cn("mr-2 h-4 w-4", submitting && "animate-spin")}
 />
                      Enter control center
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="signup" className="mt-6">
                  <form className="space-y-5" onSubmit={handleSignUp}>
                    <Field label="Full name" htmlFor="signup-name">
                      <Input
                        id="signup-name"
                        autoComplete="name"
                        required
                        value={signUpForm.fullName}
                        onChange={(event) =>
                          setSignUpForm((previous) => ({ ...previous, fullName: event.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Email address" htmlFor="signup-email">
                      <Input
                        id="signup-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={signUpForm.email}
                        onChange={(event) =>
                          setSignUpForm((previous) => ({ ...previous, email: event.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Password" htmlFor="signup-password">
                      <Input
                        id="signup-password"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={signUpForm.password}
                        onChange={(event) =>
                          setSignUpForm((previous) => ({ ...previous, password: event.target.value }))
                        }
                      />
                    </Field>
                    <Button type="submit" className="w-full" disabled={submitting || loading}>
                      <Sparkles className={cn("mr-2 h-4 w-4", submitting && "animate-spin")}
 />
                      Launch my smart home
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you accept ElectraWireless Terms of Service and consent to automated event logging for
            security, safety, and compliance.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="text-sm font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function BadgeLabel({ icon: Icon, text }: { icon: ComponentType<{ className?: string }>; text: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-sidebar-border/60 bg-sidebar-accent/40 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-sidebar-foreground/70">
      <Icon className="h-4 w-4" />
      {text}
    </span>
  );
}
