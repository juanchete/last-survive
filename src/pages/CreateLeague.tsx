
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

// Define form validation schema
const createLeagueSchema = z.object({
  name: z.string().min(3, "League name must be at least 3 characters"),
  description: z.string().optional(),
  entryFee: z.number().min(0, "Entry fee cannot be negative").optional(),
  isPrivate: z.boolean().default(false),
});

type CreateLeagueFormValues = z.infer<typeof createLeagueSchema>;

const CreateLeague = () => {
  const navigate = useNavigate();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const createLeague = useLeagueStore((state) => state.createLeague);

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
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
    try {
      // Generate a random code for private leagues
      const privateCode = isPrivate ? generateRandomCode() : null;
      
      // Create league in store
      createLeague({
        name: data.name,
        description: data.description || "",
        entryFee: data.entryFee || 0,
        image: imagePreview,
        isPrivate,
        privateCode,
      });
      
      if (isPrivate) {
        setGeneratedCode(privateCode);
      } else {
        toast.success("League created successfully!");
        navigate("/hub");
      }
    } catch (error) {
      toast.error("Failed to create league");
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
              <h1 className="text-3xl font-bold mb-6">Create New League</h1>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">League Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter league name"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-destructive text-sm">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your league..."
                    {...register("description")}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="entryFee">Entry Fee (Optional)</Label>
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
                  <Label>League Image (Optional)</Label>
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
                          Click to upload league image
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
                  <Label htmlFor="isPrivate">Private League</Label>
                </div>
                
                {isPrivate && (
                  <div className="rounded-md bg-muted p-4">
                    <p className="text-sm text-muted-foreground">
                      <ShieldCheck className="inline-block w-4 h-4 mr-1" />
                      Private leagues require an access code to join. A unique code will be generated when you create the league.
                    </p>
                  </div>
                )}

                <div className="pt-4 flex space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/hub")}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create League
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
