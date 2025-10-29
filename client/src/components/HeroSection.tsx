import { Button } from "@/components/ui/button";
import heroImage from "@assets/generated_images/African_farmers_in_green_field_384a0c6c.png";

interface HeroSectionProps {
  onGetStarted: () => void;
}

export default function HeroSection({ onGetStarted }: HeroSectionProps) {
  return (
    <section 
      className="relative min-h-[85vh] flex items-center justify-center"
      style={{
        backgroundImage: `url(${heroImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-8 text-center">
        <h1 className="text-5xl md:text-7xl font-bold font-display text-white leading-tight mb-6">
          Empowering Farmers with Access to Fertilizer Credit
        </h1>
        <p className="text-lg md:text-xl text-white/90 leading-relaxed mb-8 max-w-2xl mx-auto">
          Gladfore helps farmers get fertilizers faster by paying only 50% upfront
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            size="lg" 
            className="px-8 py-6 text-lg rounded-full backdrop-blur-md bg-primary/90 border-2 border-primary-foreground/20 hover-elevate active-elevate-2"
            onClick={onGetStarted}
            data-testid="button-get-started"
          >
            Get Started
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="px-8 py-6 text-lg rounded-full backdrop-blur-md bg-white/10 border-2 border-white/30 text-white hover:text-white hover-elevate active-elevate-2"
            onClick={() => console.log('Learn more clicked')}
            data-testid="button-learn-more"
          >
            Learn More
          </Button>
        </div>
      </div>
    </section>
  );
}
