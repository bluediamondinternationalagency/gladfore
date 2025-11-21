import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseHeaders } from "@/lib/api";
import {
  STATES,
  getLGAsByState,
  CROP_TYPES,
  NIGERIAN_LANGUAGES,
} from "@/lib/nigeriaLocations";
import {
  User,
  MapPin,
  Briefcase,
  Users,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface WaitlistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultUserType?: "farmer" | "agent";
}

interface WaitlistFormData {
  // User type
  userType: "farmer" | "agent";
  
  // Basic info
  fullName: string;
  email?: string;
  phone: string;
  dateOfBirth?: string;
  gender?: string;
  
  // Location
  state: string;
  lga: string;
  townVillage?: string;
  address?: string;
  
  // ID
  nin?: string;
  idType?: string;
  idNumber?: string;
  
  // Farmer specific
  farmSize?: string;
  farmLocation?: string;
  cropTypes?: string[];
  yearsOfFarmingExperience?: number;
  landOwnership?: string;
  farmingType?: string;
  hasBankAccount?: boolean;
  bankName?: string;
  accountNumber?: string;
  
  // Agent specific
  educationLevel?: string;
  previousSalesExperience?: boolean;
  salesExperienceYears?: number;
  hasSmartphone?: boolean;
  hasInternetAccess?: boolean;
  preferredCoverageArea?: string;
  languagesSpoken?: string[];
  
  // Guarantor
  guarantorName?: string;
  guarantorPhone?: string;
  guarantorRelationship?: string;
  guarantorAddress?: string;
  
  // Additional
  howDidYouHear?: string;
  referralCode?: string;
}

