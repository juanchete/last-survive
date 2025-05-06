import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";

const Hub = () => {
  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">My Leagues</h1>
            <p className="text-gray-400 mt-1">Manage your leagues and teams</p>
          </div>
          
          <div className="flex gap-3">
            <Button className="bg-nfl-blue hover:bg-nfl-blue/80 text-white">
              Join a League
            </Button>
            <Button variant="outline" className="border-nfl-light-gray bg-transparent text-white hover:bg-nfl-gray/30">
              Browse Leagues
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="active" className="w-full">
              <TabsList className="bg-nfl-gray w-full justify-start mb-6">
                <TabsTrigger value="active" className="data-[state=active]:bg-nfl-blue text-white">
                  Active Leagues
                </TabsTrigger>
                <TabsTrigger value="past" className="data-[state=active]:bg-nfl-blue text-white">
                  Past Leagues
                </TabsTrigger>
                <TabsTrigger value="invites" className="data-[state=active]:bg-nfl-blue text-white">
                  Invites
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="active">
                <div className="space-y-4">
                  <Card className="bg-nfl-gray border-nfl-light-gray p-4">
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                      <div className="flex gap-4">
                        <div className="w-16 h-16 rounded bg-nfl-dark-gray flex items-center justify-center text-2xl font-bold text-nfl-blue">
                          SB
                        </div>
                        <div>
                          <h3 className="text-white font-semibold text-lg">Super Bowl Survivors</h3>
                          <p className="text-gray-400 text-sm">10 members • Week 3 active</p>
                          <div className="mt-1 flex items-center">
                            <span className="text-green-400 text-xs font-medium bg-green-400/20 px-2 py-0.5 rounded-full">
                              Active
                            </span>
                            <span className="mx-2 text-gray-500">•</span>
                            <span className="text-gray-400 text-xs">$50 entry</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button size="sm" className="bg-nfl-blue hover:bg-nfl-blue/80 text-white">
                          Make Pick
                        </Button>
                        <Button size="sm" variant="outline" className="border-nfl-light-gray bg-transparent text-white hover:bg-nfl-gray/30">
                          View
                        </Button>
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="bg-nfl-gray border-nfl-light-gray p-4">
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                      <div className="flex gap-4">
                        <div className="w-16 h-16 rounded bg-nfl-dark-gray flex items-center justify-center text-2xl font-bold text-nfl-red">
                          FF
                        </div>
                        <div>
                          <h3 className="text-white font-semibold text-lg">Friends & Family League</h3>
                          <p className="text-gray-400 text-sm">6 members • Week 3 active</p>
                          <div className="mt-1 flex items-center">
                            <span className="text-yellow-400 text-xs font-medium bg-yellow-400/20 px-2 py-0.5 rounded-full">
                              Pick Due
                            </span>
                            <span className="mx-2 text-gray-500">•</span>
                            <span className="text-gray-400 text-xs">$25 entry</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button size="sm" className="bg-nfl-blue hover:bg-nfl-blue/80 text-white">
                          Make Pick
                        </Button>
                        <Button size="sm" variant="outline" className="border-nfl-light-gray bg-transparent text-white hover:bg-nfl-gray/30">
                          View
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="past">
                <div className="space-y-4">
                  <Card className="bg-nfl-gray border-nfl-light-gray p-4">
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                      <div className="flex gap-4">
                        <div className="w-16 h-16 rounded bg-nfl-dark-gray flex items-center justify-center text-2xl font-bold text-gray-500">
                          WS
                        </div>
                        <div>
                          <h3 className="text-white font-semibold text-lg">Work Survivors 2023</h3>
                          <p className="text-gray-400 text-sm">12 members • Completed</p>
                          <div className="mt-1 flex items-center">
                            <span className="text-gray-400 text-xs font-medium bg-gray-400/20 px-2 py-0.5 rounded-full">
                              Finished
                            </span>
                            <span className="mx-2 text-gray-500">•</span>
                            <span className="text-gray-400 text-xs">$100 entry</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button size="sm" variant="outline" className="border-nfl-light-gray bg-transparent text-white hover:bg-nfl-gray/30">
                          View Results
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="invites">
                <div className="space-y-4">
                  <Card className="bg-nfl-gray border-nfl-light-gray p-4">
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                      <div className="flex gap-4">
                        <div className="w-16 h-16 rounded bg-nfl-dark-gray flex items-center justify-center text-2xl font-bold text-nfl-yellow">
                          PL
                        </div>
                        <div>
                          <h3 className="text-white font-semibold text-lg">Pro League Invitational</h3>
                          <p className="text-gray-400 text-sm">8 members • Starting Week 4</p>
                          <div className="mt-1 flex items-center">
                            <span className="text-blue-400 text-xs font-medium bg-blue-400/20 px-2 py-0.5 rounded-full">
                              Invitation
                            </span>
                            <span className="mx-2 text-gray-500">•</span>
                            <span className="text-gray-400 text-xs">$75 entry</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button size="sm" className="bg-nfl-blue hover:bg-nfl-blue/80 text-white">
                          Accept
                        </Button>
                        <Button size="sm" variant="outline" className="border-nfl-light-gray bg-transparent text-white hover:bg-nfl-gray/30">
                          Decline
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="bg-nfl-gray border-nfl-light-gray p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Link to="/create-league">
                    <Button variant="outline" className="w-full border-nfl-light-gray bg-nfl-gray hover:bg-nfl-light-gray/20 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      Create New League
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full border-nfl-light-gray bg-nfl-gray hover:bg-nfl-light-gray/20 text-white">
                    Join League
                  </Button>
                  <Button variant="outline" className="w-full border-nfl-light-gray bg-nfl-gray hover:bg-nfl-light-gray/20 text-white">
                    Invite Friends
                  </Button>
                  <Button variant="outline" className="w-full border-nfl-light-gray bg-nfl-gray hover:bg-nfl-light-gray/20 text-white">
                    View Picks
                  </Button>
                </div>
              </div>
            </Card>
            
            <Card className="bg-nfl-gray border-nfl-light-gray p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Current Week</h3>
                <div className="bg-nfl-dark-gray rounded-lg p-4 text-center">
                  <div className="text-4xl font-bold text-nfl-blue">Week 3</div>
                  <p className="text-gray-400 mt-1">Sep 21 - Sep 25</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Picks Due:</span>
                    <span className="text-white font-medium">Thu, Sep 21, 8:15 PM ET</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">First Game:</span>
                    <span className="text-white font-medium">Giants @ 49ers</span>
                  </div>
                </div>
                <Button className="w-full bg-nfl-blue hover:bg-nfl-blue/80 text-white">
                  Make Picks
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Hub;
