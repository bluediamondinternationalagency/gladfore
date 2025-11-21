import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sprout, LogIn, Menu, X } from "lucide-react";
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import WhyChoose from "@/components/WhyChoose";
import TrustIndicators from "@/components/TrustIndicators";
import CTAFooter from "@/components/CTAFooter";
import WaitlistModal from "@/components/waitlist/WaitlistModal";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistUserType, setWaitlistUserType] = useState<"farmer" | "agent">("farmer");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleGetStarted = () => {
    setWaitlistUserType("farmer");
    setWaitlistOpen(true);
  };

  const handleSignUpFarmer = () => {
    setWaitlistUserType("farmer");
    setWaitlistOpen(true);
  };

  const handleSignUpAgent = () => {
    setWaitlistUserType("agent");
    setWaitlistOpen(true);
  };

  const handleLogin = () => {
    setLocation('/login');
  };

  return (
    <div className="min-h-screen">
      {/* Navigation Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <Sprout className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-gray-900">Gladfore</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              >
                How It Works
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => document.getElementById('why-choose')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Why Choose Us
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleLogin}
                className="gap-1.5"
              >
                <LogIn className="w-4 h-4" />
                Login
              </Button>
              <Button 
                size="sm"
                onClick={handleGetStarted}
              >
                Join Waitlist
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleLogin}
                className="gap-1.5"
              >
                <LogIn className="w-4 h-4" />
                Login
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200">
              <div className="flex flex-col gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="justify-start"
                  onClick={() => {
                    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                    setMobileMenuOpen(false);
                  }}
                >
                  How It Works
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="justify-start"
                  onClick={() => {
                    document.getElementById('why-choose')?.scrollIntoView({ behavior: 'smooth' });
                    setMobileMenuOpen(false);
                  }}
                >
                  Why Choose Us
                </Button>
                <Button 
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    handleGetStarted();
                    setMobileMenuOpen(false);
                  }}
                >
                  Join Waitlist
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Add padding to account for fixed header */}
      <div className="pt-14 sm:pt-16">
        <HeroSection onGetStarted={handleGetStarted} />
        <div id="how-it-works">
          <HowItWorks />
        </div>
        <div id="why-choose">
          <WhyChoose />
        </div>
        <TrustIndicators />
        <CTAFooter onSignUpFarmer={handleSignUpFarmer} onSignUpAgent={handleSignUpAgent} />
      </div>
      
      {/* Waitlist Modal */}
      <WaitlistModal 
        open={waitlistOpen} 
        onOpenChange={setWaitlistOpen}
        defaultUserType={waitlistUserType}
      />
    </div>
  );
}
