
import { motion } from "framer-motion";

const testimonials = [
  {
    name: "Jessica Sullivan",
    text: "The Survivor Fantasy league is such a game-changer—every week feels thrilling! The blue-and-white design is clean and sharp. Highly recommend!",
    img: "/lovable-uploads/photo-1649972904349-6e44c42644a7",
    team: "Gridiron Mavericks"
  },
  {
    name: "Evan Roberts",
    text: "I love the drama of the eliminations! Watching my friends sweat as their teams get knocked out is the best part. It’s elegant, fun, and easy to use.",
    img: "/lovable-uploads/photo-1581091226825-a6a2a5aee158",
    team: "End Zone Elite"
  },
  {
    name: "Priya Nair",
    text: "Survivor Fantasy keeps me engaged the whole season, and the interface is beautiful. Draft night is an absolute blast every time!",
    img: "/lovable-uploads/photo-1486312338219-ce68d2c6f44d",
    team: "Touchdown Titans"
  },
];

export function TestimonialSection() {
  return (
    <section className="py-16 bg-gradient-to-b from-[#1EAEDB]/10 to-white/90">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12 text-[#1EAEDB]">
          What Our Users Say
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              className="flex flex-col items-center bg-white rounded-xl border border-[#33C3F0]/30 shadow-xl p-8 transition-transform hover:scale-105"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.7, delay: i * 0.08, type: "spring", stiffness: 60 }}
            >
              <img
                src={t.img}
                alt={t.name}
                className="w-20 h-20 rounded-full border-4 border-[#33C3F0]/60 mb-4 object-cover shadow-lg bg-[#E7F6FB]"
              />
              <blockquote className="text-[#005174] text-base font-medium mb-4 text-center min-h-[90px]">&ldquo;{t.text}&rdquo;</blockquote>
              <div className="text-[#1EAEDB] font-bold">{t.name}</div>
              <div className="text-xs text-[#338ECF] font-semibold">{t.team}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

