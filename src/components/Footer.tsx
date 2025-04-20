
import { Award } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-nfl-darker border-t border-nfl-light-gray mt-16 py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-nfl-blue" />
            <h2 className="text-xl font-bold bg-gradient-to-r from-nfl-blue to-nfl-lightblue bg-clip-text text-transparent">
              Survivor Fantasy
            </h2>
          </div>
          
          <nav>
            <ul className="flex flex-wrap gap-6 justify-center">
              <li>
                <Link to="/dashboard" className="text-gray-400 hover:text-white transition duration-200">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/standings" className="text-gray-400 hover:text-white transition duration-200">
                  Standings
                </Link>
              </li>
              <li>
                <Link to="/draft" className="text-gray-400 hover:text-white transition duration-200">
                  Draft
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="text-gray-400 hover:text-white transition duration-200">
                  How It Works
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        
        <div className="mt-8 pt-6 border-t border-nfl-light-gray/20 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} Survivor Fantasy. All NFL team names, logos and related marks are trademarks of their respective teams.</p>
        </div>
      </div>
    </footer>
  );
}
