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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
const signupFormSchema = z.object({
  fullName: z.string().min(2, {
    message: "Name must be at least 2 characters"
  }),
  email: z.string().email({
    message: "Please enter a valid email address"
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters"
  }),
  confirmPassword: z.string().min(6, {
    message: "Password must be at least 6 characters"
  }),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions"
  })
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});
type SignupFormValues = z.infer<typeof signupFormSchema>;
export default function Signup() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { signup } = useAuth();
  const navigate = useNavigate();
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false
    }
  });
  const onSubmit = async (values: SignupFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await signup(values.email, values.password, values.fullName);
      if (error) {
        setError(error);
      } else {
        toast({
          title: "Cuenta creada",
          description: "¡Tu cuenta ha sido creada exitosamente!"
        });
        navigate("/dashboard");
      }
    } catch (err) {
      setError("Ocurrió un error inesperado. Intenta de nuevo.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  return <Layout>
      <div className="container max-w-6xl mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row-reverse gap-8 items-center">
          <div className="flex-1 w-full">
            <Card className="w-full max-w-md mx-auto bg-gradient-to-br from-nfl-gray to-nfl-gray/90 border-nfl-light-gray/20">
              <CardHeader className="space-y-1">
                <div className="flex items-center justify-center mb-2">
                  <User className="h-10 w-10 text-nfl-blue" />
                </div>
                <CardTitle className="text-2xl text-center">Create an account</CardTitle>
                <CardDescription className="text-center">
                  Enter your details to create your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>}
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField control={form.control} name="fullName" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
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
                    <FormField control={form.control} name="confirmPassword" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                    <FormField control={form.control} name="acceptTerms" render={({
                    field
                  }) => <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-4 bg-nfl-dark-gray/50">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              I accept the <Link to="/terms" className="text-nfl-blue hover:text-nfl-blue/80">terms and conditions</Link>
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>} />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Creating account..." : "Create Account"}
                    </Button>
                  </form>
                </Form>
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
                <div className="flex flex-col space-y-2 w-full">
                  <Button variant="outline" className="w-full bg-transparent hover:bg-nfl-light-gray/10">
                    <User className="mr-2 h-4 w-4" />
                    Demo Account
                  </Button>
                </div>
                <div className="text-center text-sm mt-4">
                  Already have an account?{" "}
                  <Link to="/login" className="text-nfl-blue hover:text-nfl-blue/80 font-semibold">
                    Sign in
                  </Link>
                </div>
              </CardFooter>
            </Card>
          </div>
          
          <div className="flex-1 hidden lg:block">
            <div className="rounded-lg overflow-hidden shadow-xl">
              <img alt="Authentication" className="w-full object-cover rounded-lg" src="/lovable-uploads/0c44cd25-0dfc-4563-9eb6-efdb3f54144f.jpg" />
            </div>
            <div className="mt-6 space-y-4">
              <h2 className="text-2xl font-bold text-white/90">Join Survive Week Today</h2>
              <p className="text-white/70">
                Create your account to join exciting NFL survivor pools. Make your picks each week 
                and compete against other football fans.
              </p>
              <div className="flex items-center space-x-2 text-nfl-blue">
                <ArrowRight className="h-4 w-4" />
                <span>Free to join</span>
              </div>
              <div className="flex items-center space-x-2 text-nfl-blue">
                <ArrowRight className="h-4 w-4" />
                <span>Create or join multiple pools</span>
              </div>
              <div className="flex items-center space-x-2 text-nfl-blue">
                <ArrowRight className="h-4 w-4" />
                <span>Weekly reminders and notifications</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>;
}