import { Layout } from "@/components/Layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast";
import { useLeagueStore } from "@/store/leagueStore";
import { CheckCircle, Search } from "lucide-react";
import { useEffect, useState } from "react";

const BrowseLeagues = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [leagues, setLeagues] = useState([
    {
      id: '1',
      name: 'NFL Pickem League',
      description: 'A fun league for NFL pickem',
      participants: 25,
      maxParticipants: 50,
      entryFee: 10,
      admin: 'JohnDoe',
      status: 'open',
    },
    {
      id: '2',
      name: 'Premier League Fantasy',
      description: 'Fantasy league for the English Premier League',
      participants: 12,
      maxParticipants: 20,
      entryFee: 20,
      admin: 'JaneSmith',
      status: 'inviteOnly',
    },
    {
      id: '3',
      name: 'NBA Prediction Challenge',
      description: 'Predict the winners of NBA games',
      participants: 8,
      maxParticipants: 10,
      entryFee: 5,
      admin: 'AliceJohnson',
      status: 'open',
    },
    {
      id: '4',
      name: 'MLB Home Run Derby',
      description: 'Bet on who will hit the most home runs in MLB',
      participants: 30,
      maxParticipants: 60,
      entryFee: 15,
      admin: 'BobWilliams',
      status: 'open',
    },
    {
      id: '5',
      name: 'NHL Playoff Bracket',
      description: 'Create your bracket for the NHL playoffs',
      participants: 15,
      maxParticipants: 30,
      entryFee: 25,
      admin: 'CharlieBrown',
      status: 'inviteOnly',
    },
  ]);

  const [filteredLeagues, setFilteredLeagues] = useState(leagues);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [requestSent, setRequestSent] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const { toast } = useToast();
	const addLeague = useLeagueStore((state) => state.addLeague);

  useEffect(() => {
    const results = leagues.filter(league =>
      league.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      league.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      league.admin.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredLeagues(results);
  }, [searchTerm, leagues]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleLeagueSelect = (league) => {
    setSelectedLeague(league);
    setRequestSent(false);
    setIsMember(false);
  };

  const handleJoinLeague = () => {
    if (selectedLeague && selectedLeague.status === 'inviteOnly') {
      // Simulate sending a request
      setRequestSent(true);
      toast({
        title: "Request Sent",
        description: "Request sent! You'll be notified when the league owner responds.",
      })
    } else if (selectedLeague && selectedLeague.status === 'open') {
      // Simulate joining the league
      setIsMember(true);
			addLeague(selectedLeague.name);
      toast({
        title: "Success!",
        description: "You've joined the league. Head over to your dashboard to start playing!",
      })
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-white mb-8">Browse Leagues</h1>

        {/* Search Input */}
        <div className="relative mb-6">
          <Input
            type="text"
            placeholder="Search for leagues..."
            className="bg-nfl-gray border-nfl-light-gray text-white pl-12"
            value={searchTerm}
            onChange={handleSearchChange}
          />
          <Search className="absolute left-4 top-3 h-6 w-6 text-nfl-light-gray" />
        </div>

        {/* League Table */}
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableCaption>A list of your recent invoices.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="text-left text-white">League Name</TableHead>
                <TableHead className="text-left text-white">Description</TableHead>
                <TableHead className="text-left text-white">Participants</TableHead>
                <TableHead className="text-left text-white">Entry Fee</TableHead>
                <TableHead className="text-left text-white">Admin</TableHead>
                <TableHead className="text-left text-white">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeagues.map((league) => (
                <TableRow key={league.id} className="cursor-pointer hover:bg-nfl-dark-gray" onClick={() => handleLeagueSelect(league)}>
                  <TableCell className="font-medium text-white">{league.name}</TableCell>
                  <TableCell className="text-nfl-light-gray">{league.description}</TableCell>
                  <TableCell className="text-nfl-light-gray">{league.participants} / {league.maxParticipants}</TableCell>
                  <TableCell className="text-nfl-light-gray">${league.entryFee}</TableCell>
                  <TableCell className="text-nfl-light-gray">{league.admin}</TableCell>
                  <TableCell className="text-nfl-light-gray">{league.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* League Details */}
        {selectedLeague && (
          <div className="mt-8">
            <Card className="bg-nfl-dark border border-nfl-light-gray">
              <CardHeader>
                <CardTitle className="text-white">{selectedLeague.name}</CardTitle>
                <CardDescription className="text-nfl-light-gray">{selectedLeague.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-nfl-light-gray">
                  <p>Participants: {selectedLeague.participants} / {selectedLeague.maxParticipants}</p>
                  <p>Entry Fee: ${selectedLeague.entryFee}</p>
                  <p>Admin: {selectedLeague.admin}</p>
                  <p>Status: {selectedLeague.status}</p>
                </div>
                {requestSent && (
                  <Alert variant="default" className="border-green-500">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertTitle>Request Sent!</AlertTitle>
                    <AlertDescription className="text-green-500">
                      Request sent! You'll be notified when the league owner responds.
                    </AlertDescription>
                  </Alert>
                )}
                {isMember && (
                  <Alert variant="default" className="border-green-500">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertTitle>Success!</AlertTitle>
                    <AlertDescription>
                      You've joined the league. Head over to your dashboard to start playing!
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  className="bg-nfl-blue hover:bg-nfl-blue/80 text-white"
                  onClick={handleJoinLeague}
                  disabled={requestSent || isMember}
                >
                  {selectedLeague.status === 'inviteOnly' ? (
                    requestSent ? 'Request Sent' : 'Request to Join'
                  ) : isMember ? 'Joined' : 'Join League'}
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default BrowseLeagues;
