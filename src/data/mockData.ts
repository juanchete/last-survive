
import { FantasyTeam, LeagueState, NFLTeam, Player, Week } from "@/types";

// NFL Teams mock data
export const nflTeams: NFLTeam[] = [
  { id: "1", name: "Arizona Cardinals", abbreviation: "ARI", eliminated: false, eliminationWeek: null },
  { id: "2", name: "Atlanta Falcons", abbreviation: "ATL", eliminated: false, eliminationWeek: null },
  { id: "3", name: "Baltimore Ravens", abbreviation: "BAL", eliminated: false, eliminationWeek: null },
  { id: "4", name: "Buffalo Bills", abbreviation: "BUF", eliminated: false, eliminationWeek: null },
  { id: "5", name: "Carolina Panthers", abbreviation: "CAR", eliminated: false, eliminationWeek: null },
  { id: "6", name: "Chicago Bears", abbreviation: "CHI", eliminated: false, eliminationWeek: null },
  { id: "7", name: "Cincinnati Bengals", abbreviation: "CIN", eliminated: false, eliminationWeek: null },
  { id: "8", name: "Cleveland Browns", abbreviation: "CLE", eliminated: false, eliminationWeek: null },
  { id: "9", name: "Dallas Cowboys", abbreviation: "DAL", eliminated: false, eliminationWeek: null },
  { id: "10", name: "Denver Broncos", abbreviation: "DEN", eliminated: false, eliminationWeek: null },
  { id: "11", name: "Detroit Lions", abbreviation: "DET", eliminated: false, eliminationWeek: null },
  { id: "12", name: "Green Bay Packers", abbreviation: "GB", eliminated: false, eliminationWeek: null },
  { id: "13", name: "Houston Texans", abbreviation: "HOU", eliminated: false, eliminationWeek: null },
  { id: "14", name: "Indianapolis Colts", abbreviation: "IND", eliminated: false, eliminationWeek: null },
  { id: "15", name: "Jacksonville Jaguars", abbreviation: "JAX", eliminated: false, eliminationWeek: null },
  { id: "16", name: "Kansas City Chiefs", abbreviation: "KC", eliminated: false, eliminationWeek: null },
  { id: "17", name: "Las Vegas Raiders", abbreviation: "LV", eliminated: false, eliminationWeek: null },
  { id: "18", name: "Los Angeles Chargers", abbreviation: "LAC", eliminated: false, eliminationWeek: null },
  { id: "19", name: "Los Angeles Rams", abbreviation: "LAR", eliminated: false, eliminationWeek: null },
  { id: "20", name: "Miami Dolphins", abbreviation: "MIA", eliminated: false, eliminationWeek: null },
  { id: "21", name: "Minnesota Vikings", abbreviation: "MIN", eliminated: false, eliminationWeek: null },
  { id: "22", name: "New England Patriots", abbreviation: "NE", eliminated: false, eliminationWeek: null },
  { id: "23", name: "New Orleans Saints", abbreviation: "NO", eliminated: false, eliminationWeek: null },
  { id: "24", name: "New York Giants", abbreviation: "NYG", eliminated: false, eliminationWeek: null },
  { id: "25", name: "New York Jets", abbreviation: "NYJ", eliminated: false, eliminationWeek: null },
  { id: "26", name: "Philadelphia Eagles", abbreviation: "PHI", eliminated: false, eliminationWeek: null },
  { id: "27", name: "Pittsburgh Steelers", abbreviation: "PIT", eliminated: false, eliminationWeek: null },
  { id: "28", name: "San Francisco 49ers", abbreviation: "SF", eliminated: false, eliminationWeek: null },
  { id: "29", name: "Seattle Seahawks", abbreviation: "SEA", eliminated: false, eliminationWeek: null },
  { id: "30", name: "Tampa Bay Buccaneers", abbreviation: "TB", eliminated: false, eliminationWeek: null },
  { id: "31", name: "Tennessee Titans", abbreviation: "TEN", eliminated: false, eliminationWeek: null },
  { id: "32", name: "Washington Commanders", abbreviation: "WAS", eliminated: false, eliminationWeek: null },
];

