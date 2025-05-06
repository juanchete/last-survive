
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import { Check, Image, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CreateLeague = () => {
  const navigate = useNavigate();
  const [leagueImage, setLeagueImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    entryFee: "",
    maxParticipants: "10",
    visibility: "public",
    inviteOnly: "false"
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRadioChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app, you would upload the file to a server
      // Here we're just creating a local URL
      const url = URL.createObjectURL(file);
      setLeagueImage(url);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.name) {
      toast.error("Please enter a league name");
      return;
    }

    // In a real app, this would send data to an API
    toast.success("League created successfully!");
    console.log("Creating league with data:", { ...formData, leagueImage });
    
    // Navigate to the hub/dashboard
    setTimeout(() => navigate("/hub"), 1500);
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-white mb-8">Create Your League</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* League Information */}
          <div className="lg:col-span-2">
            <Card className="p-6 bg-nfl-dark border border-nfl-light-gray">
              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-white">League Information</h2>
                    
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-white">League Name</Label>
                      <Input 
                        id="name" 
                        name="name" 
                        placeholder="Enter league name" 
                        value={formData.name}
                        onChange={handleChange}
                        className="bg-nfl-gray border-nfl-light-gray text-white"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-white">Description</Label>
                      <Textarea 
                        id="description" 
                        name="description" 
                        placeholder="Describe your league" 
                        value={formData.description}
                        onChange={handleChange}
                        className="bg-nfl-gray border-nfl-light-gray text-white min-h-[120px]"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="entryFee" className="text-white">Entry Fee ($)</Label>
                        <Input 
                          id="entryFee"
                          name="entryFee"
                          type="number" 
                          placeholder="0.00"
                          value={formData.entryFee}
                          onChange={handleChange}
                          className="bg-nfl-gray border-nfl-light-gray text-white"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="maxParticipants" className="text-white">Maximum Participants</Label>
                        <Select 
                          value={formData.maxParticipants}
                          onValueChange={(value) => handleSelectChange("maxParticipants", value)}
                        >
                          <SelectTrigger className="bg-nfl-gray border-nfl-light-gray text-white">
                            <SelectValue placeholder="Select max participants" />
                          </SelectTrigger>
                          <SelectContent className="bg-nfl-dark-gray text-white">
                            <SelectItem value="5">5 players</SelectItem>
                            <SelectItem value="10">10 players</SelectItem>
                            <SelectItem value="20">20 players</SelectItem>
                            <SelectItem value="50">50 players</SelectItem>
                            <SelectItem value="100">100 players</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-white">League Settings</h2>
                    
                    <div className="space-y-2">
                      <Label className="text-white">League Visibility</Label>
                      <RadioGroup 
                        defaultValue={formData.visibility}
                        className="flex flex-col space-y-2"
                        onValueChange={(value) => handleRadioChange("visibility", value)}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="public" id="public" />
                          <Label htmlFor="public" className="text-white">Public - Anyone can find and join</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="private" id="private" />
                          <Label htmlFor="private" className="text-white">Private - By invitation only</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-white">Join Requirements</Label>
                      <RadioGroup 
                        defaultValue={formData.inviteOnly}
                        className="flex flex-col space-y-2"
                        onValueChange={(value) => handleRadioChange("inviteOnly", value)}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="false" id="open" />
                          <Label htmlFor="open" className="text-white">Open to join</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="true" id="invite" />
                          <Label htmlFor="invite" className="text-white">Invitation required</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="border-nfl-light-gray text-white hover:bg-nfl-gray"
                      onClick={() => navigate("/hub")}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-nfl-blue hover:bg-nfl-blue/80 text-white">
                      <Check className="mr-2 h-4 w-4" /> Create League
                    </Button>
                  </div>
                </div>
              </form>
            </Card>
          </div>
          
          {/* League Image Upload */}
          <div>
            <Card className="p-6 bg-nfl-dark border border-nfl-light-gray">
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white">League Image</h2>
                
                <div className="flex flex-col items-center justify-center">
                  {leagueImage ? (
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-4">
                      <img 
                        src={leagueImage} 
                        alt="League cover" 
                        className="w-full h-full object-cover"
                      />
                      <Button 
                        type="button"
                        variant="outline"
                        size="sm"
                        className="absolute bottom-2 right-2 bg-black/50 hover:bg-black/70 text-white border-gray-600"
                        onClick={() => setLeagueImage(null)}
                      >
                        Replace
                      </Button>
                    </div>
                  ) : (
                    <div className="w-full aspect-video bg-nfl-gray rounded-lg flex flex-col items-center justify-center mb-4 border-2 border-dashed border-nfl-light-gray">
                      <Image className="h-10 w-10 text-nfl-light-gray mb-2" />
                      <p className="text-nfl-light-gray text-sm">Upload a cover image</p>
                    </div>
                  )}
                  
                  <div className="w-full">
                    <Label 
                      htmlFor="image-upload" 
                      className="cursor-pointer flex items-center justify-center gap-2 w-full py-2 border border-nfl-light-gray rounded-md bg-nfl-gray hover:bg-nfl-light-gray/20 text-white transition"
                    >
                      <Upload className="h-4 w-4" />
                      {leagueImage ? 'Change Image' : 'Upload Image'}
                    </Label>
                    <Input 
                      id="image-upload" 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleImageUpload}
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-white font-medium text-sm">Recommended:</h3>
                  <ul className="text-sm text-nfl-light-gray space-y-1">
                    <li>• 16:9 aspect ratio</li>
                    <li>• Minimum size: 1280x720px</li>
                    <li>• JPEG or PNG format</li>
                    <li>• Maximum size: 5MB</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CreateLeague;
