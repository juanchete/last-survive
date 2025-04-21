
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { HeroGeometric } from "@/components/ui/shape-landing-hero";
import { Layout } from "@/components/Layout";

export default function Home() {
  return (
    <Layout>
      <div className="flex flex-col bg-nfl-dark">
        {/* Enhanced Hero Section */}
        <HeroGeometric 
          badge="Survivor Fantasy Football" 
          title1="Survive. Draft."
          title2="Be The Last One Standing"
        />
        
        {/* Original hero section - commented out */}
        {/* 
        <div className="relative isolate overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-nfl-darker via-nfl-dark to-nfl-darker"></div>
          <div className="absolute inset-0 bg-[url('/lovable-uploads/268daebf-2493-407e-b4cd-5899539acc17.png')] bg-cover opacity-10 mix-blend-lighten"></div>
          
          <div className="container mx-auto px-4 pt-32 pb-24 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-5xl font-bold mb-6 text-white">
                <span className="bg-gradient-to-r from-nfl-blue to-nfl-lightblue bg-clip-text text-transparent">
                  Survivor Fantasy Football
                </span>
              </h1>
              <p className="text-xl text-gray-300 mb-8">
                A new way to play fantasy football. Each week, one NFL team is eliminated, 
                and their players return to the draft pool. Adapt your strategy to survive 
                and dominate the league.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button className="bg-nfl-blue hover:bg-nfl-lightblue text-lg h-12 px-8 rounded-md flex items-center gap-2">
                  <Link to="/dashboard" className="flex items-center gap-2">
                    Get Started <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Button variant="outline" className="border-nfl-blue text-nfl-blue hover:bg-nfl-blue/10 text-lg h-12 px-8 rounded-md">
                  <Link to="/how-it-works">How It Works</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
        */}
        
        {/* Features Section */}
        <div className="bg-nfl-darker py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12 text-white">
              How <span className="text-nfl-blue">Survivor Fantasy</span> Works
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-nfl-dark p-6 rounded-lg border border-nfl-light-gray/20">
                <div className="w-12 h-12 bg-nfl-blue/20 rounded-full flex items-center justify-center mb-4">
                  <span className="text-nfl-blue font-bold text-xl">1</span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">Weekly Eliminations</h3>
                <p className="text-gray-400">
                  Each week, one real NFL team is eliminated from the season, 
                  making their players available for others to draft.
                </p>
              </div>
              
              <div className="bg-nfl-dark p-6 rounded-lg border border-nfl-light-gray/20">
                <div className="w-12 h-12 bg-nfl-blue/20 rounded-full flex items-center justify-center mb-4">
                  <span className="text-nfl-blue font-bold text-xl">2</span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">Strategic Redrafting</h3>
                <p className="text-gray-400">
                  Keep your team competitive by drafting newly available players
                  to replace underperformers or fill roster gaps.
                </p>
              </div>
              
              <div className="bg-nfl-dark p-6 rounded-lg border border-nfl-light-gray/20">
                <div className="w-12 h-12 bg-nfl-blue/20 rounded-full flex items-center justify-center mb-4">
                  <span className="text-nfl-blue font-bold text-xl">3</span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">Survive & Win</h3>
                <p className="text-gray-400">
                  Accumulate points throughout the season. The last team standing
                  with the most points wins the championship.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Stats Section */}
        <div className="py-16 bg-nfl-dark">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-nfl-blue mb-2">18</div>
                <div className="text-gray-400">Weeks of Gameplay</div>
              </div>
              
              <div>
                <div className="text-4xl font-bold text-nfl-blue mb-2">32</div>
                <div className="text-gray-400">NFL Teams</div>
              </div>
              
              <div>
                <div className="text-4xl font-bold text-nfl-blue mb-2">1</div>
                <div className="text-gray-400">Champion</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* CTA Section */}
        <div className="py-16 bg-nfl-darker">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h2 className="text-3xl font-bold mb-6 text-white">
              Ready to Experience Fantasy Football in a New Way?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join now and be part of our growing community of fantasy football enthusiasts
              who are experiencing the thrill of the Survivor format.
            </p>
            <Button className="bg-nfl-blue hover:bg-nfl-lightblue text-lg h-12 px-8 rounded-md mx-auto">
              <Link to="/dashboard">Start Playing Now</Link>
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
