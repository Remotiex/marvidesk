import { signIn, auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardBody, CardHeader, Input, Field } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  const hasGoogle = Boolean(process.env.AUTH_GOOGLE_ID);
  const hasMicrosoft = Boolean(process.env.AUTH_MICROSOFT_ENTRA_ID_ID);
  const showDev = process.env.NODE_ENV !== "production";

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <h1 className="text-lg font-semibold">MarviDesk</h1>
          <p className="text-sm text-muted">Sign in to continue</p>
        </CardHeader>
        <CardBody className="space-y-3">
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
              className="space-y-3 border-t border-border pt-3"
            >
              <p className="text-xs text-muted">
                Dev login — use a seeded email (e.g. admin@marvidesk.test,
                manager@marvidesk.test, cs1@marvidesk.test, ops@marvidesk.test).
              </p>
              <Field label="Email" htmlFor="email">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue="admin@marvidesk.test"
                  required
                />
              </Field>
              <Button className="w-full">Sign in (dev)</Button>
            </form>
          )}

          {!hasGoogle && !hasMicrosoft && !showDev && (
            <p className="text-sm text-muted">
              No sign-in providers are configured. Set AUTH_GOOGLE_ID or
              AUTH_MICROSOFT_ENTRA_ID_ID.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
