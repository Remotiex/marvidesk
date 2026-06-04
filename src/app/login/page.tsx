import { signIn, auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Input, Field } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Headset } from "lucide-react";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  const hasGoogle = Boolean(process.env.AUTH_GOOGLE_ID);
  const hasMicrosoft = Boolean(process.env.AUTH_MICROSOFT_ENTRA_ID_ID);
  const showDev = process.env.NODE_ENV !== "production";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white shadow-lg">
            <Headset className="h-6 w-6" />
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-white">MarviDesk</h1>
          <p className="text-sm text-slate-400">Sign in to your help desk</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white p-6 shadow-2xl">
          <div className="space-y-3">
            {hasGoogle && (
              <form
                action={async () => {
                  "use server";
                  await signIn("google", { redirectTo: "/" });
                }}
              >
                <Button variant="outline" className="w-full">
                  Continue with Google
                </Button>
              </form>
            )}
            {hasMicrosoft && (
              <form
                action={async () => {
                  "use server";
                  await signIn("microsoft-entra-id", { redirectTo: "/" });
                }}
              >
                <Button variant="outline" className="w-full">
                  Continue with Microsoft
                </Button>
              </form>
            )}

            {showDev && (
              <form
                action={async (formData: FormData) => {
                  "use server";
                  await signIn("dev", {
                    email: String(formData.get("email") ?? ""),
                    redirectTo: "/",
                  });
                }}
                className={
                  hasGoogle || hasMicrosoft
                    ? "space-y-3 border-t border-border pt-4"
                    : "space-y-3"
                }
              >
                <Field label="Email" htmlFor="email">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue="admin@marvidesk.test"
                    required
                  />
                </Field>
                <Button className="w-full">Sign in</Button>
                <p className="text-xs text-muted">
                  Dev login — try admin@marvidesk.test, manager@marvidesk.test,
                  cs1@marvidesk.test, ops@marvidesk.test, tech1@marvidesk.test.
                </p>
              </form>
            )}

            {!hasGoogle && !hasMicrosoft && !showDev && (
              <p className="text-sm text-muted">
                No sign-in providers are configured.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
