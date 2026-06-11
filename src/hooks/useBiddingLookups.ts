"use client";

import { useEffect, useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import * as lookupsApi from "@/lib/api/endpoints/lookups";
import { getApiErrorMessage } from "@/lib/api/client";
import type {
  BidStateLookup,
  BidTeam,
  BidWageRate,
  LookupNameItem,
} from "@/lib/bidding/types";
import type { LookupItem } from "@/lib/api/types";

export function useBiddingLookups() {
  const [teams, setTeams] = useState<BidTeam[]>([]);
  const [wageRates, setWageRates] = useState<BidWageRate[]>([]);
  const [states, setStates] = useState<BidStateLookup[]>([]);
  const [projectTypes, setProjectTypes] = useState<LookupNameItem[]>([]);
  const [buildingTypes, setBuildingTypes] = useState<LookupNameItem[]>([]);
  const [preferences, setPreferences] = useState<LookupNameItem[]>([]);
  const [ourEntities, setOurEntities] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      biddingApi.getBiddingTeams(),
      biddingApi.getBiddingWageRates(),
      biddingApi.getBiddingStates(),
      biddingApi.getBiddingProjectTypes(),
      biddingApi.getBiddingBuildingTypes(),
      biddingApi.getBiddingPreferences(),
      lookupsApi.getOurEntities(),
    ])
      .then(([t, w, st, pt, bt, pref, entities]) => {
        if (cancelled) return;
        setTeams(t);
        setWageRates(w);
        setStates(st);
        setProjectTypes(pt);
        setBuildingTypes(bt);
        setPreferences(pref);
        setOurEntities(entities);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(getApiErrorMessage(e, "Failed to load bidding lookups"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    teams,
    wageRates,
    states,
    projectTypes,
    buildingTypes,
    preferences,
    ourEntities,
    loading,
    error,
  };
}
