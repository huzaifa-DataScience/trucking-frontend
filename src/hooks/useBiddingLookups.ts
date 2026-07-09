"use client";

import { useCallback, useEffect, useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import * as lookupsApi from "@/lib/api/endpoints/lookups";
import { getApiErrorMessage } from "@/lib/api/client";
import type {
  BidStateLookup,
  BidTeam,
  BidWageRate,
  LookupNameItem,
  PayrollBurdenItem,
} from "@/lib/bidding/types";
import type { LookupItem } from "@/lib/api/types";

export function useBiddingLookups() {
  const [teams, setTeams] = useState<BidTeam[]>([]);
  const [wageRates, setWageRates] = useState<BidWageRate[]>([]);
  const [payrollBurden, setPayrollBurden] = useState<PayrollBurdenItem[]>([]);
  const [states, setStates] = useState<BidStateLookup[]>([]);
  const [projectTypes, setProjectTypes] = useState<LookupNameItem[]>([]);
  const [buildingTypes, setBuildingTypes] = useState<LookupNameItem[]>([]);
  const [preferences, setPreferences] = useState<LookupNameItem[]>([]);
  const [ourEntities, setOurEntities] = useState<LookupItem[]>([]);
  const [jobs, setJobs] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadWageRates = useCallback(async () => {
    const w = await biddingApi.getBiddingWageRates();
    setWageRates(w);
    return w;
  }, []);

  const reloadPayrollBurden = useCallback(async () => {
    const p = await biddingApi.getBiddingPayrollBurden();
    setPayrollBurden(p);
    return p;
  }, []);

  const reloadTeams = useCallback(async () => {
    const t = await biddingApi.getBiddingTeams();
    setTeams(t);
    return t;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      biddingApi.getBiddingTeams(),
      biddingApi.getBiddingWageRates(),
      biddingApi.getBiddingPayrollBurden(),
      biddingApi.getBiddingStates(),
      biddingApi.getBiddingProjectTypes(),
      biddingApi.getBiddingBuildingTypes(),
      biddingApi.getBiddingPreferences(),
      lookupsApi.getOurEntities(),
      lookupsApi.getJobs(),
    ])
      .then(([t, w, pb, st, pt, bt, pref, entities, jobList]) => {
        if (cancelled) return;
        setTeams(t);
        setWageRates(w);
        setPayrollBurden(pb);
        setStates(st);
        setProjectTypes(pt);
        setBuildingTypes(bt);
        setPreferences(pref);
        setOurEntities(entities);
        setJobs(jobList);
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
    payrollBurden,
    states,
    projectTypes,
    buildingTypes,
    preferences,
    ourEntities,
    jobs,
    loading,
    error,
    reloadWageRates,
    reloadPayrollBurden,
    reloadTeams,
  };
}
