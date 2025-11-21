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
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-display text-white leading-tight mb-4 sm:mb-6">
          Empowering Farmers with Access to Fertilizer Credit
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-white/90 leading-relaxed mb-6 sm:mb-8 max-w-2xl mx-auto">
          Gladfore helps farmers get fertilizers faster by paying only 50% upfront
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <Button 
            size="default" 
            className="px-6 py-5 sm:px-8 sm:py-6 text-sm sm:text-base rounded-full backdrop-blur-md bg-primary/90 border-2 border-primary-foreground/20 hover-elevate active-elevate-2"
            onClick={onGetStarted}
            data-testid="button-get-started"
          >
            Get Started
          </Button>
          <Button 
            size="default" 
            variant="outline" 
            className="px-6 py-5 sm:px-8 sm:py-6 text-sm sm:text-base rounded-full backdrop-blur-md bg-white/10 border-2 border-white/30 text-white hover:text-white hover-elevate active-elevate-2"
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
