
import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";

const testimonials = [
  {
    name: "Jessica Sullivan",
    text: "The Survivor Fantasy league is such a game-changer—every week feels thrilling! The weekly eliminations keep me on my toes all season long.",
    img: "/lovable-uploads/photo-1649972904349-6e44c42644a7",
    team: "Gridiron Mavericks",
    rating: 5
  },
  {
    name: "Evan Roberts",
    text: "I love the drama of the eliminations! Watching my friends sweat as their teams get knocked out is the best part. It's elegant, fun, and easy to use.",
    img: "/lovable-uploads/photo-1581091226825-a6a2a5aee158",
    team: "End Zone Elite",
    rating: 5
  },
  {
    name: "Priya Nair",
    text: "Survivor Fantasy keeps me engaged the whole season, and the interface is beautiful. Draft night is an absolute blast every time!",
    img: "/lovable-uploads/photo-1486312338219-ce68d2c6f44d",
    team: "Touchdown Titans",
    rating: 4
  },
];

export function TestimonialSection() {
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star 
        key={i} 
        className={`w-4 h-4 ${i < rating ? "text-nfl-blue fill-nfl-blue" : "text-gray-300"}`} 
      />
    ));
  };

  return (
    <section className="py-20 bg-gradient-to-b from-nfl-dark via-nfl-darker to-nfl-dark relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-32 -left-32 w-64 h-64 rounded-full bg-nfl-blue/30 blur-3xl"></div>
        <div className="absolute top-1/2 -right-32 w-96 h-96 rounded-full bg-nfl-blue/20 blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-nfl-blue/10 border border-nfl-blue/20 mb-3"
          >
            <Check className="w-4 h-4 text-nfl-blue" />
            <span className="text-sm font-medium text-white">What Our Users Say</span>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-nfl-blue bg-clip-text text-transparent"
          >
            Join Thousands of Happy Players
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
            className="text-lg text-gray-400 max-w-2xl mx-auto"
          >
            Our community of fantasy football enthusiasts love the unique elimination format
          </motion.p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              className="flex flex-col h-full bg-gradient-to-b from-white/5 to-white/[0.02] backdrop-blur-sm rounded-2xl border border-white/10 p-8 shadow-xl"
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.7, delay: i * 0.15 }}
              whileHover={{ y: -10, transition: { duration: 0.3 } }}
            >
              <div className="flex items-start mb-6">
                <div className="relative">
                  <img
                    src={t.img}
                    alt={t.name}
                    className="w-16 h-16 rounded-full object-cover shadow-lg"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-nfl-blue rounded-full p-1">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <div className="text-white font-bold text-lg">{t.name}</div>
                  <div className="text-nfl-blue text-sm">{t.team}</div>
                  <div className="flex mt-1">
                    {renderStars(t.rating)}
                  </div>
                </div>
              </div>
              
              <blockquote className="text-gray-300 flex-grow mb-4">"{t.text}"</blockquote>
              
              <div className="mt-auto pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Verified Member</span>
                  <span className="text-xs text-nfl-blue">Season 2024</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
