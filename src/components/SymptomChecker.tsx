
"use client";

import { useState, type FormEvent } from 'react';
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
import { Loader2, AlertCircle, MapPin, Stethoscope, Sparkles, Pill, Leaf } from 'lucide-react';

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

  const handleSymptomSubmit: SubmitHandler<SymptomFormValues> = async (data) => {
    setIsLoadingAnalysis(true);
    setError(null);
    setAnalysisResult(null);
    setRemedyResult(null); // Reset remedy result if new symptoms are submitted
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
                    <FormControl>
                      <Textarea
                        id="symptoms"
                        placeholder="e.g., I have a headache, fever, and a runny nose..."
                        {...field}
                        rows={4}
                        className="resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoadingAnalysis} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
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

      {remedyResult && remedyResult.remedies && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Leaf className="h-6 w-6 text-accent" />
              Recommended Home Remedies
            </CardTitle>
            <CardDescription>These are suggestions and not medical advice. Consult a healthcare professional for any health concerns.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {remedyResult.remedies.length > 0 ? (
              remedyResult.remedies.map((remedy, index) => (
                <div key={index} className="p-4 border rounded-md bg-secondary/50">
                  <h4 className="font-semibold text-lg text-accent">{remedy.name}</h4>
                  <p className="mt-2 text-secondary-foreground whitespace-pre-wrap">{remedy.explanation}</p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No specific remedies could be suggested for your symptoms and location. Please consult a healthcare professional.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
