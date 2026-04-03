/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ArrowLeft, ArrowRight, Bot, Calendar, CheckCircle2, Leaf, Loader2, MapPin, Search, Star, User, Stethoscope, Edit, Trash2, Plus, X, Phone, MessageSquare, Sparkles, Download } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useRef } from "react";
import { GoogleGenAI, Type } from "@google/genai";

// --- Types ---
type Step = "home" | "symptoms" | "locationSelection" | "specialists" | "profile" | "admin";

interface Specialist {
  id: string;
  name: string;
  type: string;
  experience: string;
  rating: number;
  image: string;
  bio: string;
  city: "Karak" | "Peshawar" | "Islamabad" | "Rawalpindi";
  location: string;
  availability: string[];
  timing: string;
  assistantPhone: string;
  aiSummary?: string;
}

interface Message {
  role: "user" | "model";
  text: string;
}

interface ActiveAppointment {
  doctorName: string;
  doctorType: string;
  location: string;
  day: string;
  timing: string;
  patientName: string;
  patientPhone: string;
  bookingNumber: string;
  status: "pending" | "confirmed";
  createdAt: number;
}

// --- Mock Data ---
const MOCK_SPECIALISTS: Specialist[] = [
  {
    id: "1",
    name: "Dr. Ahmed Khan",
    type: "Cardiologist",
    experience: "15 Years",
    rating: 4.9,
    image: "https://picsum.photos/seed/doc1/400/400",
    bio: "Expert in heart health and cardiovascular surgery. Dedicated to providing the best care for Karak's heart patients.",
    city: "Karak",
    location: "Karak Medical Center",
    availability: ["Mon", "Wed", "Fri"],
    timing: "09:00 AM - 02:00 PM",
    assistantPhone: "923001234567"
  },
  {
    id: "2",
    name: "Dr. Sara Gul",
    type: "Dermatologist",
    experience: "8 Years",
    rating: 4.8,
    image: "https://picsum.photos/seed/doc2/400/400",
    bio: "Specialist in skin conditions, allergies, and cosmetic dermatology. Helping you feel confident in your skin.",
    city: "Peshawar",
    location: "Peshawar Skin Clinic",
    availability: ["Tue", "Thu", "Sat"],
    timing: "04:00 PM - 08:00 PM",
    assistantPhone: "923001234567"
  },
  {
    id: "3",
    name: "Dr. Zaid Malik",
    type: "Orthopedic",
    experience: "12 Years",
    rating: 4.7,
    image: "https://picsum.photos/seed/doc3/400/400",
    bio: "Focuses on bone health, joint replacements, and sports injuries. Getting you back on your feet.",
    city: "Islamabad",
    location: "Islamabad Ortho Care",
    availability: ["Mon", "Tue", "Thu"],
    timing: "10:00 AM - 04:00 PM",
    assistantPhone: "923001234567"
  },
  {
    id: "4",
    name: "Dr. Maria Jan",
    type: "Pediatrician",
    experience: "10 Years",
    rating: 4.9,
    image: "https://picsum.photos/seed/doc4/400/400",
    bio: "Compassionate care for children and infants. Ensuring the next generation of Karak grows up healthy.",
    city: "Karak",
    location: "Karak Children's Hospital",
    availability: ["Wed", "Fri", "Sun"],
    timing: "09:00 AM - 05:00 PM",
    assistantPhone: "923001234567"
  },
  {
    id: "5",
    name: "Dr. Usman Ali",
    type: "Dentist",
    experience: "7 Years",
    rating: 4.6,
    image: "https://picsum.photos/seed/doc5/400/400",
    bio: "Expert in dental surgery and oral hygiene. Providing pain-free treatments for all ages.",
    city: "Karak",
    location: "Karak Dental Hub",
    availability: ["Mon", "Tue", "Wed"],
    timing: "11:00 AM - 03:00 PM",
    assistantPhone: "923001234567"
  },
  {
    id: "6",
    name: "Dr. Fatima Shah",
    type: "Dentist",
    experience: "9 Years",
    rating: 4.8,
    image: "https://picsum.photos/seed/doc6/400/400",
    bio: "Specialist in orthodontics and root canal treatments. Your smile is our priority.",
    city: "Peshawar",
    location: "Peshawar Dental Care",
    availability: ["Thu", "Fri", "Sat"],
    timing: "02:00 PM - 07:00 PM",
    assistantPhone: "923001234567"
  },
  {
    id: "7",
    name: "Dr. Bilal Afridi",
    type: "Dermatologist",
    experience: "11 Years",
    rating: 4.7,
    image: "https://picsum.photos/seed/doc7/400/400",
    bio: "Skin specialist with extensive experience in treating chronic skin diseases.",
    city: "Rawalpindi",
    location: "Pindi Skin & Laser Center",
    availability: ["Mon", "Wed", "Sat"],
    timing: "10:00 AM - 06:00 PM",
    assistantPhone: "923001234567"
  },
  {
    id: "8",
    name: "Dr. Hina Khattak",
    type: "Cardiologist",
    experience: "14 Years",
    rating: 4.9,
    image: "https://picsum.photos/seed/doc8/400/400",
    bio: "Senior cardiologist specializing in non-invasive heart treatments.",
    city: "Islamabad",
    location: "Islamabad Heart Institute",
    availability: ["Tue", "Thu", "Fri"],
    timing: "09:00 AM - 03:00 PM",
    assistantPhone: "923001234567"
  }
];

