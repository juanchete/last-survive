import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { ArrowRight, LogIn, User } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
const loginFormSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address"
  }),
  password: z.string().min(4, {
    message: "Password must be at least 6 characters"
  })
});
type LoginFormValues = z.infer<typeof loginFormSchema>;
export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { login } = useAuth();
  const navigate = useNavigate();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });
  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await login(values.email, values.password);
      if (error) {
        setError(error);
      } else {
        toast({
          title: "Welcome!",
          description: "Login successful."
        });
        navigate("/hub");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  return <Layout>
      <div className="container max-w-6xl mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row gap-8 items-center">
          <div className="flex-1 w-full">
            <Card className="w-full max-w-md mx-auto bg-gradient-to-br from-nfl-gray to-nfl-gray/90 border-nfl-light-gray/20">
              <CardHeader className="space-y-1">
                <div className="flex items-center justify-center mb-2">
                  <LogIn className="h-10 w-10 text-nfl-blue" />
                </div>
                <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
                <CardDescription className="text-center">
                  Enter your email and password to sign in to your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>}
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField control={form.control} name="email" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="your.email@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                    <FormField control={form.control} name="password" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                </Form>
                <div className="text-center text-sm">
                  <Link to="/forgot-password" className="text-nfl-blue hover:text-nfl-blue/80">
                    Forgot your password?
                  </Link>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <div className="relative w-full">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-nfl-light-gray/20" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-nfl-gray px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>
                <div className="text-center text-sm mt-4">
                  Don't have an account?{" "}
                  <Link to="/signup" className="text-nfl-blue hover:text-nfl-blue/80 font-semibold">
                    Sign up
                  </Link>
                </div>
              </CardFooter>
            </Card>
          </div>
          
          <div className="flex-1 hidden lg:block">
            <div className="rounded-lg overflow-hidden shadow-xl">
              <img alt="Authentication" className="w-full object-cover rounded-lg" src="https://plus.unsplash.com/premium_photo-1685088062526-067d3e88c0e0?q=80&w=1742&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" />
            </div>
            <div className="mt-6 space-y-4">
              <h2 className="text-2xl font-bold text-white/90">Welcome to Survive The Fantasy</h2>
              <p className="text-white/70">
                Join our NFL survivor pool platform and test your football knowledge. 
                Make weekly picks and try to outlast other players through the season!
              </p>
              <div className="flex items-center space-x-2 text-nfl-blue">
                <ArrowRight className="h-4 w-4" />
                <span>Easy to use interface</span>
              </div>
              <div className="flex items-center space-x-2 text-nfl-blue">
                <ArrowRight className="h-4 w-4" />
                <span>Track your picks throughout the season</span>
              </div>
              <div className="flex items-center space-x-2 text-nfl-blue">
                <ArrowRight className="h-4 w-4" />
                <span>Compete against friends and family</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>;
}