
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Trophy, Flag, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function HowItWorks() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">How Survivor Fantasy Works</h1>
          
          <div className="mb-12">
            <p className="text-xl text-gray-300 mb-8">
              Survivor Fantasy Football combines the strategy of traditional fantasy sports with the
              excitement of elimination-style competition, creating a unique and dynamic experience.
            </p>
            
            <div className="grid gap-8">
              <Card className="bg-nfl-gray border-nfl-light-gray/20 overflow-hidden">
                <CardContent className="p-0">
                  <div className="grid md:grid-cols-2">
                    <div className="p-6">
                      <div className="w-12 h-12 bg-nfl-blue/20 rounded-full flex items-center justify-center mb-4">
                        <Calendar className="w-6 h-6 text-nfl-blue" />
                      </div>
                      <h2 className="text-xl font-bold mb-3">Weekly Eliminations</h2>
                      <p className="text-gray-400 mb-4">
                        Each week of the NFL season, one real NFL team is eliminated from our fantasy league.
                        Their elimination is based on real-world performance, and once a team is eliminated,
                        all of their players become available in the draft pool.
                      </p>
                      <p className="text-gray-400">
                        This creates a dynamic environment where the available player pool changes weekly,
                        allowing you to adapt your strategy throughout the season.
                      </p>
                    </div>
                    <div className="bg-nfl-dark-gray flex items-center justify-center p-6">
                      <div className="space-y-3 w-full max-w-xs">
                        <div className="bg-nfl-gray rounded-lg p-3 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-nfl-blue">Week 1</Badge>
                            <span>Panthers Eliminated</span>
                          </div>
                          <Flag className="w-4 h-4 text-nfl-red" />
                        </div>
                        <div className="bg-nfl-gray rounded-lg p-3 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-nfl-blue">Week 2</Badge>
                            <span>Texans Eliminated</span>
                          </div>
                          <Flag className="w-4 h-4 text-nfl-red" />
                        </div>
                        <div className="bg-nfl-gray rounded-lg p-3 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-nfl-blue">Week 3</Badge>
                            <span>Jets Eliminated</span>
                          </div>
                          <Flag className="w-4 h-4 text-nfl-red" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-nfl-gray border-nfl-light-gray/20 overflow-hidden">
                <CardContent className="p-0">
                  <div className="grid md:grid-cols-2">
                    <div className="bg-nfl-dark-gray flex items-center justify-center p-6 md:order-1">
                      <div className="space-y-3 w-full max-w-xs">
                        <div className="bg-nfl-gray rounded-lg p-3">
                          <div className="font-bold mb-1">Regular Draft</div>
                          <div className="text-sm text-gray-400">Start with your initial team</div>
                        </div>
                        <div className="bg-nfl-blue/20 rounded-lg p-3 relative">
                          <div className="absolute -left-4 top-1/2 transform -translate-y-1/2 w-2 h-8 bg-nfl-blue rounded-r-md"></div>
                          <div className="font-bold mb-1">Weekly Redrafts</div>
                          <div className="text-sm text-gray-400">Draft newly available players each week</div>
                        </div>
                        <div className="bg-nfl-gray rounded-lg p-3">
                          <div className="font-bold mb-1">Strategic Decisions</div>
                          <div className="text-sm text-gray-400">Replace underperformers with new talent</div>
                        </div>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="w-12 h-12 bg-nfl-blue/20 rounded-full flex items-center justify-center mb-4">
                        <Award className="w-6 h-6 text-nfl-blue" />
                      </div>
                      <h2 className="text-xl font-bold mb-3">Strategic Redrafting</h2>
                      <p className="text-gray-400 mb-4">
                        As players from eliminated teams become available, you'll have the opportunity
                        to draft them to your roster. This allows you to replace underperforming players
                        or fill positions where you need more production.
                      </p>
                      <p className="text-gray-400">
                        The longer the season goes, the more talent becomes available, leading to
                        increasingly competitive and strategic draft decisions each week.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-nfl-gray border-nfl-light-gray/20 overflow-hidden">
                <CardContent className="p-0">
                  <div className="grid md:grid-cols-2">
                    <div className="p-6">
                      <div className="w-12 h-12 bg-nfl-blue/20 rounded-full flex items-center justify-center mb-4">
                        <Trophy className="w-6 h-6 text-nfl-blue" />
                      </div>
                      <h2 className="text-xl font-bold mb-3">Team Eliminations & Winning</h2>
                      <p className="text-gray-400 mb-4">
                        Each week, the fantasy team with the lowest score is eliminated from the competition.
                        This creates increasing tension as the season progresses and the field narrows.
                      </p>
                      <p className="text-gray-400">
                        The last team standing at the end of the season is crowned the Survivor Fantasy
                        champion! Victory requires both initial drafting skill and the ability to adapt
                        your team throughout the season.
                      </p>
                    </div>
                    <div className="bg-nfl-dark-gray flex items-center justify-center p-6">
                      <div className="text-center">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-r from-nfl-blue to-nfl-lightblue flex items-center justify-center mx-auto mb-4">
                          <Trophy className="w-12 h-12 text-white" />
                        </div>
                        <div className="font-bold text-xl mb-1">Champion</div>
                        <div className="text-gray-400">Last team standing wins it all</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-4">Ready to Play?</h2>
            <p className="text-gray-300 mb-6">
              Join now and experience the most dynamic fantasy football format available.
              Test your NFL knowledge, draft strategy, and ability to adapt week after week.
            </p>
            <Button asChild className="bg-nfl-blue hover:bg-nfl-lightblue text-lg h-12 px-8 rounded-md mx-auto">
              <Link to="/dashboard" className="flex items-center gap-2">
                Start Playing Now <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