export default function WaitlistModal({
  open,
  onOpenChange,
  defaultUserType = "farmer",
}: WaitlistModalProps) {
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState<"farmer" | "agent">(defaultUserType);
  const [selectedState, setSelectedState] = useState("");
  const [selectedCrops, setSelectedCrops] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const { toast } = useToast();

  const { register, watch, setValue, handleSubmit, reset, formState: { errors } } = useForm<WaitlistFormData>({
    defaultValues: {
      userType: defaultUserType,
    },
  });

  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;

  const submitMutation = useMutation({
    mutationFn: async (data: WaitlistFormData) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/waitlist`,
        {
          method: "POST",
          headers: {
            ...getSupabaseHeaders(),
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            user_type: data.userType,
            full_name: data.fullName,
            email: data.email,
            phone: data.phone,
            date_of_birth: data.dateOfBirth,
            gender: data.gender,
            state: data.state,
            lga: data.lga,
            town_village: data.townVillage,
            address: data.address,
            nin: data.nin,
            id_type: data.idType,
            id_number: data.idNumber,
            // Farmer fields
            farm_size: data.farmSize,
            farm_location: data.farmLocation,
            crop_types: data.cropTypes,
            years_of_farming_experience: data.yearsOfFarmingExperience,
            land_ownership: data.landOwnership,
            farming_type: data.farmingType,
            has_bank_account: data.hasBankAccount,
            bank_name: data.bankName,
            account_number: data.accountNumber,
            // Agent fields
            education_level: data.educationLevel,
            previous_sales_experience: data.previousSalesExperience,
            sales_experience_years: data.salesExperienceYears,
            has_smartphone: data.hasSmartphone,
            has_internet_access: data.hasInternetAccess,
            preferred_coverage_area: data.preferredCoverageArea,
            languages_spoken: data.languagesSpoken,
            // Guarantor
            guarantor_name: data.guarantorName,
            guarantor_phone: data.guarantorPhone,
            guarantor_relationship: data.guarantorRelationship,
            guarantor_address: data.guarantorAddress,
            // Additional
            how_did_you_hear: data.howDidYouHear,
            referral_code: data.referralCode,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to join waitlist");
      }

      return response;
    },
    onSuccess: () => {
      toast({
        title: "Welcome to Gladfore! 🎉",
        description: `Your ${userType} application has been submitted. We'll review it and send you login credentials within 2-3 business days.`,
      });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    reset();
    setStep(1);
    setSelectedState("");
    setSelectedCrops([]);
    setSelectedLanguages([]);
    setUserType(defaultUserType);
  };

  const handleStateChange = (state: string) => {
    setSelectedState(state);
    setValue("state", state);
    setValue("lga", ""); // Reset LGA when state changes
  };

  const toggleCrop = (crop: string) => {
    const updated = selectedCrops.includes(crop)
      ? selectedCrops.filter((c) => c !== crop)
      : [...selectedCrops, crop];
    setSelectedCrops(updated);
    setValue("cropTypes", updated);
  };

  const toggleLanguage = (lang: string) => {
    const updated = selectedLanguages.includes(lang)
      ? selectedLanguages.filter((l) => l !== lang)
      : [...selectedLanguages, lang];
    setSelectedLanguages(updated);
    setValue("languagesSpoken", updated);
  };

  const onSubmit = (data: WaitlistFormData) => {
    submitMutation.mutate({ ...data, userType });
  };

  const canProceed = (currentStep: number): boolean => {
    const formData = watch();
    
    switch (currentStep) {
      case 1:
        return !!(formData.fullName && formData.phone);
      case 2:
        return !!(formData.state && formData.lga);
      case 3:
        if (userType === "farmer") {
          return !!(
            formData.farmSize &&
            formData.cropTypes?.length &&
            formData.yearsOfFarmingExperience
          );
        } else {
          return !!(formData.educationLevel && formData.hasSmartphone !== undefined);
        }
      case 4:
        return !!(formData.guarantorName && formData.guarantorPhone);
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (canProceed(step)) {
      setStep((prev) => Math.min(prev + 1, totalSteps));
    } else {
      toast({
        title: "Required Fields Missing",
        description: "Please fill in all required fields before proceeding.",
        variant: "destructive",
      });
    }
  };

  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Join Gladfore Waitlist</DialogTitle>
          <DialogDescription>
            Complete your application to get early access to our platform
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* User Type Selector (Step 0 - Always visible at top) */}
        {step === 1 && (
          <div className="grid grid-cols-2 gap-4 py-4">
            <Card
              className={`cursor-pointer transition-all ${
                userType === "farmer"
                  ? "border-primary ring-2 ring-primary"
                  : "hover:border-primary/50"
              }`}
              onClick={() => {
                setUserType("farmer");
                setValue("userType", "farmer");
              }}
            >
              <CardContent className="pt-6 text-center">
                <User className="w-12 h-12 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold">I'm a Farmer</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Access farm inputs on credit
                </p>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer transition-all ${
                userType === "agent"
                  ? "border-primary ring-2 ring-primary"
                  : "hover:border-primary/50"
              }`}
              onClick={() => {
                setUserType("agent");
                setValue("userType", "agent");
              }}
            >
              <CardContent className="pt-6 text-center">
                <Briefcase className="w-12 h-12 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold">I'm an Agent</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Help farmers & earn commission
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <Separator />

        {/* Form Steps */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
          {/* Step 1: Personal Information */}
          {step === 1 && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Personal Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    placeholder="Enter your full name"
                    {...register("fullName", { required: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">
                    Phone Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="080xxxxxxxx"
                    {...register("phone", { required: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    {...register("email")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    {...register("dateOfBirth")}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select onValueChange={(value) => setValue("gender", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nin">
                    NIN (National Identity Number) <span className="text-muted-foreground text-xs">Recommended</span>
                  </Label>
                  <Input
                    id="nin"
                    placeholder="Enter your 11-digit NIN"
                    maxLength={11}
                    {...register("nin")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Other ID Type</Label>
                  <Select onValueChange={(value) => setValue("idType", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select ID type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nin">NIN</SelectItem>
                      <SelectItem value="voters_card">Voter's Card</SelectItem>
                      <SelectItem value="drivers_license">Driver's License</SelectItem>
                      <SelectItem value="international_passport">International Passport</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="idNumber">ID Number</Label>
                  <Input
                    id="idNumber"
                    placeholder="Enter ID number"
                    {...register("idNumber")}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Location Details */}
          {step === 2 && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Location Details</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    State <span className="text-destructive">*</span>
                  </Label>
                  <Select onValueChange={handleStateChange} value={selectedState}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your state" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    Local Government Area (LGA) <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    onValueChange={(value) => setValue("lga", value)}
                    disabled={!selectedState}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedState ? "Select LGA" : "Select state first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedState && getLGAsByState(selectedState).map((lga) => (
                        <SelectItem key={lga} value={lga}>
                          {lga}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="townVillage">Town/Village</Label>
                  <Input
                    id="townVillage"
                    placeholder="Enter your town or village"
                    {...register("townVillage")}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Textarea
                    id="address"
                    placeholder="Enter your full address"
                    rows={3}
                    {...register("address")}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Professional Details (Farmer or Agent) */}
          {step === 3 && userType === "farmer" && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Farming Details</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="farmSize">
                    Farm Size <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="farmSize"
                    placeholder="e.g., 5 hectares"
                    {...register("farmSize", { required: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="farmLocation">Farm Location</Label>
                  <Input
                    id="farmLocation"
                    placeholder="Where is your farm located?"
                    {...register("farmLocation")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="yearsOfFarmingExperience">
                    Years of Experience <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="yearsOfFarmingExperience"
                    type="number"
                    min="0"
                    placeholder="Years farming"
                    {...register("yearsOfFarmingExperience", { required: true, valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Land Ownership</Label>
                  <Select onValueChange={(value) => setValue("landOwnership", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select ownership type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owned">Owned</SelectItem>
                      <SelectItem value="leased">Leased</SelectItem>
                      <SelectItem value="family_land">Family Land</SelectItem>
                      <SelectItem value="community_land">Community Land</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Farming Type</Label>
                  <Select onValueChange={(value) => setValue("farmingType", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select farming type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subsistence">Subsistence</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>
                    Crop Types <span className="text-destructive">*</span>
                    <span className="text-muted-foreground text-xs ml-2">
                      (Select all that apply)
                    </span>
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {CROP_TYPES.map((crop) => (
                      <div key={crop} className="flex items-center space-x-2">
                        <Checkbox
                          id={`crop-${crop}`}
                          checked={selectedCrops.includes(crop)}
                          onCheckedChange={() => toggleCrop(crop)}
                        />
                        <label
                          htmlFor={`crop-${crop}`}
                          className="text-sm cursor-pointer"
                        >
                          {crop}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasBankAccount"
                      onCheckedChange={(checked) =>
                        setValue("hasBankAccount", checked as boolean)
                      }
                    />
                    <label htmlFor="hasBankAccount" className="text-sm cursor-pointer">
                      I have a bank account
                    </label>
                  </div>
                </div>

                {watch("hasBankAccount") && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="bankName">Bank Name</Label>
                      <Input
                        id="bankName"
                        placeholder="Your bank name"
                        {...register("bankName")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <Input
                        id="accountNumber"
                        placeholder="Your account number"
                        {...register("accountNumber")}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {step === 3 && userType === "agent" && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Agent Details</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Education Level <span className="text-destructive">*</span>
                  </Label>
                  <Select onValueChange={(value) => setValue("educationLevel", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select education level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary</SelectItem>
                      <SelectItem value="secondary">Secondary</SelectItem>
                      <SelectItem value="tertiary">Tertiary</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    Do you have a smartphone? <span className="text-destructive">*</span>
                  </Label>
                  <RadioGroup
                    onValueChange={(value) =>
                      setValue("hasSmartphone", value === "true")
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="true" id="smartphone-yes" />
                      <Label htmlFor="smartphone-yes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id="smartphone-no" />
                      <Label htmlFor="smartphone-no">No</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Do you have internet access?</Label>
                  <RadioGroup
                    onValueChange={(value) =>
                      setValue("hasInternetAccess", value === "true")
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="true" id="internet-yes" />
                      <Label htmlFor="internet-yes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id="internet-no" />
                      <Label htmlFor="internet-no">No</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Previous sales experience?</Label>
                  <RadioGroup
                    onValueChange={(value) => {
                      const hasExp = value === "true";
                      setValue("previousSalesExperience", hasExp);
                      if (!hasExp) setValue("salesExperienceYears", 0);
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="true" id="sales-yes" />
                      <Label htmlFor="sales-yes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id="sales-no" />
                      <Label htmlFor="sales-no">No</Label>
                    </div>
                  </RadioGroup>
                </div>

                {watch("previousSalesExperience") && (
                  <div className="space-y-2">
                    <Label htmlFor="salesExperienceYears">Years of Sales Experience</Label>
                    <Input
                      id="salesExperienceYears"
                      type="number"
                      min="0"
                      placeholder="Years"
                      {...register("salesExperienceYears", { valueAsNumber: true })}
                    />
                  </div>
                )}

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="preferredCoverageArea">Preferred Coverage Area</Label>
                  <Textarea
                    id="preferredCoverageArea"
                    placeholder="Which areas would you like to work in?"
                    rows={2}
                    {...register("preferredCoverageArea")}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>
                    Languages Spoken <span className="text-muted-foreground text-xs">(Select all that apply)</span>
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {NIGERIAN_LANGUAGES.map((lang) => (
                      <div key={lang} className="flex items-center space-x-2">
                        <Checkbox
                          id={`lang-${lang}`}
                          checked={selectedLanguages.includes(lang)}
                          onCheckedChange={() => toggleLanguage(lang)}
                        />
                        <label
                          htmlFor={`lang-${lang}`}
                          className="text-sm cursor-pointer"
                        >
                          {lang}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Guarantor Information */}
          {step === 4 && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Guarantor Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="guarantorName">
                    Guarantor Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="guarantorName"
                    placeholder="Enter guarantor's full name"
                    {...register("guarantorName", { required: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guarantorPhone">
                    Guarantor Phone <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="guarantorPhone"
                    type="tel"
                    placeholder="080xxxxxxxx"
                    {...register("guarantorPhone", { required: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guarantorRelationship">Relationship</Label>
                  <Input
                    id="guarantorRelationship"
                    placeholder="e.g., Father, Chief, Pastor"
                    {...register("guarantorRelationship")}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="guarantorAddress">Guarantor Address</Label>
                  <Textarea
                    id="guarantorAddress"
                    placeholder="Enter guarantor's address"
                    rows={3}
                    {...register("guarantorAddress")}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review & Submit */}
          {step === 5 && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Review Your Application</h3>
              </div>

              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">User Type</h4>
                    <p className="capitalize">{userType}</p>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Personal Information</h4>
                    <p>{watch("fullName")}</p>
                    <p className="text-sm">{watch("phone")}</p>
                    {watch("email") && <p className="text-sm">{watch("email")}</p>}
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Location</h4>
                    <p>{watch("state")}, {watch("lga")}</p>
                    {watch("townVillage") && <p className="text-sm">{watch("townVillage")}</p>}
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Guarantor</h4>
                    <p>{watch("guarantorName")}</p>
                    <p className="text-sm">{watch("guarantorPhone")}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="howDidYouHear">How did you hear about us?</Label>
                  <Input
                    id="howDidYouHear"
                    placeholder="e.g., Facebook, Friend, Radio"
                    {...register("howDidYouHear")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referralCode">Referral Code (Optional)</Label>
                  <Input
                    id="referralCode"
                    placeholder="Enter referral code if you have one"
                    {...register("referralCode")}
                  />
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>What happens next?</strong><br />
                  We'll review your application within 2-3 business days. Once approved, you'll receive your login credentials via {watch("email") ? "email" : "SMS"}.
                </p>
              </div>
            </div>
          )}
        </form>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={step === 1 || submitMutation.isPending}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          {step < totalSteps ? (
            <Button type="button" onClick={nextStep} disabled={!canProceed(step)}>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit(onSubmit)}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Submit Application
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
