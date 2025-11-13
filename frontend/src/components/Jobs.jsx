import React, { useEffect, useState } from "react";
import Navbar from "./shared/Navbar";
import FilterCard from "./FilterCard";
import Job from "./Job";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";

const Jobs = () => {
  const { allJobs, searchedQuery, searchJobByText } = useSelector(
  (store) => store.job
);

  const [filterJobs, setFilterJobs] = useState(allJobs);

  // useEffect(() => {
  //   if (searchedQuery) {
  //     const filteredJobs = allJobs.filter((job) => {
  //       return (
  //         job.title.toLowerCase().includes(searchedQuery.toLowerCase()) ||
  //         job.description.toLowerCase().includes(searchedQuery.toLowerCase()) ||
  //         job.location.toLowerCase().includes(searchedQuery.toLowerCase())
  //       );
  //     });
  //     setFilterJobs(filteredJobs);
  //   } else {
  //     setFilterJobs(allJobs);
  //   }
  // }, [allJobs, searchedQuery]);

  useEffect(() => {
  let filtered = [...allJobs];

  // 1) Text search (if you are using a search bar)
  if (searchJobByText) {
    const query = searchJobByText.toLowerCase();

    filtered = filtered.filter((job) => {
      const title = job.title?.toLowerCase() || "";
      const desc = job.description?.toLowerCase() || "";
      const loc = job.location?.toLowerCase() || "";

      return (
        title.includes(query) ||
        desc.includes(query) ||
        loc.includes(query)
      );
    });
  }

  // 2) FilterCard filters (object: { location, industry, salary })
  if (searchedQuery && typeof searchedQuery === "object") {
    const { location, industry, salary } = searchedQuery;

    filtered = filtered.filter((job) => {
      const matchLocation =
        !location ||
        job.location?.toLowerCase() === location.toLowerCase();

      const matchIndustry =
        !industry ||
        job.title?.toLowerCase().includes(industry.toLowerCase());

      // Very simple salary match (string-based).
      // You can change this once you know your salary format.
      const matchSalary =
        !salary ||
        job.salary
          ?.toString()
          .toLowerCase()
          .includes(salary.toLowerCase());

      return matchLocation && matchIndustry && matchSalary;
    });
  }

  setFilterJobs(filtered);
}, [allJobs, searchedQuery, searchJobByText]);


  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />
      <div className="bg-slate-100">
        <div className="bg-slate-100 max-w-7xl mx-auto my-2">
          <div className="flex gap-5">
            <div className="w-20%">
              <FilterCard />
            </div>
            {filterJobs.length <= 0 ? (
              <span>Job not found</span>
            ) : (
              <div className="flex-1 h-[88vh] overflow-y-auto pb-5">
                <div className="grid grid-cols-3 gap-4">
                  {filterJobs.map((job) => (
                    <motion.div
                      initial={{ opacity: 0, x: 100 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ duration: 0.3 }}
                      key={job?._id}
                    >
                      <Job job={job} />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Jobs;
