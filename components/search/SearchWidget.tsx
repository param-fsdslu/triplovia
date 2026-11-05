"use client";

/**
 * SearchWidget — the primary search form on the homepage hero section.
 *
 * Shares state with the /hotels search box via useSearchStore (Zustand).
 * Tabs are dynamically rendered based on enabled feature flags (hotels, boats, cabs, bikes).
 *
 * Hotel tab: HotelSearchBox (destination, check-in/out with nights, rooms & guests,
 * price per night, stay-type chips).
 * Boat tab: single date picker + passenger count (shares adults state).
 *
 * On search, builds URL query params from store state and navigates to /hotels
 * (or /boats) results page. The store state then hydrates HotelSearchBox/BoatFilters
 * via hydrateFromParams() on the results page mount.
 *
 * Two separate useShallow selectors — one for state values, one for actions —
 * prevent unnecessary re-renders when only unrelated store fields change.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Calendar as CalendarIcon, MapPin, Search, Car, Hotel, Bike, Ship, Minus, Plus, User, AlertCircle } from "@/components/icons";
import { useShallow } from "zustand/react/shallow";

import { cn, getMaxBookableDate } from "@/lib/utils";
import { isFeatureEnabled } from "@/lib/config/features";
import { useSearchStore } from "@/lib/stores/use-search-store";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { HotelSearchBox } from "./HotelSearchBox";

export function SearchWidget() {
  const router = useRouter();
  const [boatDateError, setBoatDateError] = React.useState(false);

  const {
    location, boatDate, adults, children,
    isGuestOpen, activeTab,
  } = useSearchStore(
    useShallow((s) => ({
      location: s.location,
      boatDate: s.boatDate,
      adults: s.adults,
      children: s.children,
      isGuestOpen: s.isGuestOpen,
      activeTab: s.activeTab,
    }))
  );

  const {
    setBoatDate, setAdults, setChildren,
    setIsGuestOpen, setActiveTab,
  } = useSearchStore(
    useShallow((s) => ({
      setBoatDate: s.setBoatDate,
      setAdults: s.setAdults,
      setChildren: s.setChildren,
      setIsGuestOpen: s.setIsGuestOpen,
      setActiveTab: s.setActiveTab,
    }))
  );

  const GuestCounter = ({ label, value, setValue, min = 0 }: { label: string, value: number, setValue: (v: number) => void, min?: number }) => (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <span className="text-sm font-medium text-foreground/70">{label}</span>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full border-primary/30 text-primary hover:bg-primary/10 hover:text-primary disabled:opacity-50"
          onClick={() => setValue(Math.max(min, value - 1))}
          disabled={value <= min}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-4 text-center text-sm font-semibold">{value}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
          onClick={() => setValue(value + 1)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const defaultTab = isFeatureEnabled('hotels') ? 'hotels' : isFeatureEnabled('boats') ? 'boats' : 'hotels';
  // A single category needs no tab strip
  const showTabs = (['hotels', 'cabs', 'bikes', 'boats'] as const).filter((f) => isFeatureEnabled(f)).length > 1;

  return (
    <div className="w-full relative z-20">
      <Tabs value={activeTab || defaultTab} onValueChange={(v) => setActiveTab(v as 'hotels' | 'boats')} className="w-full">
        {/* Tabs Header */}
        {showTabs && (
        <TabsList className="flex w-full h-auto p-0 bg-transparent gap-1 sm:gap-2 mb-0 justify-start overflow-x-auto scrollbar-hide">
          {isFeatureEnabled('hotels') && (
            <TabsTrigger
              value="hotels"
              className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-3 sm:py-4 rounded-t-xl rounded-b-none border-0 bg-white/80 backdrop-blur-sm data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-none transition-all hover:bg-white/90"
            >
              <Hotel className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-sm sm:text-base font-semibold">Hotels</span>
            </TabsTrigger>
          )}
          {isFeatureEnabled('cabs') && (
            <TabsTrigger
              value="cabs"
              disabled
              className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-3 sm:py-4 rounded-t-xl rounded-b-none border-0 bg-white/40 backdrop-blur-sm opacity-50 cursor-not-allowed"
            >
              <Car className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-sm sm:text-base font-semibold hidden sm:inline">Cabs</span>
            </TabsTrigger>
          )}
          {isFeatureEnabled('bikes') && (
            <TabsTrigger
              value="bikes"
              disabled
              className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-3 sm:py-4 rounded-t-xl rounded-b-none border-0 bg-white/40 backdrop-blur-sm opacity-50 cursor-not-allowed"
            >
              <Bike className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-sm sm:text-base font-semibold hidden sm:inline">Bikes</span>
            </TabsTrigger>
          )}
          {isFeatureEnabled('boats') && (
            <TabsTrigger
              value="boats"
              className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-3 sm:py-4 rounded-t-xl rounded-b-none border-0 bg-white/80 backdrop-blur-sm data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-none transition-all hover:bg-white/90"
            >
              <Ship className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-sm sm:text-base font-semibold">Boats</span>
            </TabsTrigger>
          )}
        </TabsList>
        )}

        {/* Search Box Container */}
        <div
          className={cn(
            "bg-white border border-border p-2 sm:p-4 shadow-[0_24px_60px_-20px_rgba(7,63,61,0.35)]",
            showTabs ? "rounded-b-2xl rounded-tr-2xl" : "rounded-2xl"
          )}
        >

          {/* Hotels Tab Content */}
          {isFeatureEnabled('hotels') && (
          <TabsContent value="hotels" className="mt-0">
            <HotelSearchBox />
          </TabsContent>
          )}

          {/* Cabs Tab Content */}
          {isFeatureEnabled('cabs') && (
          <TabsContent value="cabs" className="mt-0">
             <div className="grid grid-cols-1 md:grid-cols-12 gap-2 p-1 rounded-full">
              <div className="md:col-span-3 relative">
                <MapPin className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input placeholder="From" className="pl-10 sm:pl-12 h-12 sm:h-14 border border-border shadow-none text-sm sm:text-base font-medium focus-visible:ring-1 focus-visible:ring-primary rounded-full" />
              </div>
              <div className="md:col-span-3 relative">
                <MapPin className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input placeholder="To" className="pl-10 sm:pl-12 h-12 sm:h-14 border border-border shadow-none text-sm sm:text-base font-medium focus-visible:ring-1 focus-visible:ring-primary rounded-full" />
              </div>
              <div className="md:col-span-4">
                 <Button variant="outline" className="w-full justify-start h-12 sm:h-14 px-3 sm:px-4 text-sm sm:text-base font-medium text-muted-foreground hover:bg-muted/50 rounded-full">
                    <CalendarIcon className="mr-2 sm:mr-3 h-5 w-5" />
                    Pickup Date & Time
                 </Button>
              </div>
              <div className="md:col-span-2">
                <Button className="w-full h-12 sm:h-14 text-base sm:text-lg font-bold rounded-full">
                  Search
                </Button>
              </div>
            </div>
          </TabsContent>
          )}

          {/* Bikes Tab Content */}
          {isFeatureEnabled('bikes') && (
          <TabsContent value="bikes" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 p-1 rounded-full">
               <div className="md:col-span-6">
                  <Select>
                    <SelectTrigger className="h-12 sm:h-14 border border-border shadow-none text-sm sm:text-base font-medium focus:ring-1 focus:ring-primary px-3 sm:px-4 rounded-full">
                      <SelectValue placeholder="Select Bike Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scooter">Scooter (Activa/Dio)</SelectItem>
                      <SelectItem value="bike">Motorcycle (Royal Enfield)</SelectItem>
                      <SelectItem value="sport">Sports Bike</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
               <div className="md:col-span-4">
                 <Button variant="outline" className="w-full justify-start h-12 sm:h-14 px-3 sm:px-4 text-sm sm:text-base font-medium text-muted-foreground hover:bg-muted/50 rounded-full">
                    <CalendarIcon className="mr-2 sm:mr-3 h-5 w-5" />
                    Pickup Date
                 </Button>
               </div>
               <div className="md:col-span-2">
                <Button className="w-full h-12 sm:h-14 text-base sm:text-lg font-bold rounded-full">
                  Search
                </Button>
              </div>
            </div>
          </TabsContent>
          )}

          {/* Boats Tab Content */}
          {isFeatureEnabled('boats') && (
          <TabsContent value="boats" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 p-1 rounded-full">
               <div className="md:col-span-4 relative group">
                 <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                   <MapPin className="h-5 w-5 sm:h-6 sm:w-6" />
                 </div>
                 <Input
                   placeholder="Departure location"
                   className="pl-10 sm:pl-12 h-12 sm:h-14 border border-border shadow-none text-sm sm:text-base font-medium placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary hover:border-primary/50 rounded-full transition-colors cursor-default"
                   value={location}
                   readOnly
                   title="More locations coming soon"
                 />
               </div>
               <div className="md:col-span-3">
                 <Popover>
                   <PopoverTrigger asChild>
                     <Button
                       variant="outline"
                       className={cn(
                         "w-full justify-start text-left font-medium h-12 sm:h-14 shadow-none rounded-full px-3 sm:px-4 bg-card hover:bg-muted/50 hover:text-foreground hover:border-primary/50 transition-colors",
                         !boatDate && "text-muted-foreground",
                         boatDateError && "border-destructive ring-1 ring-destructive"
                       )}
                     >
                       <CalendarIcon className={cn("mr-2 sm:mr-3 h-5 w-5", boatDateError ? "text-destructive" : "text-muted-foreground")} />
                       {boatDate ? format(boatDate, "EEE, MMM d") : <span className={boatDateError ? "text-destructive" : ""}>Trip Date</span>}
                     </Button>
                   </PopoverTrigger>
                   <PopoverContent className="w-auto p-0" align="start">
                     <Calendar
                       mode="single"
                       selected={boatDate}
                       onSelect={(date) => { setBoatDate(date); if (date) setBoatDateError(false); }}
                       disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0)) || date > getMaxBookableDate()}
                       toDate={getMaxBookableDate()}
                       initialFocus
                     />
                   </PopoverContent>
                 </Popover>
                 {boatDateError && (
                   <p className="flex items-center gap-1 text-destructive text-xs mt-1 px-1">
                     <AlertCircle className="h-3 w-3 shrink-0" />
                     Please select a trip date
                   </p>
                 )}
               </div>
               <div className="md:col-span-3">
                 <Popover open={isGuestOpen} onOpenChange={setIsGuestOpen}>
                   <PopoverTrigger asChild>
                     <Button
                       variant="outline"
                       className="w-full justify-start text-left font-medium h-12 sm:h-14 shadow-none rounded-full px-3 sm:px-4 bg-card hover:bg-muted/50 hover:text-foreground hover:border-primary/50 transition-colors"
                     >
                       <User className="mr-2 sm:mr-3 h-5 w-5 text-muted-foreground" />
                       <span className="truncate text-foreground/70 text-sm sm:text-base">
                         {adults + children} passengers
                       </span>
                     </Button>
                   </PopoverTrigger>
                   <PopoverContent className="w-72 sm:w-80 p-4" align="end">
                     <div className="space-y-1">
                       <GuestCounter label="Adults" value={adults} setValue={setAdults} min={1} />
                       <GuestCounter label="Children" value={children} setValue={setChildren} />
                     </div>
                     <Button
                       className="w-full mt-4"
                       variant="outline"
                       onClick={() => setIsGuestOpen(false)}
                     >
                       Done
                     </Button>
                   </PopoverContent>
                 </Popover>
               </div>
               <div className="md:col-span-2">
                <Button
                  onClick={() => {
                    if (!boatDate) {
                      setBoatDateError(true);
                      return;
                    }
                    setBoatDateError(false);
                    const params = new URLSearchParams();
                    if (location) params.set('location', location);
                    params.set('date', format(boatDate, 'yyyy-MM-dd'));
                    params.set('passengers', (adults + children).toString());
                    router.push(`/boats?${params.toString()}`);
                  }}
                  className="w-full h-12 sm:h-14 text-base sm:text-lg font-bold rounded-full shadow-sm transition-all active:scale-[0.98]"
                >
                  <Search className="mr-2 h-5 w-5 sm:hidden" />
                  Search
                </Button>
              </div>
            </div>
          </TabsContent>
          )}

        </div>
      </Tabs>
    </div>
  );
}
