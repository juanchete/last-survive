import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Image, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { useLeagueStore } from "@/store/leagueStore";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

// Define form validation schema
const createLeagueSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  description: z.string().optional(),
  entryFee: z.number().min(0, "El costo no puede ser negativo").optional(),
  isPrivate: z.boolean().default(false),
  maxMembers: z.number().min(2, "Debe haber al menos 2 miembros").optional(),
  status: z.enum(["upcoming", "active", "finished"]).default("upcoming"),
  prize: z.string().optional(),
  startDate: z.string().optional(), // ISO string
});

type CreateLeagueFormValues = z.infer<typeof createLeagueSchema>;

const CreateLeague = () => {
  const navigate = useNavigate();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const createLeague = useLeagueStore((state) => state.createLeague);
  const { user } = useAuth();
  const [imageFile, setImageFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateLeagueFormValues>({
    resolver: zodResolver(createLeagueSchema),
    defaultValues: {
      name: "",
      description: "",
      entryFee: 0,
      isPrivate: false,
      maxMembers: 10,
      status: "upcoming",
      prize: "",
      startDate: "",
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
  };

  const onSubmit = async (data: CreateLeagueFormValues) => {
    if (!user) {
      toast.error("Debes iniciar sesión para crear una liga.");
      return;
    }
    try {
      // Generar código único para liga privada
      let privateCode: string | null = null;
      if (isPrivate) {
        let unique = false;
        while (!unique) {
          privateCode = generateRandomCode();
          const { data: codeExists } = await supabase
            .from("leagues")
            .select("id")
            .eq("private_code", privateCode)
            .maybeSingle();
          if (!codeExists) unique = true;
        }
      }

      let imageUrl = null;
      if (imageFile) {
        // Crea un nombre único para la imagen
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        // Sube la imagen al bucket
        const { error: uploadError } = await supabase.storage
          .from('league-images')
          .upload(filePath, imageFile);

        if (uploadError) {
          toast.error("Error subiendo imagen: " + uploadError.message);
          return;
        }

        // Obtén la URL pública
        const { data } = supabase.storage.from('league-images').getPublicUrl(filePath);
        imageUrl = data.publicUrl;
      }

      // Insertar liga en la base de datos
      const { data: league, error: leagueError } = await supabase
        .from("leagues")
        .insert([
          {
            name: data.name,
            description: data.description || "",
            entry_fee: data.entryFee || 0,
            image_url: imageUrl,
            is_private: isPrivate,
            private_code: privateCode,
            owner_id: user.id,
            max_members: data.maxMembers,
            status: data.status,
            prize: data.prize,
            start_date: data.startDate || null,
            created_at: new Date().toISOString(),
          }
        ])
        .select()
        .single();
      if (leagueError) throw leagueError;

      // Crear equipo fantasy para el owner
      const { data: fantasyTeam, error: teamError } = await supabase
        .from("fantasy_teams")
        .insert([
          {
            league_id: league.id,
            user_id: user.id,
            name: `${user.user_metadata?.full_name || user.email}'s Team`,
            points: 0,
            rank: 1,
            eliminated: false,
            created_at: new Date().toISOString(),
          }
        ])
        .select()
        .single();
      if (teamError) throw teamError;

      // Insertar owner en league_members
      const { error: memberError } = await supabase
        .from("league_members")
        .insert([
          {
            league_id: league.id,
            user_id: user.id,
            role: "owner",
            joined_at: new Date().toISOString(),
            team_id: fantasyTeam.id,
          }
        ]);
      if (memberError) throw memberError;

      if (isPrivate) {
        setGeneratedCode(privateCode!);
      } else {
        toast.success("League created successfully!");
        navigate("/hub");
      }
    } catch (error: unknown) {
      const errMsg = error && typeof error === "object" && "message" in error ? (error as { message: string }).message : String(error);
      toast.error("Error al crear la liga: " + errMsg);
      console.error(error);
    }
  };

  const generateRandomCode = (): string => {
    // Generate a 6-character alphanumeric code
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  };

  const handlePrivateToggle = (checked: boolean) => {
    setIsPrivate(checked);
  };

  const handleCodeDone = () => {
    toast.success("League created successfully!");
    navigate("/hub");
  };

  return (
    <>
      <Header />
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          {generatedCode ? (
            <div className="bg-card rounded-lg p-8 shadow-lg">
              <div className="text-center">
                <ShieldCheck className="w-16 h-16 text-primary mx-auto mb-4" />
                <h1 className="text-3xl font-bold mb-2">Private League Created!</h1>
                <p className="text-muted-foreground mb-6">
                  Share this code with players you want to invite to your league
                </p>
                
                <div className="bg-muted p-6 rounded-md mb-6">
                  <p className="text-4xl font-mono tracking-wider text-center">
                    {generatedCode}
                  </p>
                </div>
                
                <p className="text-sm text-muted-foreground mb-6">
                  Make sure to save this code! Players will need it to join your league.
                </p>
                
                <Button onClick={handleCodeDone} size="lg">
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold mb-6">Crear Nueva Liga</h1>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre de la Liga</Label>
                  <Input
                    id="name"
                    placeholder="Nombre de la liga"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-destructive text-sm">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción (opcional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe tu liga..."
                    {...register("description")}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="entryFee">Costo de entrada (opcional)</Label>
                  <Input
                    id="entryFee"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    {...register("entryFee", { valueAsNumber: true })}
                  />
                  {errors.entryFee && (
                    <p className="text-destructive text-sm">{errors.entryFee.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxMembers">Máximo de miembros</Label>
                  <Input
                    id="maxMembers"
                    type="number"
                    min="2"
                    step="1"
                    placeholder="10"
                    {...register("maxMembers", { valueAsNumber: true })}
                  />
                  {errors.maxMembers && (
                    <p className="text-destructive text-sm">{errors.maxMembers.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prize">Premio (opcional)</Label>
                  <Input
                    id="prize"
                    placeholder="Premio para el ganador"
                    {...register("prize")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startDate">Fecha de inicio</Label>
                  <Input
                    id="startDate"
                    type="date"
                    {...register("startDate")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <select
                    id="status"
                    className="w-full border rounded-md p-2 bg-background text-foreground"
                    {...register("status")}
                  >
                    <option value="upcoming">Próxima</option>
                    <option value="active">Activa</option>
                    <option value="finished">Finalizada</option>
                  </select>
                  {errors.status && (
                    <p className="text-destructive text-sm">{errors.status.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Imagen de la Liga (opcional)</Label>
                  {imagePreview ? (
                    <div className="relative w-full h-48 rounded-md overflow-hidden bg-muted">
                      <img
                        src={imagePreview}
                        alt="League preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-2 right-2 p-1 bg-background/80 rounded-full"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="leagueImage" className="cursor-pointer">
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-md p-8 text-center hover:bg-muted/50 transition-colors">
                        <Image className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Haz clic para subir una imagen de la liga
                        </p>
                      </div>
                      <input
                        id="leagueImage"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleImageChange}
                      />
                    </label>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isPrivate" 
                    checked={isPrivate}
                    onCheckedChange={handlePrivateToggle}
                  />
                  <Label htmlFor="isPrivate">Liga privada</Label>
                </div>
                
                {isPrivate && (
                  <div className="rounded-md bg-muted p-4">
                    <p className="text-sm text-muted-foreground">
                      <ShieldCheck className="inline-block w-4 h-4 mr-1" />
                      Las ligas privadas requieren un código de acceso. Se generará un código único al crear la liga.
                    </p>
                  </div>
                )}

                <div className="pt-4 flex space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/hub")}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Liga
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default CreateLeague;