// Generate top players for each team
export const generatePlayers = (): Player[] => {
  const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const;
  const players: Player[] = [];

  // QB Names
  const qbNames = ["Patrick Mahomes", "Josh Allen", "Lamar Jackson", "Joe Burrow", "Jalen Hurts", 
                  "Justin Herbert", "Trevor Lawrence", "Dak Prescott", "Aaron Rodgers", "Kyler Murray"];
  
  // RB Names
  const rbNames = ["Christian McCaffrey", "Jonathan Taylor", "Derrick Henry", "Austin Ekeler", "Nick Chubb", 
                  "Saquon Barkley", "Dalvin Cook", "Alvin Kamara", "Joe Mixon", "Josh Jacobs"];
  
  // WR Names
  const wrNames = ["Justin Jefferson", "Ja'Marr Chase", "Tyreek Hill", "Cooper Kupp", "Stefon Diggs", 
                  "Davante Adams", "CeeDee Lamb", "A.J. Brown", "DeVonta Smith", "Amon-Ra St. Brown"];
  
  // TE Names
  const teNames = ["Travis Kelce", "Mark Andrews", "T.J. Hockenson", "George Kittle", "Dallas Goedert", 
                  "Kyle Pitts", "Darren Waller", "Evan Engram", "Pat Freiermuth", "David Njoku"];
  
  // K Names
  const kNames = ["Justin Tucker", "Harrison Butker", "Evan McPherson", "Daniel Carlson", "Jake Elliott",
                 "Ryan Succop", "Jason Myers", "Cairo Santos", "Tyler Bass", "Brandon McManus"];

  // Create players with team associations
  let idCounter = 1;
  
  // Add quarterbacks
  qbNames.forEach((name, index) => {
    const teamIndex = index % nflTeams.length;
    players.push({
      id: (idCounter++).toString(),
      name,
      position: 'QB',
      team: nflTeams[teamIndex].abbreviation,
      stats: {
        passingYards: Math.floor(Math.random() * 2000) + 2000,
        passingTD: Math.floor(Math.random() * 15) + 10,
        rushingYards: Math.floor(Math.random() * 300),
        rushingTD: Math.floor(Math.random() * 3)
      },
      available: true,
      eliminated: false,
      points: Math.floor(Math.random() * 120) + 80
    });
  });
  
  // Add running backs
  rbNames.forEach((name, index) => {
    const teamIndex = (index + 3) % nflTeams.length;
    players.push({
      id: (idCounter++).toString(),
      name,
      position: 'RB',
      team: nflTeams[teamIndex].abbreviation,
      stats: {
        rushingYards: Math.floor(Math.random() * 800) + 400,
        rushingTD: Math.floor(Math.random() * 8) + 3,
        receivingYards: Math.floor(Math.random() * 300) + 100,
        receivingTD: Math.floor(Math.random() * 3)
      },
      available: true,
      eliminated: false,
      points: Math.floor(Math.random() * 100) + 60
    });
  });
  
  // Add wide receivers
  wrNames.forEach((name, index) => {
    const teamIndex = (index + 7) % nflTeams.length;
    players.push({
      id: (idCounter++).toString(),
      name,
      position: 'WR',
      team: nflTeams[teamIndex].abbreviation,
      stats: {
        receivingYards: Math.floor(Math.random() * 800) + 400,
        receivingTD: Math.floor(Math.random() * 8) + 3
      },
      available: true,
      eliminated: false,
      points: Math.floor(Math.random() * 110) + 50
    });
  });
  
  // Add tight ends
  teNames.forEach((name, index) => {
    const teamIndex = (index + 12) % nflTeams.length;
    players.push({
      id: (idCounter++).toString(),
      name,
      position: 'TE',
      team: nflTeams[teamIndex].abbreviation,
      stats: {
        receivingYards: Math.floor(Math.random() * 500) + 300,
        receivingTD: Math.floor(Math.random() * 6) + 2
      },
      available: true,
      eliminated: false,
      points: Math.floor(Math.random() * 80) + 40
    });
  });
  
  // Add kickers
  kNames.forEach((name, index) => {
    const teamIndex = (index + 18) % nflTeams.length;
    players.push({
      id: (idCounter++).toString(),
      name,
      position: 'K',
      team: nflTeams[teamIndex].abbreviation,
      stats: {
        fieldGoals: Math.floor(Math.random() * 15) + 10
      },
      available: true,
      eliminated: false,
      points: Math.floor(Math.random() * 60) + 30
    });
  });
  
  // Add defense/special teams
  nflTeams.forEach((team) => {
    players.push({
      id: (idCounter++).toString(),
      name: team.name + " D/ST",
      position: 'DEF',
      team: team.abbreviation,
      stats: {
        tackles: Math.floor(Math.random() * 60) + 40,
        sacks: Math.floor(Math.random() * 25) + 15,
        interceptions: Math.floor(Math.random() * 10) + 5
      },
      available: true,
      eliminated: false,
      points: Math.floor(Math.random() * 70) + 30
    });
  });

  return players;
};

// Initial fantasy teams
export const fantasyTeams: FantasyTeam[] = [
  { id: "1", name: "Touchdown Titans", owner: "User", players: [], points: 0, rank: 1, eliminated: false },
  { id: "2", name: "Gridiron Giants", owner: "AI 1", players: [], points: 0, rank: 2, eliminated: false },
  { id: "3", name: "Red Zone Raiders", owner: "AI 2", players: [], points: 0, rank: 3, eliminated: false },
  { id: "4", name: "Fantasy Falcons", owner: "AI 3", players: [], points: 0, rank: 4, eliminated: false },
  { id: "5", name: "Goalpost Guardians", owner: "AI 4", players: [], points: 0, rank: 5, eliminated: false },
  { id: "6", name: "Pigskin Pioneers", owner: "AI 5", players: [], points: 0, rank: 6, eliminated: false },
  { id: "7", name: "Touchdown Tyrants", owner: "AI 6", players: [], points: 0, rank: 7, eliminated: false },
  { id: "8", name: "Field Goal Fighters", owner: "AI 7", players: [], points: 0, rank: 8, eliminated: false },
];

// Generate weeks data
export const generateWeeks = (): Week[] => {
  const weeks: Week[] = [];
  for (let i = 1; i <= 18; i++) {
    weeks.push({
      number: i,
      status: i === 1 ? 'active' : 'upcoming',
      eliminatedTeam: null
    });
  }
  return weeks;
};

// Initial league state
export const initialLeagueState: LeagueState = {
  currentWeek: 1,
  teams: fantasyTeams,
  availablePlayers: generatePlayers(),
  nflTeams: nflTeams,
  weeks: generateWeeks(),
  draftInProgress: false
};