// --- AI Service ---
const rawKey = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || ((import.meta as any).env?.VITE_GEMINI_API_KEY || "");
const GEMINI_API_KEY = rawKey.replace(/['"]+/g, '').trim();
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export default function App() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  const [isIOS, setIsIOS] = useState(false);

  // Handle PWA Install Prompt
  useEffect(() => {
    console.log("PWA: Initializing install prompt listener...");
    
    const checkIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };
    setIsIOS(checkIOS());

    const handleBeforeInstallPrompt = (e: any) => {
      console.log("PWA: beforeinstallprompt event fired!");
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowInstallButton(true);
    };

    const handleAppInstalled = () => {
      console.log("PWA: App was installed!");
      setShowInstallButton(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      console.log("PWA: App is already running in standalone mode.");
      setShowInstallButton(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    // Optionally, send analytics event with outcome of user choice
    console.log(`User response to the install prompt: ${outcome}`);
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  const [step, setStep] = useState<Step>("home");

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [doctorSearchQuery, setDoctorSearchQuery] = useState("");
  
  // Load specialists from localStorage or use mock data
  useEffect(() => {
    const saved = localStorage.getItem("karak_specialists");
    if (saved) {
      try {
        setSpecialists(JSON.parse(saved));
      } catch (e) {
        setSpecialists(MOCK_SPECIALISTS);
      }
    } else {
      setSpecialists(MOCK_SPECIALISTS);
    }
  }, []);

  // Save to localStorage whenever specialists change
  useEffect(() => {
    if (specialists.length > 0) {
      localStorage.setItem("karak_specialists", JSON.stringify(specialists));
    }
  }, [specialists]);

  const [symptoms, setSymptoms] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedSpecialistTypes, setDetectedSpecialistTypes] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Specialist["city"] | null>(null);
  const [suggestedSpecialists, setSuggestedSpecialists] = useState<Specialist[]>([]);
  const [selectedSpecialist, setSelectedSpecialist] = useState<Specialist | null>(null);
  const [aiHelpText, setAiHelpText] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);

  // --- Chat State ---
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [chatSession, setChatSession] = useState<any>(null);

  // --- Admin State ---
  const [editingDoc, setEditingDoc] = useState<Specialist | null>(null);
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [adminForm, setAdminForm] = useState<Partial<Specialist>>({});
  const [adminClickCount, setAdminClickCount] = useState(0);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");

  // --- Booking State ---
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingName, setBookingName] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");
  const [bookingDay, setBookingDay] = useState("");
  const [bookingStatus, setBookingStatus] = useState<"idle" | "sent" | "confirmed">("idle");
  const [bookingNumber, setBookingNumber] = useState("");
  const [activeAppointment, setActiveAppointment] = useState<ActiveAppointment | null>(() => {
    const saved = localStorage.getItem("karak_active_appointment");
    if (saved) {
      try {
        const appt: ActiveAppointment = JSON.parse(saved);
        // Basic expiry check (7 days)
        if (Date.now() - appt.createdAt < 7 * 24 * 60 * 60 * 1000) {
          return appt;
        }
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);

  // Save active appointment to localStorage
  useEffect(() => {
    if (activeAppointment) {
      localStorage.setItem("karak_active_appointment", JSON.stringify(activeAppointment));
    } else {
      localStorage.removeItem("karak_active_appointment");
    }
  }, [activeAppointment]);

  // Check for appointment expiry periodically
  useEffect(() => {
    const checkExpiry = () => {
      if (!activeAppointment) return;

      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const now = new Date();
      const currentDayIndex = now.getDay();
      const apptDayIndex = days.indexOf(activeAppointment.day);

      // Only clear if it's the SAME day and the time has passed
      // Or if the appointment is more than 7 days old (handled by initializer)
      if (currentDayIndex === apptDayIndex) {
        // It's the appointment day, check the time
        // Timing format: "09:00 AM - 02:00 PM"
        try {
          const endTimeStr = activeAppointment.timing.split(" - ")[1];
          const [time, modifier] = endTimeStr.split(" ");
          let [hours, minutes] = time.split(":").map(Number);
          if (modifier === "PM" && hours < 12) hours += 12;
          if (modifier === "AM" && hours === 12) hours = 0;

          const endTime = new Date();
          endTime.setHours(hours, minutes, 0, 0);

          // If current time is 1 hour past the end time, clear it
          if (now.getTime() > endTime.getTime() + (60 * 60 * 1000)) {
            setActiveAppointment(null);
          }
        } catch (e) {
          // If timing format is weird, don't auto-expire
        }
      }
    };

    const interval = setInterval(checkExpiry, 60000); // Check every minute
    checkExpiry(); // Run once immediately
    return () => clearInterval(interval);
  }, [activeAppointment]);

  const handleAdminTrigger = () => {
    setAdminClickCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 5) {
        setShowAdminLogin(true);
        return 0;
      }
      return newCount;
    });
  };

  const handleAdminLogin = () => {
    if (adminPassword === "admin2244") {
      setStep("admin");
      setShowAdminLogin(false);
      setAdminPassword("");
    } else {
      setAdminPassword("");
      // Simple visual feedback for wrong password could be added, but for now just reset
    }
  };

  const handleConfirmBooking = () => {
    if (!bookingName.trim() || !bookingPhone.trim() || !bookingDay) {
      alert("Please enter your name, phone number, and select a day.");
      return;
    }

    if (!selectedSpecialist) return;

    const message = `*New Appointment Request*%0A%0A*Patient:* ${bookingName}%0A*Phone:* ${bookingPhone}%0A*Doctor:* ${selectedSpecialist.name}%0A*Day:* ${bookingDay}%0A*Location:* ${selectedSpecialist.location}%0A%0A_Please reply with a booking number to confirm._`;
    const whatsappUrl = `https://wa.me/${selectedSpecialist.assistantPhone}?text=${message}`;
    
    window.open(whatsappUrl, "_blank");
    setBookingStatus("sent");

    // Create pending appointment
    const newAppt: ActiveAppointment = {
      doctorName: selectedSpecialist.name,
      doctorType: selectedSpecialist.type,
      location: selectedSpecialist.location,
      day: bookingDay,
      timing: selectedSpecialist.timing,
      patientName: bookingName,
      patientPhone: bookingPhone,
      bookingNumber: "",
      status: "pending",
      createdAt: Date.now()
    };
    setActiveAppointment(newAppt);
  };

  const handleSaveDoc = () => {
    if (!adminForm.name || !adminForm.type || !adminForm.city) {
      alert("Please fill in all required fields (Name, Type, City).");
      return;
    }

    if (editingDoc) {
      setSpecialists(prev => prev.map(s => s.id === editingDoc.id ? { ...s, ...adminForm } as Specialist : s));
    } else {
      const newDoc: Specialist = {
        ...adminForm,
        id: Date.now().toString(),
        rating: adminForm.rating || 4.5,
        availability: adminForm.availability || ["Mon", "Wed", "Fri"],
        timing: adminForm.timing || "09:00 AM - 05:00 PM",
        assistantPhone: adminForm.assistantPhone || "923001234567",
        image: adminForm.image || `https://picsum.photos/seed/${Date.now()}/400/400`,
      } as Specialist;
      setSpecialists(prev => [...prev, newDoc]);
    }
    setEditingDoc(null);
    setIsAddingDoc(false);
    setAdminForm({});
  };

  const handleDeleteDoc = (id: string) => {
    if (window.confirm("Are you sure you want to delete this specialist?")) {
      setSpecialists(prev => prev.filter(s => s.id !== id));
    }
  };

  // Initialize Chat Session
  useEffect(() => {
    try {
      const session = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: `You are a professional medical assistant for the "Karak Easy Appointment" app. 
          Your goal is to help users understand their health concerns and guide them to the right specialists in Karak, Peshawar, Islamabad, or Rawalpindi.
          Be empathetic, professional, and clear. 
          Always remind users that you are an AI and they should consult a real doctor for final diagnosis.
          Keep responses concise and formatted with markdown for readability.
          ${activeAppointment ? `IMPORTANT: The user has an active appointment with ${activeAppointment.doctorName} (${activeAppointment.doctorType}) on ${activeAppointment.day} at ${activeAppointment.timing}. If relevant, remind them about it or ask if they have any questions about their upcoming visit.` : ""}`,
        },
      });
      setChatSession(session);
    } catch (e) {
      console.error("Failed to create chat session:", e);
    }
  }, [activeAppointment]);

  // AI Reminder in Chat
  useEffect(() => {
    if (isChatOpen && activeAppointment) {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const now = new Date();
      const currentDayName = days[now.getDay()];
      
      if (currentDayName === activeAppointment.day && chatMessages.length === 0) {
        setChatMessages([{
          role: "model",
          text: `Assalam-o-Alaikum! Aaj aapka appointment **${activeAppointment.doctorName}** ke saath hai (${activeAppointment.timing}). Kya aapne clinic jaane ki tayari kar li hai?`
        }]);
      }
    }
  }, [isChatOpen, activeAppointment]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;

    if (!GEMINI_API_KEY || !chatSession) {
      setChatMessages(prev => [...prev, { role: "user", text: userInput }, { role: "model", text: "AI is not configured correctly. Please check your GEMINI_API_KEY in Cloudflare environment variables." }]);
      setUserInput("");
      return;
    }

    if (step === "symptoms") {
      await handleSymptomHelp(userInput);
      setUserInput("");
      return;
    }

    const newMsg: Message = { role: "user", text: userInput };
    setChatMessages(prev => [...prev, newMsg]);
    setUserInput("");
    setIsChatLoading(true);

    try {
      const result = await chatSession.sendMessage({ message: userInput });
      const modelMsg: Message = { role: "model", text: result.text || "I'm sorry, I couldn't process that." };
      setChatMessages(prev => [...prev, modelMsg]);
    } catch (error: any) {
      console.error("Chat error:", error);
      let errorMsg = error?.message || "Error connecting to AI.";
      
      // Add debug info if it's an API key error
      if (errorMsg.includes("API key not valid")) {
        const keyStart = GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 4) : "empty";
        errorMsg = `API Key Invalid. Please re-copy your key from AI Studio. (Key starts with: ${keyStart}...)`;
      }
      
      setChatMessages(prev => [...prev, { role: "model", text: errorMsg }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSymptomHelp = async (input: string) => {
    if (!input.trim()) return;

    if (!GEMINI_API_KEY) {
      setChatMessages(prev => [...prev, { role: "user", text: input }, { role: "model", text: "AI is not configured. Please add your GEMINI_API_KEY to the environment variables." }]);
      return;
    }

    setIsChatLoading(true);
    
    // Add user message to chat
    const userMsg: Message = { role: "user", text: input };
    setChatMessages(prev => [...prev, userMsg]);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `The user is trying to describe their medical symptoms but might only provide a few words or a single word like "${input}". 
        Your task is to:
        1. Acknowledge that you understand in Roman Urdu.
        2. Use deep thinking to expand their input into a detailed medical description of the likely concern, BUT write it entirely in Roman Urdu (English-written Urdu, like "Mujhe daant mein dard hai aur masooron mein sujan hai").
        3. Provide the result in a specific format: 
           - First line: A friendly message in Roman Urdu: "Main samajh gaya hoon. Maine aapki bemaari ko achi tarah samajh liya hai aur Symptom Box mein likh diya hai, ab wapis Symptom Box me jyn apni Bemari me parhen aur Find Specialist pe click kren. Taakeh hm acha specialist talaash kr saken"
           - Following lines: The detailed description in Roman Urdu.
        Keep it professional, empathetic, and easy to understand for a local person from Karak/Pakistan.`,
      });

      const fullText = response.text || "";
      const lines = fullText.split('\n').filter(l => l.trim());
      const aiMessage = lines[0] || "Main samajh gaya hoon.";
      const detailedDescription = lines.slice(1).join('\n').trim() || fullText;

      // Update chat
      setChatMessages(prev => [...prev, { 
        role: "model", 
        text: aiMessage 
      }]);

      // Auto-fill the main symptom box
      setSymptoms(detailedDescription);
    } catch (error: any) {
      // Silent fallback for quota errors
      if (error?.status === "RESOURCE_EXHAUSTED" || error?.message?.includes("quota")) {
        const fallbackMsg = "Main samajh gaya hoon. Maine aapki bemaari ko achi tarah samajh liya hai aur Symptom Box mein likh diya hai, ab wapis Symptom Box me jyn apni Bemari me parhen aur Find Specialist pe click kren. Taakeh hm acha specialist talaash kr saken";
        setChatMessages(prev => [...prev, { role: "model", text: fallbackMsg }]);
        
        // Simple expansion fallback
        let expanded = input;
        const lower = input.toLowerCase();
        if (lower.includes("daant") || lower.includes("teeth")) expanded = "Mujhe daant mein shadeed dard hai aur masooron mein sujan mehsoos ho rahi hai.";
        else if (lower.includes("bukhaar") || lower.includes("fever")) expanded = "Mujhe kaafi dinon se tez bukhaar hai aur jism mein thakan mehsoos ho rahi hai.";
        else if (lower.includes("pait") || lower.includes("stomach")) expanded = "Mere pait mein dard hai aur hazma theek nahi lag raha.";
        
        setSymptoms(expanded);
      } else {
        setChatMessages(prev => [...prev, { role: "model", text: "Maaf kijiyega, kuch masla hua. Dobara koshish karen." }]);
      }
    } finally {
      setIsChatLoading(false);
    }
  };

  // AI Intelligence: Generate Doctor Summary
  const generateDoctorSummary = async (doc: Specialist) => {
    if (doc.aiSummary) return;
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: `Provide a 2-sentence professional summary for ${doc.name}, a ${doc.type} with ${doc.experience} experience. Highlight why they are a good choice for patients.`,
      });
      
      const summary = response.text || "";
      setSuggestedSpecialists(prev => prev.map(s => s.id === doc.id ? { ...s, aiSummary: summary } : s));
      if (selectedSpecialist?.id === doc.id) {
        setSelectedSpecialist(prev => prev ? { ...prev, aiSummary: summary } : null);
      }
    } catch (error: any) {
      // Fallback summary
      const fallbackSummary = `${doc.name} is a highly qualified ${doc.type} with ${doc.experience} of experience, dedicated to providing excellent patient care in ${doc.city}.`;
      setSuggestedSpecialists(prev => prev.map(s => s.id === doc.id ? { ...s, aiSummary: fallbackSummary } : s));
      if (selectedSpecialist?.id === doc.id) {
        setSelectedSpecialist(prev => prev ? { ...prev, aiSummary: fallbackSummary } : null);
      }
    }
  };

  useEffect(() => {
    if (selectedSpecialist) {
      generateDoctorSummary(selectedSpecialist);
    }
  }, [selectedSpecialist]);

  // --- AI Logic ---
  const analyzeSymptoms = async () => {
    if (!symptoms.trim()) return;
    setIsAnalyzing(true);
    
    const lowercaseSymptoms = symptoms.toLowerCase();
    
    // Fallback logic for common keywords (Expanded)
    const getFallbackTypes = () => {
      const types: string[] = [];
      if (lowercaseSymptoms.includes("daant") || lowercaseSymptoms.includes("teeth") || lowercaseSymptoms.includes("tooth") || lowercaseSymptoms.includes("dentist") || lowercaseSymptoms.includes("masooron")) {
        types.push("Dentist");
      }
      if (lowercaseSymptoms.includes("skin") || lowercaseSymptoms.includes("jild") || lowercaseSymptoms.includes("rash") || lowercaseSymptoms.includes("dermatologist") || lowercaseSymptoms.includes("khujli")) {
        types.push("Dermatologist");
      }
      if (lowercaseSymptoms.includes("heart") || lowercaseSymptoms.includes("dil") || lowercaseSymptoms.includes("chest pain") || lowercaseSymptoms.includes("cardiologist") || lowercaseSymptoms.includes("blood pressure")) {
        types.push("Cardiologist");
      }
      if (lowercaseSymptoms.includes("eye") || lowercaseSymptoms.includes("aankh") || lowercaseSymptoms.includes("vision") || lowercaseSymptoms.includes("ophthalmologist") || lowercaseSymptoms.includes("nazar")) {
        types.push("Ophthalmologist");
      }
      if (lowercaseSymptoms.includes("child") || lowercaseSymptoms.includes("bacha") || lowercaseSymptoms.includes("pediatrician") || lowercaseSymptoms.includes("kids")) {
        types.push("Pediatrician");
      }
      if (lowercaseSymptoms.includes("stomach") || lowercaseSymptoms.includes("pait") || lowercaseSymptoms.includes("hazma") || lowercaseSymptoms.includes("gastroenterologist")) {
        types.push("Gastroenterologist");
      }
      if (lowercaseSymptoms.includes("bone") || lowercaseSymptoms.includes("haddi") || lowercaseSymptoms.includes("joint") || lowercaseSymptoms.includes("orthopedic")) {
        types.push("Orthopedic Surgeon");
      }
      return types;
    };

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Based on these symptoms or keywords: "${symptoms}", which medical specialist types are most relevant? 
        Return a JSON array of strings representing the specialist types (e.g., ["Cardiologist", "Dentist"]). Only return the array.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });

      const suggestedTypes = JSON.parse(response.text || "[]");
      setDetectedSpecialistTypes(suggestedTypes.length > 0 ? suggestedTypes : getFallbackTypes());
      setStep("locationSelection");
    } catch (error: any) {
      // Silent fallback for quota errors
      const fallback = getFallbackTypes();
      setDetectedSpecialistTypes(fallback);
      
      if (error?.status === "RESOURCE_EXHAUSTED" || error?.message?.includes("quota")) {
        setAiHelpText("AI system is busy, using smart matching to find your doctor.");
      }
      
      setStep("locationSelection");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLocationSelect = (city: Specialist["city"]) => {
    setSelectedLocation(city);
    
    // Filter specialists based on detected types AND selected city
    const filtered = specialists.filter(s => {
      const matchesType = detectedSpecialistTypes.length === 0 || 
        detectedSpecialistTypes.some(type => s.type.toLowerCase().includes(type.toLowerCase()));
      const matchesCity = s.city === city;
      return matchesType && matchesCity;
    });
    
    setSuggestedSpecialists(filtered);
    setStep("specialists");
  };

  const getAiHelp = async (context: string) => {
    setIsAiTyping(true);
    setAiHelpText("");
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `You are a professional and friendly medical assistant. 
        Provide a very short (max 15 words), encouraging tip or guidance for the user based on their current step: "${context}". 
        Avoid mentioning specific city names like "Karak" unless the user is specifically selecting a location. 
        Focus on helping them complete the current action (e.g., describing symptoms, picking a city, or choosing a doctor).`,
      });
      setAiHelpText(response.text || "");
    } catch (error) {
      setAiHelpText("I'm here to help you find the right care.");
    } finally {
      setIsAiTyping(false);
    }
  };

  useEffect(() => {
    const stepDescriptions: Record<Step, string> = {
      home: "the home page, about to start booking",
      symptoms: "describing their medical symptoms or illness",
      locationSelection: "choosing which city to visit for a check-up",
      specialists: "viewing a list of recommended doctors",
      profile: "viewing a specific doctor's profile and booking details",
      admin: "managing the list of specialists and doctors"
    };
    getAiHelp(stepDescriptions[step]);
  }, [step]);

  // --- Components ---

  const Header = ({ showBack = true }) => (
    <header className="w-full max-w-4xl flex items-center justify-between mb-8 lg:mb-12">
      <div className="flex items-center gap-3">
        {showBack && (
          <button 
            onClick={() => {
              if (step === "profile") setStep("specialists");
              else if (step === "specialists") setStep("locationSelection");
              else if (step === "locationSelection") setStep("symptoms");
              else if (step === "admin") setStep("home");
              else setStep("home");
            }}
            className="p-2 hover:bg-blue-50 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-[#0056b3]" />
          </button>
        )}
        <button 
          onClick={() => setStep("home")}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <div className="bg-white p-1 rounded-xl shadow-lg shadow-blue-100 border border-blue-50">
            <img 
              src="https://cdn-icons-png.flaticon.com/512/2966/2966327.png" 
              alt="Logo" 
              className="w-8 h-8 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-xl font-black tracking-tight text-[#003d7a]">Easy Appointment</h1>
        </button>
      </div>
    </header>
  );

  return (
    <div className="min-h-screen bg-[#f8fbff] flex flex-col items-center px-6 py-8 font-sans text-[#003d7a]">
      {/* Floating Install Button */}
      {showInstallButton && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-2xl shadow-2xl border border-blue-100 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-xl">
                <img 
                  src="https://cdn-icons-png.flaticon.com/512/2966/2966327.png" 
                  alt="App Icon" 
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Install KarakEasy</p>
                <p className="text-xs text-slate-500">Fast access from home screen</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowInstallButton(false)}
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <button 
                onClick={handleInstallClick}
                className="bg-[#0056b3] text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-200 hover:bg-[#004494] transition-all active:scale-95"
              >
                Install
              </button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === "home" && (
          <motion.div
            key="home"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full flex flex-col items-center"
          >
            <Header showBack={false} />
            <main className="w-full max-w-2xl lg:max-w-5xl flex flex-col items-center text-center flex-grow justify-center py-12">
              <span className="bg-[#e0ebff] text-[#0056b3] text-xs lg:text-sm font-bold px-6 py-2.5 rounded-full tracking-wider mb-6 uppercase">
                For the people of
              </span>
              <div className="bg-[#cce4ff] px-16 py-5 rounded-3xl mb-10 shadow-inner">
                <h2 className="text-4xl lg:text-5xl font-black tracking-[0.2em]">KARAK</h2>
              </div>
              <h3 className="text-[52px] lg:text-[80px] leading-[1.05] font-extrabold mb-12 tracking-tight">
                <span className="text-[#0070f3]">Easy</span><br />
                <span>Appointment</span>
              </h3>
              <div className="bg-white border border-slate-100 rounded-[40px] p-10 shadow-xl shadow-blue-900/5 mb-16 max-w-3xl">
                <p className="text-xl lg:text-2xl font-bold leading-relaxed text-[#334155]">
                  Karak k logo k lye Pehli Dafa - Ab Karak , Peshawar , Islamabad aur Kahi bhi - Ab Kesi bhi Doctor k sath Appointment - Sirf Aik Click Per
                </p>
              </div>
              <button 
                onClick={() => setStep("symptoms")}
                className="w-full max-w-md lg:max-w-lg bg-[#0056b3] hover:bg-[#004494] text-white py-7 px-10 rounded-[24px] flex items-center justify-between group transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-blue-400/30 mb-6"
              >
                <span className="text-2xl font-bold flex-grow text-center pl-8">Book Your Appointment</span>
                <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" />
              </button>

              {showInstallButton && (
                <button 
                  onClick={handleInstallClick}
                  className="flex items-center gap-2 text-[#0056b3] font-bold hover:opacity-80 transition-opacity"
                >
                  <Download className="w-5 h-5" />
                  <span>Install App for Faster Access</span>
                </button>
              )}

              {isIOS && !window.matchMedia('(display-mode: standalone)').matches && (
                <div className="mt-4 p-4 bg-blue-50 rounded-2xl border border-blue-100 max-w-sm">
                  <p className="text-sm text-blue-800 font-medium">
                    iPhone users: Tap <span className="font-bold">Share</span> then <span className="font-bold">Add to Home Screen</span> to install.
                  </p>
                </div>
              )}
            </main>
          </motion.div>
        )}

        {step === "symptoms" && (
          <motion.div
            key="symptoms"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-4xl flex flex-col items-center"
          >
            <Header />
            
            {/* Search Doctor Section */}
            <div className="w-full max-w-2xl mb-12">
              <div className="text-center mb-6">
                <h2 className="text-3xl lg:text-4xl font-black text-[#003d7a] mb-2">Apne Matlooba Doctor Ka Naam Lekhen</h2>
                <p className="text-slate-500 font-medium">Search for a specific doctor by name</p>
              </div>
              
              <div className="relative group">
                <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                  <Search className="w-6 h-6 text-slate-400 group-focus-within:text-[#0070f3] transition-colors" />
                </div>
                <input 
                  type="text"
                  value={doctorSearchQuery}
                  onChange={(e) => setDoctorSearchQuery(e.target.value)}
                  placeholder="Doctor ka naam yahan likhen..."
                  className="w-full pl-16 pr-6 py-5 bg-white rounded-3xl border-2 border-slate-100 focus:border-[#0070f3] outline-none shadow-xl shadow-blue-900/5 text-lg font-bold text-slate-800 transition-all"
                />
                
                {/* Search Results */}
                <AnimatePresence>
                  {doctorSearchQuery.trim() !== "" && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 w-full mt-2 bg-white rounded-3xl shadow-2xl border border-blue-50 overflow-hidden z-50 max-h-64 overflow-y-auto"
                    >
                      {specialists
                        .filter(s => s.name.toLowerCase().includes(doctorSearchQuery.toLowerCase()))
                        .map(doc => (
                          <button
                            key={doc.id}
                            onClick={() => {
                              setSelectedSpecialist(doc);
                              setStep("profile");
                              setDoctorSearchQuery("");
                            }}
                            className="w-full p-4 flex items-center justify-between hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0"
                          >
                            <div className="flex items-center gap-3">
                              <img src={doc.image} alt={doc.name} className="w-10 h-10 rounded-full object-cover" />
                              <div className="text-left">
                                <p className="font-bold text-slate-900">{doc.name}</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                  <span>{doc.type}</span>
                                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                  <span className="text-[#0056b3]">{doc.city}</span>
                                </p>
                              </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-300" />
                          </button>
                        ))}
                      {specialists.filter(s => s.name.toLowerCase().includes(doctorSearchQuery.toLowerCase())).length === 0 && (
                        <div className="p-6 text-center text-slate-400 font-medium">
                          Koi doctor nahi mila
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="w-full text-center mb-10">
              <div className="flex items-center justify-center gap-6 mb-8">
                <div className="h-0.5 bg-gradient-to-r from-transparent to-slate-200 flex-grow max-w-[150px]"></div>
                <span className="text-slate-600 font-black uppercase tracking-[0.4em] text-lg bg-white px-6 py-2 rounded-2xl border border-slate-100 shadow-sm">Ya Phir</span>
                <div className="h-0.5 bg-gradient-to-l from-transparent to-slate-200 flex-grow max-w-[150px]"></div>
              </div>
              <h2 className="text-3xl lg:text-4xl font-black text-[#003d7a] mb-4">Neche Box me Apni Bemaari k baray me lekhen</h2>
              <p className="text-slate-500 font-medium flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 leading-relaxed">
                <span className="whitespace-nowrap">Taakeh hamari</span>
                <span className="relative inline-flex items-center">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#0070f3] to-[#0056b3] font-black text-xl tracking-tight">AI</span>
                </span>
                <span className="whitespace-nowrap">apke lye mutaaliqa Doctor dhoonde</span>
              </p>
            </div>

            <div className="w-full max-w-2xl bg-white rounded-[40px] p-8 lg:p-12 shadow-2xl shadow-blue-900/5 border border-blue-50 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#0070f3] to-[#0056b3]"></div>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-50 p-2 rounded-xl">
                  <Stethoscope className="w-6 h-6 text-[#0056b3]" />
                </div>
                <span className="font-bold text-slate-700">Symptom Description</span>
              </div>

              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="E.g., Mujhe kal se sar mein dard hai aur bukhar bhi..."
                className="w-full h-48 p-6 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-[#0070f3] focus:bg-white transition-all outline-none text-lg font-medium text-slate-800 resize-none"
              />

              <div className="mt-8 flex flex-col gap-4">
                <button 
                  onClick={analyzeSymptoms}
                  disabled={isAnalyzing || !symptoms.trim()}
                  className="w-full bg-[#0056b3] hover:bg-[#004494] disabled:bg-slate-300 text-white py-5 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-200"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      Find Specialists
                      <ArrowRight className="w-6 h-6" />
                    </>
                  )}
                </button>
                
                <div className="flex items-center gap-4 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                  <button 
                    onClick={() => {
                      setChatMessages([]);
                      setIsChatOpen(true);
                    }}
                    className="bg-[#0056b3] hover:bg-[#004494] text-white p-4 rounded-xl transition-all shadow-md"
                    title="AI Help"
                  >
                    <Bot className="w-6 h-6" />
                  </button>
                  <p className="text-sm font-bold text-[#0056b3] leading-tight">
                    Mai AI Bot hu - mai apki bemari achi trha bayan krne me apki madad kr skta hu
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === "locationSelection" && (
          <motion.div
            key="locationSelection"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-4xl flex flex-col items-center"
          >
            <Header />
            <div className="w-full text-center mb-12">
              <h2 className="text-4xl lg:text-5xl font-black text-[#003d7a] mb-4">Kaha pe Check Up karwana hai?</h2>
              <p className="text-slate-500 font-medium italic">Select your preferred city for the appointment.</p>
            </div>

            <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-2 gap-6">
              {(["Karak", "Peshawar", "Islamabad", "Rawalpindi"] as Specialist["city"][]).map((city) => (
                <button
                  key={city}
                  onClick={() => handleLocationSelect(city)}
                  className="bg-white p-8 rounded-[32px] shadow-lg shadow-blue-900/5 border border-blue-50 hover:border-[#0070f3] hover:bg-blue-50 transition-all group text-left flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-2xl font-black text-[#003d7a] group-hover:text-[#0070f3]">{city}</h4>
                    <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-1">Available Clinics</p>
                  </div>
                  <div className="bg-white p-3 rounded-2xl shadow-sm group-hover:bg-[#0056b3] group-hover:text-white transition-all">
                    <MapPin className="w-6 h-6" />
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === "specialists" && (
          <motion.div
            key="specialists"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-5xl flex flex-col items-center"
          >
            <Header />
            <div className="w-full mb-10 text-center">
              <h2 className="text-3xl lg:text-4xl font-black text-[#003d7a] mb-2">Recommended Specialists</h2>
              <p className="text-slate-500 font-medium">Select a specialist to view their full profile and book an appointment.</p>
            </div>

            {/* Tab-style Specialist List */}
            <div className="w-full max-w-3xl space-y-4">
              {suggestedSpecialists.map((doc) => (
                <motion.div
                  key={doc.id}
                  whileHover={{ x: 10 }}
                  onClick={() => {
                    setSelectedSpecialist(doc);
                    setStep("profile");
                  }}
                  className="bg-white p-5 rounded-2xl shadow-md border-l-8 border-l-[#0056b3] border border-slate-100 flex items-center justify-between cursor-pointer group transition-all"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-xl overflow-hidden shadow-sm">
                      <img 
                        src={doc.image} 
                        alt={doc.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-[#003d7a] group-hover:text-[#0070f3] transition-colors">{doc.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#0070f3]">{doc.type}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-sm font-medium text-slate-500">{doc.experience} Exp</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex flex-col items-end">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="font-bold text-[#003d7a]">{doc.rating}</span>
                      </div>
                      <span className="text-xs text-slate-400 font-bold uppercase">Rating</span>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-xl group-hover:bg-[#0056b3] group-hover:text-white transition-all">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {suggestedSpecialists.length === 0 && (
              <div className="text-center py-20">
                <p className="text-xl font-bold text-slate-400">No specialists found for these symptoms.</p>
                <button onClick={() => setStep("symptoms")} className="mt-4 text-[#0056b3] font-bold underline">Try describing differently</button>
              </div>
            )}
          </motion.div>
        )}

        {step === "profile" && selectedSpecialist && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-4xl flex flex-col items-center"
          >
            <Header />
            
            <div className="w-full bg-white rounded-[48px] overflow-hidden shadow-2xl shadow-blue-900/10 border border-blue-50">
              <div className="h-48 bg-gradient-to-r from-[#0056b3] to-[#0070f3] relative">
                <div className="absolute -bottom-16 left-12 p-2 bg-white rounded-[40px] shadow-xl">
                  <img 
                    src={selectedSpecialist.image} 
                    alt={selectedSpecialist.name} 
                    className="w-40 h-40 rounded-[32px] object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
              
              <div className="pt-20 px-12 pb-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                  <div>
                    <span className="bg-blue-50 text-[#0056b3] px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-widest mb-3 inline-block">
                      {selectedSpecialist.type}
                    </span>
                    <h2 className="text-4xl font-black text-[#003d7a]">{selectedSpecialist.name}</h2>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1.5 text-slate-600 font-bold">
                        <Star className="w-5 h-5 text-yellow-500 fill-current" />
                        <span>{selectedSpecialist.rating} (120+ Reviews)</span>
                      </div>
                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>
                      <div className="text-slate-600 font-bold">{selectedSpecialist.experience} Experience</div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => {
                      setIsBookingModalOpen(true);
                      setBookingStatus("idle");
                      setBookingName("");
                      setBookingPhone("");
                    }}
                    className="bg-[#0056b3] hover:bg-[#004494] text-white px-10 py-5 rounded-2xl font-bold text-lg shadow-xl shadow-blue-200 transition-all flex items-center gap-3"
                  >
                    <Calendar className="w-6 h-6" />
                    Book Now
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                  <div className="lg:col-span-2">
                    <h5 className="text-xl font-black text-[#003d7a] mb-4">About Specialist</h5>
                    <p className="text-slate-600 text-lg leading-relaxed mb-8">
                      {selectedSpecialist.bio}
                    </p>

                    {selectedSpecialist.aiSummary && (
                      <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 mb-8">
                        <div className="flex items-center gap-2 mb-2">
                          <Bot className="w-5 h-5 text-[#0056b3]" />
                          <span className="font-black text-[#0056b3] text-sm uppercase tracking-wider">AI Intelligence Summary</span>
                        </div>
                        <p className="text-slate-700 font-medium italic">
                          {selectedSpecialist.aiSummary}
                        </p>
                      </div>
                    )}
                    
                    <h5 className="text-xl font-black text-[#003d7a] mb-4">Location</h5>
                    <div className="flex items-start gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                      <div className="bg-white p-3 rounded-2xl shadow-sm">
                        <MapPin className="w-6 h-6 text-[#0056b3]" />
                      </div>
                      <div>
                        <p className="font-bold text-[#003d7a] text-lg">{selectedSpecialist.location}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50/50 p-8 rounded-[40px] border border-blue-100">
                    <h5 className="text-xl font-black text-[#003d7a] mb-6">Availability</h5>
                    <div className="mb-6 pb-6 border-b border-blue-100">
                      <p className="text-sm font-bold text-slate-400 uppercase mb-2 tracking-wider">Timing</p>
                      <p className="text-lg font-black text-[#0056b3]">{selectedSpecialist.timing || "09:00 AM - 05:00 PM"}</p>
                    </div>
                    <div className="space-y-4">
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
                        <div key={day} className="flex items-center justify-between">
                          <span className="font-bold text-slate-600">{day}</span>
                          {selectedSpecialist.availability.includes(day) ? (
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-black uppercase">Available</span>
                          ) : (
                            <span className="text-slate-400 text-xs font-bold uppercase">Closed</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === "admin" && (
          <motion.div
            key="admin"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-5xl flex flex-col items-center"
          >
            <Header />
            <div className="w-full flex items-center justify-between mb-8">
              <h2 className="text-3xl font-black text-[#003d7a]">Manage Specialists</h2>
              <button 
                onClick={() => {
                  setIsAddingDoc(true);
                  setAdminForm({});
                }}
                className="bg-[#0056b3] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-[#004494] transition-all"
              >
                <Plus className="w-5 h-5" />
                Add Specialist
              </button>
            </div>

            <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {specialists.map(doc => (
                <div key={doc.id} className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100 flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <img src={doc.image} alt={doc.name} className="w-16 h-16 rounded-2xl object-cover" referrerPolicy="no-referrer" />
                    <div>
                      <h4 className="font-black text-[#003d7a]">{doc.name}</h4>
                      <p className="text-sm font-bold text-[#0070f3]">{doc.type}</p>
                      <p className="text-xs text-slate-400 font-bold">{doc.city}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-auto">
                    <button 
                      onClick={() => {
                        setEditingDoc(doc);
                        setAdminForm(doc);
                      }}
                      className="p-2 bg-blue-50 text-[#0056b3] rounded-lg hover:bg-blue-100 transition-all"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {(isAddingDoc || editingDoc) && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                  <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-2xl font-black text-[#003d7a]">
                      {editingDoc ? "Edit Specialist" : "Add New Specialist"}
                    </h3>
                    <button onClick={() => { setIsAddingDoc(false); setEditingDoc(null); }} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="p-8 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-500 uppercase">Full Name</label>
                        <input 
                          type="text" 
                          value={adminForm.name || ""} 
                          onChange={e => setAdminForm(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full p-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-[#0070f3] outline-none font-bold"
                          placeholder="Dr. John Doe"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-500 uppercase">Specialist Type</label>
                        <input 
                          type="text" 
                          value={adminForm.type || ""} 
                          onChange={e => setAdminForm(prev => ({ ...prev, type: e.target.value }))}
                          className="w-full p-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-[#0070f3] outline-none font-bold"
                          placeholder="e.g. Dentist"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-500 uppercase">City</label>
                        <select 
                          value={adminForm.city || ""} 
                          onChange={e => setAdminForm(prev => ({ ...prev, city: e.target.value as any }))}
                          className="w-full p-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-[#0070f3] outline-none font-bold"
                        >
                          <option value="">Select City</option>
                          <option value="Karak">Karak</option>
                          <option value="Peshawar">Peshawar</option>
                          <option value="Islamabad">Islamabad</option>
                          <option value="Rawalpindi">Rawalpindi</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-500 uppercase">Experience</label>
                        <input 
                          type="text" 
                          value={adminForm.experience || ""} 
                          onChange={e => setAdminForm(prev => ({ ...prev, experience: e.target.value }))}
                          className="w-full p-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-[#0070f3] outline-none font-bold"
                          placeholder="e.g. 10 Years"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-500 uppercase">Clinic Location</label>
                      <input 
                        type="text" 
                        value={adminForm.location || ""} 
                        onChange={e => setAdminForm(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full p-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-[#0070f3] outline-none font-bold"
                        placeholder="e.g. Karak Medical Center"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-500 uppercase">Assistant WhatsApp Number</label>
                      <input 
                        type="text" 
                        value={adminForm.assistantPhone || ""} 
                        onChange={e => setAdminForm(prev => ({ ...prev, assistantPhone: e.target.value }))}
                        className="w-full p-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-[#0070f3] outline-none font-bold"
                        placeholder="e.g. 923001234567"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-500 uppercase">Bio / Description</label>
                      <textarea 
                        value={adminForm.bio || ""} 
                        onChange={e => setAdminForm(prev => ({ ...prev, bio: e.target.value }))}
                        className="w-full h-32 p-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-[#0070f3] outline-none font-bold resize-none"
                        placeholder="Describe the specialist..."
                      />
                    </div>

                    <div className="space-y-4 p-6 bg-slate-50 rounded-3xl border-2 border-slate-100">
                      <h4 className="font-black text-[#003d7a] uppercase text-sm tracking-wider">Availability & Timing</h4>
                      
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Consultation Timing</label>
                        <input 
                          type="text" 
                          value={adminForm.timing || ""} 
                          onChange={e => setAdminForm(prev => ({ ...prev, timing: e.target.value }))}
                          className="w-full p-4 rounded-xl bg-white border-2 border-transparent focus:border-[#0070f3] outline-none font-bold"
                          placeholder="e.g. 09:00 AM - 02:00 PM"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-400 uppercase">Available Days</label>
                        <div className="flex flex-wrap gap-2">
                          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => {
                            const isSelected = adminForm.availability?.includes(day);
                            return (
                              <button
                                key={day}
                                onClick={() => {
                                  const current = adminForm.availability || [];
                                  const next = isSelected 
                                    ? current.filter(d => d !== day)
                                    : [...current, day];
                                  setAdminForm(prev => ({ ...prev, availability: next }));
                                }}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                  isSelected 
                                    ? "bg-[#0056b3] text-white shadow-md shadow-blue-100" 
                                    : "bg-white text-slate-400 border border-slate-200 hover:border-blue-200"
                                }`}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-8 border-t border-slate-100 flex gap-4">
                    <button 
                      onClick={() => { setIsAddingDoc(false); setEditingDoc(null); }}
                      className="flex-1 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveDoc}
                      className="flex-1 py-4 bg-[#0056b3] text-white rounded-xl font-bold hover:bg-[#004494] transition-all shadow-lg shadow-blue-200"
                    >
                      Save Specialist
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-auto pt-16 pb-6 text-center flex flex-col items-center gap-4">
        <p className="text-xs font-bold tracking-[0.3em] text-slate-400 uppercase opacity-80">
          Only for the people of Karak
        </p>
        <div className="flex flex-col items-center text-[#003d7a] leading-relaxed">
          <span className="text-[11px] font-bold opacity-60">Designed and Developed</span>
          <span className="text-[9px] font-medium opacity-50 italic">by</span>
          <span className="text-sm font-black text-[#0056b3] mt-0.5">Munir Khattak</span>
          <span className="text-[9px] font-medium text-slate-400 mt-1">All Rights Reserved ®</span>
        </div>
      </footer>

      {/* Hidden Admin Trigger */}
      <div 
        onClick={handleAdminTrigger}
        className="fixed bottom-0 left-0 w-24 h-24 z-[60] cursor-default"
        title="Admin Access"
      ></div>

      {/* Admin Password Modal */}
      <AnimatePresence>
        {showAdminLogin && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-10 flex flex-col items-center text-center"
            >
              <div className="bg-blue-50 p-4 rounded-3xl mb-6">
                <Bot className="w-10 h-10 text-[#0056b3]" />
              </div>
              <h3 className="text-2xl font-black text-[#003d7a] mb-2">Admin Access</h3>
              <p className="text-slate-500 font-medium mb-8">Please enter the admin password to continue.</p>
              
              <input 
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAdminLogin()}
                placeholder="Enter Password"
                className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-[#0056b3] outline-none text-center font-bold text-xl mb-6 transition-all"
                autoFocus
              />

              <div className="flex gap-4 w-full">
                <button 
                  onClick={() => {
                    setShowAdminLogin(false);
                    setAdminPassword("");
                    setAdminClickCount(0);
                  }}
                  className="flex-1 py-4 rounded-2xl font-bold text-slate-400 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAdminLogin}
                  className="flex-1 py-4 bg-[#0056b3] text-white rounded-2xl font-bold hover:bg-[#004494] transition-all shadow-lg shadow-blue-200"
                >
                  Login
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Booking Modal */}
      <AnimatePresence>
        {isBookingModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="bg-[#0056b3] p-8 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="w-6 h-6" />
                  <h3 className="text-xl font-black">Book Appointment</h3>
                </div>
                <button 
                  onClick={() => setIsBookingModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                {bookingStatus === "idle" ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Full Name</label>
                      <input 
                        type="text" 
                        value={bookingName}
                        onChange={(e) => setBookingName(e.target.value)}
                        placeholder="Enter your name"
                        className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-[#0056b3] outline-none font-bold transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Phone Number</label>
                      <input 
                        type="text" 
                        value={bookingPhone}
                        onChange={(e) => setBookingPhone(e.target.value)}
                        placeholder="e.g. 0300 1234567"
                        className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-[#0056b3] outline-none font-bold transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Appointment Day</label>
                      <div className="grid grid-cols-4 gap-2">
                        {selectedSpecialist?.availability.map(day => (
                          <button
                            key={day}
                            onClick={() => setBookingDay(day)}
                            className={`py-3 rounded-xl text-xs font-black transition-all border-2 ${
                              bookingDay === day 
                                ? "bg-[#0056b3] text-white border-[#0056b3] shadow-lg shadow-blue-100" 
                                : "bg-slate-50 text-slate-400 border-transparent hover:border-blue-100"
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                      {!bookingDay && (
                        <p className="text-[10px] text-red-400 font-bold mt-1">* Please select a day for your appointment</p>
                      )}
                    </div>
                    <div className="bg-blue-50 p-4 rounded-2xl flex items-start gap-3">
                      <MessageSquare className="w-5 h-5 text-[#0056b3] mt-0.5" />
                      <p className="text-xs text-[#0056b3] font-bold leading-relaxed">
                        Booking request will be sent to the doctor's assistant via WhatsApp. They will reply with your booking number.
                      </p>
                    </div>
                    <button 
                      onClick={handleConfirmBooking}
                      className="w-full py-5 bg-[#0056b3] text-white rounded-2xl font-black text-lg hover:bg-[#004494] transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3"
                    >
                      Send Request
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </>
                ) : bookingStatus === "sent" ? (
                  <div className="text-center py-6 space-y-6">
                    <div className="bg-green-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-10 h-10 text-green-500" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-[#003d7a] mb-2">Request Sent!</h4>
                      <p className="text-slate-500 font-medium px-4">
                        Aapki request assistant ko bhej di gayi hai. Jab wo aapko WhatsApp par Booking Number bhej den, to yahan enter karen.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Received Booking Number</label>
                      <input 
                        type="text" 
                        value={bookingNumber}
                        onChange={(e) => setBookingNumber(e.target.value)}
                        placeholder="e.g. BK-1024"
                        className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-[#0056b3] outline-none font-bold text-center text-xl tracking-widest transition-all"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        if (bookingNumber.trim()) {
                          setBookingStatus("confirmed");
                          if (activeAppointment) {
                            setActiveAppointment({
                              ...activeAppointment,
                              bookingNumber: bookingNumber,
                              status: "confirmed"
                            });
                          }
                        } else {
                          alert("Please enter the booking number you received.");
                        }
                      }}
                      className="w-full py-5 bg-green-500 text-white rounded-2xl font-black text-lg hover:bg-green-600 transition-all shadow-xl shadow-green-100"
                    >
                      Confirm Appointment
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-6 space-y-6">
                    <div className="bg-green-500 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-green-100">
                      <CheckCircle2 className="w-10 h-10 text-white" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-[#003d7a] mb-2">Appointment Confirmed!</h4>
                      <p className="text-slate-500 font-medium mb-4">
                        Your appointment with <span className="text-[#0056b3] font-bold">{selectedSpecialist?.name}</span> is confirmed.
                      </p>
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 inline-block">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Booking Number</p>
                        <p className="text-3xl font-black text-[#003d7a] tracking-widest">{bookingNumber}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsBookingModalOpen(false)}
                      className="w-full py-5 bg-slate-100 text-slate-600 rounded-2xl font-black text-lg hover:bg-slate-200 transition-all"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Background Decorative Elements */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-64 h-48 opacity-10 pointer-events-none -z-10 bg-[repeating-linear-gradient(90deg,transparent,transparent_6px,#0056b3_6px,#0056b3_7px)]"></div>

      {/* Floating Appointment Button */}
      <AnimatePresence>
        {activeAppointment && (
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="fixed bottom-8 left-8 z-40"
          >
            <button
              onClick={() => setShowAppointmentDetails(true)}
              className="bg-[#0056b3] text-white w-28 h-28 rounded-full shadow-2xl flex flex-col items-center justify-center gap-1 hover:scale-105 transition-all active:scale-95 group border-4 border-white/20 relative"
            >
              <Calendar className={`w-7 h-7 ${activeAppointment.status === "pending" ? "animate-pulse" : ""}`} />
              <div className="flex flex-col items-center">
                <span className="font-black text-[10px] uppercase tracking-tighter leading-none">Your</span>
                <span className="font-black text-[10px] uppercase tracking-tighter leading-none">Appointment</span>
              </div>
              {activeAppointment.status === "pending" && (
                <div className="absolute top-5 right-5 w-3 h-3 bg-red-400 rounded-full animate-ping"></div>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Appointment Details Modal */}
      <AnimatePresence>
        {showAppointmentDetails && activeAppointment && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[120] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="bg-[#003d7a] p-8 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="w-6 h-6" />
                  <h3 className="text-xl font-black">
                    {activeAppointment.status === "pending" ? "Confirm Appointment" : "Appointment Details"}
                  </h3>
                </div>
                <button 
                  onClick={() => setShowAppointmentDetails(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                {activeAppointment.status === "pending" ? (
                  <div className="text-center space-y-6">
                    <div className="bg-blue-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto">
                      <MessageSquare className="w-10 h-10 text-[#0056b3]" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-[#003d7a] mb-2">Enter Booking Number</h4>
                      <p className="text-slate-500 font-medium px-4">
                        Aapke WhatsApp par assistant ne jo Booking Number bheja hai, wo yahan enter karke confirm karen.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Booking Number</label>
                      <input 
                        type="text" 
                        value={bookingNumber}
                        onChange={(e) => setBookingNumber(e.target.value)}
                        placeholder="e.g. BK-1024"
                        className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-[#0056b3] outline-none font-bold text-center text-xl tracking-widest transition-all"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        if (bookingNumber.trim()) {
                          setActiveAppointment({
                            ...activeAppointment,
                            bookingNumber: bookingNumber,
                            status: "confirmed"
                          });
                        } else {
                          alert("Please enter the booking number you received.");
                        }
                      }}
                      className="w-full py-5 bg-green-500 text-white rounded-2xl font-black text-lg hover:bg-green-600 transition-all shadow-xl shadow-green-100"
                    >
                      Confirm Now
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                      <div className="bg-white p-3 rounded-2xl shadow-sm">
                        <Stethoscope className="w-6 h-6 text-[#0056b3]" />
                      </div>
                      <div>
                        <h4 className="font-black text-[#003d7a]">{activeAppointment.doctorName}</h4>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{activeAppointment.doctorType}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-50">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Day</p>
                        <p className="font-black text-[#0056b3]">{activeAppointment.day}</p>
                      </div>
                      <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-50">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Timing</p>
                        <p className="font-black text-[#0056b3]">{activeAppointment.timing}</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Location</p>
                      <p className="font-bold text-[#003d7a] text-sm">{activeAppointment.location}</p>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-2xl border border-green-100">
                      <div>
                        <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Status</p>
                        <p className="font-black uppercase text-xs text-green-700">Confirmed</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Booking ID</p>
                        <p className="font-black text-[#003d7a] tracking-widest">{activeAppointment.bookingNumber}</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => setShowAppointmentDetails(false)}
                      className="w-full py-5 bg-[#0056b3] text-white rounded-2xl font-black text-lg hover:bg-[#004494] transition-all shadow-xl shadow-blue-100"
                    >
                      Got it
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Chat Button */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-8 right-8 bg-[#0056b3] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all active:scale-95 z-40 group"
      >
        <Bot className="w-8 h-8" />
        <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-white text-[#0056b3] px-4 py-2 rounded-xl text-sm font-bold shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-blue-50">
          Need help? Chat with AI
        </span>
      </button>

      {/* Chat Interface */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-8 right-8 w-[90vw] sm:w-[400px] h-[600px] bg-white rounded-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] z-50 flex flex-col overflow-hidden border border-blue-50"
          >
            {/* Chat Header */}
            <div className="bg-[#0056b3] p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold">Medical Assistant</h4>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs opacity-80">AI Powered</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <ArrowRight className="w-6 h-6 rotate-90" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-grow overflow-y-auto p-6 space-y-4 bg-slate-50/50">
              {activeAppointment && (
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-xl shadow-sm">
                      <Calendar className="w-4 h-4 text-[#0056b3]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-[#0056b3] uppercase tracking-widest">Upcoming Appointment</p>
                      <p className="text-xs font-bold text-slate-700">{activeAppointment.doctorName} - {activeAppointment.day}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowAppointmentDetails(true)}
                    className="text-[10px] font-black text-[#0056b3] uppercase hover:underline"
                  >
                    Details
                  </button>
                </div>
              )}
              {chatMessages.length === 0 && (
                <div className="text-center py-10">
                  <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Bot className="w-8 h-8 text-[#0056b3]" />
                  </div>
                  <h5 className="font-bold text-[#003d7a] mb-2">How can I help you today?</h5>
                  <p className="text-sm text-slate-500 px-8">
                    {step === "symptoms" 
                      ? "Apni bemaari ke baaray mein bataen, main aapki madad kar sakta hoon." 
                      : "Ask me about your symptoms, or find the best doctors."}
                  </p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium leading-relaxed ${
                    msg.role === "user" 
                      ? "bg-[#0056b3] text-white rounded-tr-none" 
                      : "bg-white text-slate-700 shadow-sm border border-blue-50 rounded-tl-none"
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-blue-50">
                    <Loader2 className="w-5 h-5 animate-spin text-[#0056b3]" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 bg-white border-t border-slate-100">
              <div className="flex items-center gap-2 bg-slate-50 rounded-2xl p-2 border border-slate-200 focus-within:border-[#0056b3] transition-colors">
                <input 
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Type your message..."
                  className="flex-grow bg-transparent px-4 py-2 outline-none text-sm font-medium text-slate-700"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!userInput.trim() || isChatLoading}
                  className="bg-[#0056b3] text-white p-2 rounded-xl disabled:opacity-50 hover:bg-[#004494] transition-colors"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[10px] text-center text-slate-400 mt-2 font-medium">
                AI can make mistakes. Check important info.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

