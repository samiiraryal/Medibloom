
"use client";

import { useState, type FormEvent, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { analyzeSymptoms, type SymptomAnalysisInput, type SymptomAnalysisOutput } from '@/ai/flows/symptom-analysis';
import { remedyRecommendation, type RemedyRecommendationInput, type RemedyRecommendationOutput } from '@/ai/flows/remedy-recommendation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Loader2, AlertCircle, MapPin, Stethoscope, Sparkles, Pill, Leaf, Lightbulb, ClipboardList, Mic, MicOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const symptomFormSchema = z.object({
  symptoms: z.string().min(10, { message: "Please describe your symptoms in at least 10 characters." }),
});

type SymptomFormValues = z.infer<typeof symptomFormSchema>;

const locationFormSchema = z.object({
  location: z.string().min(2, { message: "Please enter your location (at least 2 characters)." }),
});

type LocationFormValues = z.infer<typeof locationFormSchema>;

export default function SymptomChecker() {
  const [analysisResult, setAnalysisResult] = useState<SymptomAnalysisOutput | null>(null);
  const [remedyResult, setRemedyResult] = useState<RemedyRecommendationOutput | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isLoadingRemedies, setIsLoadingRemedies] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSymptoms, setCurrentSymptoms] = useState<string>("");

  // Voice Input State
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceInputError, setVoiceInputError] = useState<string | null>(null);
  const [supportsVoiceInput, setSupportsVoiceInput] = useState<boolean | undefined>(undefined);


  const symptomForm = useForm<SymptomFormValues>({
    resolver: zodResolver(symptomFormSchema),
    defaultValues: {
      symptoms: "",
    },
  });

  const locationForm = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      location: "",
    },
  });

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (typeof SpeechRecognitionAPI !== 'undefined') {
      setSupportsVoiceInput(true);
      const instance = new SpeechRecognitionAPI();
      instance.continuous = false; // Stop after first utterance
      instance.interimResults = false;
      // instance.lang will be set before starting

      instance.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        const currentSymptomsValue = symptomForm.getValues('symptoms');
        symptomForm.setValue('symptoms', currentSymptomsValue ? `${currentSymptomsValue} ${transcript}` : transcript, { shouldValidate: true });
        setVoiceInputError(null);
      };

      instance.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error, event.message);
        let errorMsg = `Voice input error: ${event.message || event.error}.`;
        if (event.error === 'no-speech') {
          errorMsg = 'No speech detected. Please ensure your microphone is working and try again.';
        } else if (event.error === 'language-not-supported') {
          errorMsg = 'Nepali voice input might not be supported by your browser. Please try speaking in English, or ensure your browser and OS language settings are configured for Nepali.';
        } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          errorMsg = 'Microphone access denied. Please enable microphone access in your browser settings and refresh the page.';
        }
        setVoiceInputError(errorMsg);
        setIsListening(false);
      };

      instance.onend = () => {
        setIsListening(false);
      };
      setRecognition(instance);
    } else {
      setSupportsVoiceInput(false);
      console.warn("Speech recognition not supported by this browser.");
    }

    return () => {
      recognition?.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const handleToggleListening = () => {
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
    } else {
      setVoiceInputError(null); // Clear previous voice error
      setError(null); // Clear general form error
      try {
        recognition.lang = 'ne-NP'; // Attempt Nepali
        recognition.start();
        setIsListening(true);
      } catch (e: any) {
        console.error("Error starting recognition:", e);
        // This catch is for immediate errors like "recognition already started" or sometimes permissions if not caught by onerror
        setVoiceInputError("Could not start voice input. Ensure microphone permissions are granted and try again.");
        setIsListening(false);
      }
    }
  };

  const handleSymptomSubmit: SubmitHandler<SymptomFormValues> = async (data) => {
    setIsLoadingAnalysis(true);
    setError(null);
    setVoiceInputError(null);
    setAnalysisResult(null);
    setRemedyResult(null);
    setCurrentSymptoms(data.symptoms);

    try {
      const input: SymptomAnalysisInput = { symptoms: data.symptoms };
      const result = await analyzeSymptoms(input);
      setAnalysisResult(result);
    } catch (e) {
      console.error("Symptom analysis error:", e);
      setError("Failed to analyze symptoms. Please try again.");
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  const handleRemedySubmit: SubmitHandler<LocationFormValues> = async (data) => {
    if (!analysisResult || !currentSymptoms) {
      setError("Symptom analysis is required before recommending remedies.");
      return;
    }
    setIsLoadingRemedies(true);
    setError(null);
    setRemedyResult(null);

    try {
      const possibleConditions = analysisResult.conditions.map(c => c.condition).join(', ');
      const input: RemedyRecommendationInput = {
        symptoms: currentSymptoms,
        location: data.location,
        possibleConditions: possibleConditions,
      };
      const result = await remedyRecommendation(input);
      setRemedyResult(result);
    } catch (e) {
      console.error("Remedy recommendation error:", e);
      setError("Failed to recommend remedies. Please try again.");
    } finally {
      setIsLoadingRemedies(false);
    }
  };

  let displayedRemedies = remedyResult?.remedies || [];
  if (remedyResult && remedyResult.remedies && remedyResult.remedies.length > 1) {
    const firstRemedy = remedyResult.remedies[0];
    // The first remedy from AI (most important) is moved to the end of the display list
    displayedRemedies = [...remedyResult.remedies.slice(1), firstRemedy];
  } else if (remedyResult && remedyResult.remedies && remedyResult.remedies.length === 1) {
    displayedRemedies = remedyResult.remedies;
  }


  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Stethoscope className="h-7 w-7 text-primary" />
            Symptom Analysis
          </CardTitle>
          <CardDescription>Describe your symptoms, and our AI will suggest possible conditions.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...symptomForm}>
            <form onSubmit={symptomForm.handleSubmit(handleSymptomSubmit)} className="space-y-6">
              <FormField
                control={symptomForm.control}
                name="symptoms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="symptoms" className="text-lg">Your Symptoms</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Textarea
                          id="symptoms"
                          placeholder="e.g., टाउको दुखेको, ज्वरो आएको... or use the microphone"
                          {...field}
                          rows={4}
                          className={`resize-none ${supportsVoiceInput ? 'pr-12' : ''}`}
                        />
                      </FormControl>
                      {supportsVoiceInput && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={handleToggleListening}
                          className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary data-[listening=true]:text-destructive"
                          data-listening={isListening}
                          aria-label={isListening ? "Stop listening" : "Start voice input for symptoms"}
                          disabled={isLoadingAnalysis}
                        >
                          {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                        </Button>
                      )}
                    </div>
                    <FormMessage />
                    {supportsVoiceInput === false && (
                      <p className="text-sm text-muted-foreground">Voice input is not supported by your browser.</p>
                    )}
                    {voiceInputError && <p className="text-sm text-destructive">{voiceInputError}</p>}
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoadingAnalysis || isListening} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                {isLoadingAnalysis ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Analyze Symptoms
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="shadow-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {analysisResult && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Pill className="h-6 w-6 text-primary" />
              Possible Conditions
            </CardTitle>
            <CardDescription>Based on your symptoms, here are some possible conditions. This is not a medical diagnosis.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysisResult.conditions.length > 0 ? (
              analysisResult.conditions.map((item, index) => (
                <div key={index} className="p-4 border rounded-md bg-secondary/50">
                  <h4 className="font-semibold text-lg text-secondary-foreground">{item.condition}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground">Likelihood:</span>
                    <Progress value={item.likelihood * 100} className="w-1/2 h-2" />
                    <span className="text-sm font-medium text-primary">{(item.likelihood * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No specific conditions identified. Please consult a healthcare professional.</p>
            )}
          </CardContent>
        </Card>
      )}

      {analysisResult && (
         <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <MapPin className="h-7 w-7 text-accent" />
              Remedy Recommendation
            </CardTitle>
            <CardDescription>Enter your location to get personalized home remedy suggestions.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...locationForm}>
              <form onSubmit={locationForm.handleSubmit(handleRemedySubmit)} className="space-y-6">
                <FormField
                  control={locationForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="location" className="text-lg">Your Location</FormLabel>
                      <FormControl>
                        <Input
                          id="location"
                          placeholder="e.g., New York, USA or rural village, India"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoadingRemedies} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                  {isLoadingRemedies ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Get Remedies
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {remedyResult && displayedRemedies.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Leaf className="h-6 w-6 text-accent" />
              Recommended Home Remedies
            </CardTitle>
            <CardDescription>These are suggestions and not medical advice. Consult a healthcare professional for any health concerns.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {displayedRemedies.map((remedy, index) => (
              <div 
                key={index} 
                className={`p-4 border rounded-md bg-secondary/50 shadow transition-all duration-300 ease-in-out ${
                  index === displayedRemedies.length - 1 && displayedRemedies.length > 0 // Highlight if it's the last item (our "most effective" one)
                  ? 'border-primary border-2 ring-2 ring-primary shadow-xl transform scale-105' 
                  : 'border-border' // Default border
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-lg text-accent">{remedy.name}</h4>
                  {index === displayedRemedies.length - 1 && displayedRemedies.length > 0 && (
                    <Badge variant="default" className="bg-primary text-primary-foreground ml-2">
                      Most Effective
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-secondary-foreground whitespace-pre-wrap">{remedy.explanation}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      {remedyResult && !displayedRemedies.length && !remedyResult.optionalIngredients?.length && !isLoadingRemedies && (
         <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                <Leaf className="h-6 w-6 text-accent" />
                Recommended Home Remedies
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">No specific remedies could be suggested for your symptoms and location. Please consult a healthcare professional.</p>
            </CardContent>
        </Card>
      )}


      {remedyResult && remedyResult.optionalIngredients && remedyResult.optionalIngredients.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Lightbulb className="h-6 w-6 text-primary" />
              Optional Ingredient Considerations
            </CardTitle>
            <CardDescription>These are less common ingredients that might be worth considering if available, based on your symptoms and location.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {remedyResult.optionalIngredients.map((ingredient, index) => (
              <div key={index} className="p-4 border rounded-md bg-secondary/50 shadow">
                <h4 className="font-semibold text-lg text-primary">{ingredient.name}</h4>
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{ingredient.reasoning}</p>
                {ingredient.availabilityNote && (
                  <p className="mt-1 text-xs italic text-muted-foreground">Note: {ingredient.availabilityNote}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
