
import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface WaiverFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  positionFilter: string;
  setPositionFilter: (value: string) => void;
}

export function WaiverFilters({ 
  searchTerm, 
  setSearchTerm, 
  positionFilter, 
  setPositionFilter 
}: WaiverFiltersProps) {
  return (
    <div className="flex gap-4">
      <div className="flex-1 relative group">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-nfl-blue transition-colors" />
        <Input
          placeholder="Search by name or team..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-nfl-dark-gray/50 border-nfl-light-gray/30 text-white placeholder-gray-400 focus:border-nfl-blue focus:ring-2 focus:ring-nfl-blue/20 transition-all duration-200"
        />
      </div>
      <Select value={positionFilter} onValueChange={setPositionFilter}>
        <SelectTrigger className="w-40 bg-nfl-dark-gray/50 border-nfl-light-gray/30 text-white focus:border-nfl-blue focus:ring-2 focus:ring-nfl-blue/20 transition-all duration-200">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-nfl-dark-gray border-nfl-light-gray/30">
          <SelectItem value="ALL">All Positions</SelectItem>
          <SelectItem value="QB">Quarterback</SelectItem>
          <SelectItem value="RB">Running Back</SelectItem>
          <SelectItem value="WR">Wide Receiver</SelectItem>
          <SelectItem value="TE">Tight End</SelectItem>
          <SelectItem value="K">Kicker</SelectItem>
          <SelectItem value="DEF">Defense</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
