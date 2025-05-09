
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { User, Camera } from "lucide-react";

// Form schema validation
const profileFormSchema = z.object({
  fullName: z.string().min(2, { message: "Name must be at least 2 characters." }),
  teamName: z.string().min(2, { message: "Team name must be at least 2 characters." }),
  favoriteTeam: z.string().optional(),
  avatarUrl: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const Profile = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  // Initialize form with react-hook-form
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: "",
      teamName: "",
      favoriteTeam: "",
      avatarUrl: "",
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    setIsLoading(true);
    
    try {
      // For now this is a placeholder - we'll connect to Supabase later
      console.log("Profile data to save:", data);
      setTimeout(() => {
        setIsLoading(false);
        alert("Profile updated successfully!");
      }, 1000);
    } catch (error) {
      console.error("Error updating profile:", error);
      setIsLoading(false);
    }
  };

  // Placeholder for avatar upload
  const handleAvatarUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      if (!e.target) return;
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Just for preview - we'll handle actual uploads later
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setAvatarUrl(e.target.result as string);
            form.setValue("avatarUrl", "placeholder-url");
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  // Mock favorite NFL teams
  const nflTeams = [
    "Arizona Cardinals",
    "Atlanta Falcons",
    "Baltimore Ravens",
    "Buffalo Bills",
    "Carolina Panthers",
    "Chicago Bears",
    "Cincinnati Bengals",
    "Cleveland Browns",
    "Dallas Cowboys",
    "Denver Broncos",
    "Detroit Lions",
    "Green Bay Packers",
    "Houston Texans",
    "Indianapolis Colts",
    "Jacksonville Jaguars",
    "Kansas City Chiefs",
    "Las Vegas Raiders",
    "Los Angeles Chargers",
    "Los Angeles Rams",
    "Miami Dolphins",
    "Minnesota Vikings",
    "New England Patriots",
    "New Orleans Saints",
    "New York Giants",
    "New York Jets",
    "Philadelphia Eagles",
    "Pittsburgh Steelers",
    "San Francisco 49ers",
    "Seattle Seahawks",
    "Tampa Bay Buccaneers",
    "Tennessee Titans",
    "Washington Commanders",
  ];

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Mi Perfil</h1>
        
        <Card className="bg-card border-border shadow-lg">
          <CardHeader className="pb-0">
            <CardTitle className="text-2xl font-semibold text-center">
              Información Personal
            </CardTitle>
          </CardHeader>
          
          <CardContent className="pt-6">
            {/* Avatar Upload Section */}
            <div className="flex flex-col items-center mb-8">
              <Avatar className="w-24 h-24 mb-4 cursor-pointer relative group" onClick={handleAvatarUpload}>
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt="Profile" className="object-cover" />
                ) : (
                  <AvatarFallback className="bg-muted text-muted-foreground text-2xl">
                    <User className="w-10 h-10" />
                  </AvatarFallback>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 rounded-full transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </Avatar>
              <p className="text-sm text-muted-foreground">
                Click para cambiar tu foto
              </p>
            </div>

            {/* Profile Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Tu nombre" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="teamName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de tu Equipo</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre de tu equipo fantasy" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="favoriteTeam"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Equipo NFL Favorito</FormLabel>
                      <FormControl>
                        <select 
                          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          {...field}
                        >
                          <option value="">Selecciona un equipo</option>
                          {nflTeams.map((team) => (
                            <option key={team} value={team}>{team}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end pt-4">
                  <Button 
                    type="submit" 
                    className="bg-nfl-blue hover:bg-nfl-blue/90"
                    disabled={isLoading}
                  >
                    {isLoading ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Profile;
