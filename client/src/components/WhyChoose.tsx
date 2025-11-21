import { Shield, TrendingUp, Zap, Users } from "lucide-react";
import { Card } from "@/components/ui/card";

const features = [
  {
    icon: Shield,
    title: "Secure",
    points: [
      "Bank-level encryption",
      "Verified user authentication",
      "Protected payment processing",
    ],
  },
  {
    icon: TrendingUp,
    title: "Transparent",
    points: [
      "Real-time payment tracking",
      "Clear approval workflows",
      "Complete order history",
    ],
  },
  {
    icon: Zap,
    title: "Fast",
    points: [
      "Mobile-first experience",
      "Instant order processing",
      "Quick approval turnaround",
    ],
  },
  {
    icon: Users,
    title: "Trusted",
    points: [
      "Used by 1000+ farmers",
      "98% approval rate",
      "Dedicated agent support",
    ],
  },
];

export default function WhyChoose() {
  return (
    <section id="why-choose" className="py-12 sm:py-16 md:py-20 lg:py-24 bg-muted/30" data-testid="section-why-choose">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display text-center mb-3 sm:mb-4">
          Why Choose Gladfore
        </h2>
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground text-center mb-10 sm:mb-12 md:mb-16 max-w-2xl mx-auto">
          The most reliable platform for agricultural financing
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
          {features.map((feature) => (
            <Card key={feature.title} className="p-5 sm:p-6 md:p-8 hover-elevate">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-semibold mb-3 sm:mb-4">
                    {feature.title}
                  </h3>
                  <ul className="space-y-2">
                    {feature.points.map((point, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm sm:text-base text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
