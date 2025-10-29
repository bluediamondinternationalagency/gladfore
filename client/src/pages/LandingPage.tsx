import { useLocation } from "wouter";
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import WhyChoose from "@/components/WhyChoose";
import TrustIndicators from "@/components/TrustIndicators";
import CTAFooter from "@/components/CTAFooter";

export default function LandingPage() {
  const [, setLocation] = useLocation();

  const handleGetStarted = () => {
    console.log('Get started clicked');
    setLocation('/login');
  };

  const handleSignUpFarmer = () => {
    console.log('Sign up as farmer clicked');
    setLocation('/login');
  };

  const handleSignUpAgent = () => {
    console.log('Sign up as agent clicked');
    setLocation('/login');
  };

  return (
    <div className="min-h-screen">
      <HeroSection onGetStarted={handleGetStarted} />
      <HowItWorks />
      <WhyChoose />
      <TrustIndicators />
      <CTAFooter onSignUpFarmer={handleSignUpFarmer} onSignUpAgent={handleSignUpAgent} />
    </div>
  );
}
