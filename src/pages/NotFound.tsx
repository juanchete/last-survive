
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-nfl-darker to-nfl-dark p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center"
        >
          <div className="relative">
            <motion.div
              animate={{ rotate: [0, 10, -10, 10, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
              className="text-nfl-blue text-9xl font-bold"
            >
              404
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="absolute -top-6 right-0"
            >
              <AlertTriangle size={32} className="text-nfl-yellow" />
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h2 className="text-2xl font-bold text-white mb-2">Page Not Found</h2>
          <div className="bg-nfl-gray/30 backdrop-blur-sm rounded-lg p-6 shadow-lg border border-nfl-blue/20">
            <p className="text-nfl-lightblue mb-4">
              Oops! The page you're looking for doesn't exist.
            </p>
            <p className="text-gray-300 text-sm mb-6">
              The URL <span className="text-nfl-red font-mono">{location.pathname}</span> could not be found.
            </p>
            <Button
              variant="default"
              size="lg"
              className="bg-nfl-blue hover:bg-nfl-blue/80 transition-all duration-300 transform hover:scale-105"
              asChild
            >
              <a href="/">Return to Home Field</a>
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;
