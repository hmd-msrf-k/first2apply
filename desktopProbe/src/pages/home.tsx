import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useError } from "@/hooks/error";
import { useSettings } from "@/hooks/settings";
import { useLinks } from "@/hooks/links";

import {
  listJobs,
  updateJobStatus,
  openExternalUrl,
  scanJob,
} from "@/lib/electronMainSdk";

import { DefaultLayout } from "./defaultLayout";
import { CronScheduleSkeleton } from "@/components/skeletons/CronScheduleSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { JobsListSkeleton } from "@/components/skeletons/JobsListSkeleton";
import { Button } from "@/components/ui/button";
import { JobsList } from "@/components/jobsList";
import { CronSchedule } from "@/components/cronSchedule";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Job, JobStatus } from "../../../supabase/functions/_shared/types";
import { JobDetails } from "@/components/jobDetails";
import { ReviewSuggestionPopup } from "../components/reviewSuggestionPopup";

const JOB_BATCH_SIZE = 30;
const ALL_JOB_STATUSES: JobStatus[] = ["new", "applied", "archived"];

/**
 * Component that renders the home page.
 */
export function Home() {
  const { handleError } = useError();

  const navigate = useNavigate();
  const location = useLocation();

  const { links, isLoading: isLoadingLinks } = useLinks();
  const {
    settings,
    updateSettings,
    isLoading: isLoadingSettings,
  } = useSettings();

  // Parse the query parameters to determine the active tab
  const status = (new URLSearchParams(location.search).get("status") ||
    "new") as JobStatus;

  const [listing, setListing] = useState<{
    isLoading: boolean;
    hasMore: boolean;
    jobs: Job[];
    new: number;
    applied: number;
    archived: number;
    nextPageToken?: string;
  }>({
    isLoading: true,
    hasMore: true,
    jobs: [],
    new: 0,
    applied: 0,
    archived: 0,
  });
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isScanningSelectedJob, setIsScanningSelectedJob] = useState(false);

  // Update jobs when location changes
  useEffect(() => {
    const asyncLoad = async () => {
      try {
        setListing((listing) => ({ ...listing, isLoading: true }));
        const result = await listJobs({ status, limit: JOB_BATCH_SIZE });

        setListing({
          ...result,
          isLoading: false,
          hasMore: result.jobs.length === JOB_BATCH_SIZE,
        });
        setSelectedJob(result.jobs[0]);
      } catch (error) {
        handleError({ error, title: "Failed to load jobs" });
      }
    };
    asyncLoad();
  }, [status, location.search]); // using location.search to trigger the effect when the query parameter changes

  // effect used to load a new batch of jobs after updating the status of a job
  // and there are still jobs to load
  useEffect(() => {
    const asyncLoad = async () => {
      try {
        if (
          !listing.isLoading &&
          listing.jobs.length < JOB_BATCH_SIZE / 2 &&
          listing.hasMore &&
          listing.nextPageToken
        ) {
          setListing((l) => ({ ...l, isLoading: true }));
          const result = await listJobs({
            status,
            limit: JOB_BATCH_SIZE,
            after: listing.nextPageToken,
          });
          setListing((l) => ({
            ...result,
            jobs: l.jobs.concat(result.jobs),
            isLoading: false,
            hasMore: !!result.nextPageToken,
          }));
        }
      } catch (error) {
        handleError({ error });
      }
    };

    asyncLoad();
  }, [listing]);

  // Handle tab change
  const onTabChange = (tabValue: string) => {
    navigate(`?status=${tabValue}`);
  };

  // Update cron rule
  const onCronRuleChange = async (cronRule: string | undefined) => {
    try {
      const newSettings = { ...settings, cronRule };
      await updateSettings(newSettings);
    } catch (error) {
      handleError({ error, title: "Failed to update notification frequency" });
    }
  };

  const onUpdateJobStatus = async (jobId: number, newStatus: JobStatus) => {
    try {
      await updateJobStatus({ jobId, status: newStatus });

      setListing((listing) => {
        const oldJob = listing.jobs.find((job) => job.id === jobId);
        const jobs = listing.jobs.filter((job) => job.id !== jobId);

        const tabToDecrement = oldJob?.status as JobStatus;
        const tabToIncrement = newStatus;

        const newCount =
          tabToIncrement === "new"
            ? listing.new + 1
            : tabToDecrement === "new"
            ? listing.new - 1
            : listing.new;
        const appliedCount =
          tabToIncrement === "applied"
            ? listing.applied + 1
            : tabToDecrement === "applied"
            ? listing.applied - 1
            : listing.applied;
        const archivedCount =
          tabToIncrement === "archived"
            ? listing.archived + 1
            : tabToDecrement === "archived"
            ? listing.archived - 1
            : listing.archived;

        return {
          ...listing,
          jobs,
          new: newCount,
          applied: appliedCount,
          archived: archivedCount,
        };
      });
    } catch (error) {
      handleError({ error, title: "Failed to update job status" });
    }
  };

  const onLoadMore = async () => {
    try {
      const result = await listJobs({
        status,
        limit: JOB_BATCH_SIZE,
        after: listing.nextPageToken,
      });

      setListing((listing) => ({
        ...result,
        jobs: [...listing.jobs, ...result.jobs],
        isLoading: false,
        hasMore: result.jobs.length === JOB_BATCH_SIZE,
      }));
    } catch (error) {
      handleError({ error, title: "Failed to load more jobs" });
    }
  };

  /**
   * Select a job and open the job details panel.
   * If the jd is empty, scan the job to get the job description.
   */
  const scanJobAndSelect = async (job: Job) => {
    setSelectedJob(job);

    if (!job.description) {
      try {
        setIsScanningSelectedJob(true);

        const updatedJob = await scanJob(job);
        setSelectedJob(updatedJob);

        // Update the job in the list
        setListing((listing) => {
          const jobs = listing.jobs.map((j) =>
            j.id === updatedJob.id ? updatedJob : j
          );
          return { ...listing, jobs };
        });
      } catch (error) {
        handleError({ error, title: "Failed to scan job" });
      } finally {
        setIsScanningSelectedJob(false);
      }
    }
  };

  if (isLoadingLinks || isLoadingSettings) {
    return (
      <DefaultLayout className="px-6 flex flex-col py-6 md:p-10">
        <CronScheduleSkeleton />

        <div className="h-[68px] bg-card w-full rounded-lg flex flex-row gap-2 p-2 animate-pulse mt-10 mb-6">
          <Skeleton className="px-6 py-4 flex-1" />
          <Skeleton className="px-6 py-4 flex-1" />
        </div>

        <JobsListSkeleton />
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout
      className={`px-6 flex flex-col ${
        links.length === 0
          ? "justify-evenly h-screen pb-14 max-w-[800px] w-full md:px-10 lg:px-20"
          : "pt-6 md:p-10 md:pb-0"
      }`}
    >
      <ReviewSuggestionPopup />
      {links.length === 0 ? (
        <>
          <div className="flex flex-col items-center gap-10">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold">
              Be the: <span className="text-primary">first 2 apply</span>
            </h1>
            <p className="text-muted-foreground text-center">
              Save your tailored job searches from top job platforms, and let us
              do the heavy lifting. We'll monitor your specified job feeds and
              swiftly notify you of new postings, providing you the edge to be
              the first in line.
            </p>
            <Link to="/links">
              <Button>Add new search</Button>
            </Link>
          </div>
          <CronSchedule
            cronRule={settings.cronRule}
            onCronRuleChange={onCronRuleChange}
          />
        </>
      ) : (
        <div className="space-y-10">
          {/* <CronSchedule
            cronRule={settings.cronRule}
            onCronRuleChange={onCronRuleChange}
          /> */}

          <Tabs
            value={status}
            className="w-full flex flex-col gap-5"
            onValueChange={(value) => onTabChange(value)}
          >
            <TabsList className="h-fit p-2">
              <TabsTrigger value="new" className="px-6 py-4 flex-1">
                New Jobs {`(${listing.new})`}
              </TabsTrigger>
              <TabsTrigger value="applied" className="px-6 py-4 flex-1">
                Applied {`(${listing.applied})`}
              </TabsTrigger>
              <TabsTrigger value="archived" className="px-6 py-4 flex-1">
                Archived {`(${listing.archived})`}
              </TabsTrigger>
            </TabsList>

            {ALL_JOB_STATUSES.map((statusItem) => {
              return (
                <TabsContent key={statusItem} value={statusItem}>
                  {listing.isLoading || statusItem !== status ? (
                    <JobsListSkeleton />
                  ) : (
                    <section className="flex">
                      {/* jobs list */}
                      <div
                        id="jobsList"
                        className="w-1/2 lg:w-2/5 h-[calc(100vh-120px)] md:h-[calc(100vh-136px)] overflow-scroll"
                      >
                        <JobsList
                          jobs={listing.jobs}
                          hasMore={listing.hasMore}
                          parentContainerId="jobsList"
                          onApply={(job) => {
                            openExternalUrl(job.externalUrl);
                            // scanJob(job);
                          }}
                          onUpdateJobStatus={onUpdateJobStatus}
                          onLoadMore={onLoadMore}
                          onSelect={(job) => scanJobAndSelect(job)}
                        />
                      </div>

                      {/* JD side panel */}
                      <div className="w-1/2 lg:w-3/5 h-[calc(100vh-120px)] md:h-[calc(100vh-136px)] overflow-scroll border-l-[1px] p-6">
                        {selectedJob && !isScanningSelectedJob && (
                          <JobDetails job={selectedJob}></JobDetails>
                        )}
                        {isScanningSelectedJob && <div>Scanning job...</div>}
                      </div>
                    </section>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      )}
    </DefaultLayout>
  );
}
