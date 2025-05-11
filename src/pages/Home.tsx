import { Button } from "@/components/ui/button";
import { ArrowRight, Star, Check, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { HeroStadium } from "@/components/ui/shape-landing-hero";
import { Layout } from "@/components/Layout";
import { TestimonialSection } from "@/components/TestimonialSection";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

export default function Home() {

  const { user, loading } = useAuth();
  if (!loading && user) {
    return <Navigate to="/hub" replace />;
  }
  
  return (
    <Layout>
      <div className="flex flex-col bg-nfl-dark">
        {/* Modern Hero Section */}
        <HeroStadium />
        
        {/* Features Section */}
        <div className="relative py-24 overflow-hidden">
          {/* Background elements */}
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-nfl-darker to-transparent"></div>
            <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-nfl-darker to-transparent"></div>
            <div className="absolute top-1/3 -left-20 w-72 h-72 rounded-full bg-nfl-blue/5 blur-3xl"></div>
            <div className="absolute bottom-1/3 -right-20 w-72 h-72 rounded-full bg-nfl-blue/5 blur-3xl"></div>
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-3">
                <Star className="w-4 h-4 text-nfl-blue" />
                <span className="text-sm font-medium text-white">Unique Fantasy Experience</span>
              </div>
              
              <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-nfl-blue bg-clip-text text-transparent">
                How Survivor Fantasy Works
              </h2>
              
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                Our unique elimination format keeps every week exciting and strategic
              </p>
            </motion.div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: <motion.div 
                          initial={{ rotate: 0 }}
                          whileInView={{ rotate: 360 }}
                          transition={{ duration: 1, delay: 0.3 }}
                          viewport={{ once: true }}
                          className="w-12 h-12 bg-gradient-to-br from-nfl-blue to-white/70 rounded-xl flex items-center justify-center mb-6">
                          <span className="text-nfl-dark font-bold text-xl">1</span>
                        </motion.div>,
                  title: "Weekly Eliminations",
                  description: "Each week, the team with the lowest score is eliminated from the league, making their players available for others."
                },
                {
                  icon: <motion.div 
                          initial={{ rotate: 0 }}
                          whileInView={{ rotate: 360 }}
                          transition={{ duration: 1, delay: 0.5 }}
                          viewport={{ once: true }}
                          className="w-12 h-12 bg-gradient-to-br from-nfl-blue to-white/70 rounded-xl flex items-center justify-center mb-6">
                          <span className="text-nfl-dark font-bold text-xl">2</span>
                        </motion.div>,
                  title: "Strategic Redrafting",
                  description: "Keep your team competitive by drafting newly available players to replace underperformers or fill roster gaps."
                },
                {
                  icon: <motion.div 
                          initial={{ rotate: 0 }}
                          whileInView={{ rotate: 360 }}
                          transition={{ duration: 1, delay: 0.7 }}
                          viewport={{ once: true }}
                          className="w-12 h-12 bg-gradient-to-br from-nfl-blue to-white/70 rounded-xl flex items-center justify-center mb-6">
                          <span className="text-nfl-dark font-bold text-xl">3</span>
                        </motion.div>,
                  title: "Survive & Win",
                  description: "Accumulate points throughout the season. The last team standing with the most points wins the championship."
                }
              ].map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.7, delay: i * 0.1 }}
                  className="relative"
                >
                  <Card className="h-full relative overflow-hidden border-0 bg-gradient-to-b from-white/10 to-transparent backdrop-blur-sm">
                    <div className="absolute inset-0 bg-gradient-to-br from-nfl-blue/10 via-transparent to-transparent opacity-70"></div>
                    <CardContent className="p-8 relative z-10">
                      {feature.icon}
                      <h3 className="text-2xl font-bold mb-4 text-white">{feature.title}</h3>
                      <p className="text-gray-400 leading-relaxed">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Testimonial Section */}
        <TestimonialSection />

        {/* Stats Section */}
        <div className="py-24 relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-r from-nfl-blue/5 to-transparent"></div>
          </div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid md:grid-cols-3 gap-10 lg:gap-20 text-center">
              {[
                { value: "18", label: "Weeks of Gameplay", delay: 0 },
                { value: "32", label: "NFL Teams", delay: 0.2 },
                { value: "1", label: "Champion", delay: 0.4 },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: stat.delay }}
                  className="relative"
                >
                  <motion.div
                    initial={{ scale: 0.8 }}
                    whileInView={{ scale: 1 }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 100, 
                      delay: stat.delay 
                    }}
                    viewport={{ once: true }}
                    className="mb-4 mx-auto"
                  >
                    <div className="relative mx-auto">
                      <div className="absolute -inset-6 rounded-full bg-nfl-blue/10 blur-lg"></div>
                      <div className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-white to-nfl-blue bg-clip-text text-transparent relative">
                        {stat.value}
                      </div>
                    </div>
                  </motion.div>
                  <div className="text-lg font-medium text-gray-400">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
        
        {/* CTA Section */}
        <div className="py-20 relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-b from-nfl-darker via-nfl-dark to-nfl-darker"></div>
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-nfl-blue/50 to-transparent"></div>
            <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-nfl-blue/50 to-transparent"></div>
          </div>
          
          <div className="container mx-auto px-4 max-w-4xl text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-nfl-blue/10 border border-nfl-blue/20 mb-6">
                <Users className="w-4 h-4 text-nfl-blue" />
                <span className="text-sm font-medium text-white">Join Our Community</span>
              </div>
              
              <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-nfl-blue bg-clip-text text-transparent">
                Ready to Experience Fantasy Football 
                <span className="block">in a New Way?</span>
              </h2>
              
              <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
                Join now and be part of our growing community of fantasy football enthusiasts
                who are experiencing the thrill of the Survivor format.
              </p>
              
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button asChild className="bg-gradient-to-r from-nfl-blue to-nfl-lightblue hover:from-nfl-lightblue hover:to-nfl-blue text-white text-lg h-14 px-10 rounded-xl shadow-lg shadow-nfl-blue/20">
                  <Link to="/dashboard" className="flex items-center gap-2">
                    Start Playing Now
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
