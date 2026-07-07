import { motion } from 'framer-motion';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { ShieldCheck, Feather, HeartHandshake, Sparkles } from 'lucide-react';

export default function BrandValues() {
  const { ref, controls } = useScrollAnimation();

  const values = [
    {
      icon: <ShieldCheck className="w-8 h-8 stroke-1" />,
      title: "Quality Craftsmanship",
      description: "Each piece is meticulously crafted using time-honored techniques and the finest materials."
    },
    {
      icon: <Feather className="w-8 h-8 stroke-1" />,
      title: "Effortless Comfort",
      description: "True luxury must be lived in. We design for movement, ensuring absolute comfort without compromising elegance."
    },
    {
      icon: <Sparkles className="w-8 h-8 stroke-1" />,
      title: "Refined Sophistication",
      description: "Our aesthetic is defined by quiet confidence—understated details that speak volumes."
    },
    {
      icon: <HeartHandshake className="w-8 h-8 stroke-1" />,
      title: "Women First",
      description: "Designed by women, for women. We understand the nuances of the female form and the demands of modern life."
    }
  ];

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 md:px-8">
        <motion.div 
          ref={ref}
          initial="hidden"
          animate={controls}
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { duration: 1 } }
          }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 text-center"
        >
          {values.map((value, index) => (
            <motion.div 
              key={index}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay: index * 0.15 } }
              }}
              className="flex flex-col items-center"
            >
              <div className="mb-6 text-primary p-4 rounded-full bg-card border border-border">
                {value.icon}
              </div>
              <h3 className="font-serif text-xl mb-3 text-foreground">{value.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{value.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
