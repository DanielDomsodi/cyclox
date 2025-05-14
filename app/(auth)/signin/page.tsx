import { providerMap, signIn } from '@/auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';

const providerLogoMap = {
  google: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path
        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
        fill="currentColor"
      />
    </svg>
  ),
} as Record<string, React.ReactElement>;

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="w-full max-w-sm">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Welcome back</CardTitle>
              <CardDescription>Login with your Google account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {Object.values(providerMap).map((provider) => (
                  <div key={provider.id} className="flex flex-col gap-4">
                    <form
                      action={async () => {
                        'use server';
                        try {
                          await signIn(provider.id, {
                            redirectTo: callbackUrl ?? '',
                          });
                        } catch (error) {
                          // Signin can fail for a number of reasons, such as the user
                          // not existing, or the user not having the correct role.
                          // In some cases, you may want to redirect to a custom error
                          if (error instanceof AuthError) {
                            return redirect(
                              `/api/auth/error?error=${error.type}`
                            );
                          }

                          // Otherwise if a redirects happens Next.js can handle it
                          // so you can just re-thrown the error and let Next.js handle it.
                          // Docs:
                          // https://nextjs.org/docs/app/api-reference/functions/redirect#server-component
                          throw error;
                        }
                      }}
                    >
                      <Button className="w-full" type="submit">
                        {providerLogoMap?.[provider.id] ?? null}
                        Signin with {provider.name}
                      </Button>
                    </form>
                  </div>
                ))}

                {/* <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                <span className="relative z-10 bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>

              <form
                className="grid gap-6"
                action={async (formData) => {
                  'use server';
                  console.log('### FORM DATA', formData);
                  await signIn('resend', formData);
                }}
              >
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="me@example.com"
                    required
                  />
                </div>
                <Button className="w-full" type="submit">
                  Sign In
                </Button>
              </form> */}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary  ">
          By clicking continue, you agree to our{' '}
          <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
        </div>
      </div>
    </div>
  );
}
